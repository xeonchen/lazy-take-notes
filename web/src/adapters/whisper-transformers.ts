/**
 * L3 Adapter — Whisper transcriber using @huggingface/transformers.
 * Supports WebGPU (preferred) and WASM (fallback).
 */

import type { TranscriptSegment } from '../entities/types';
import type { Transcriber } from '../use-cases/ports';
import { type WhisperModelName } from '../entities/config';

// Model metadata: short name → HuggingFace repo + optional dtype override.
// Models converted via scripts/convert-whisper-onnx.sh produce files with base
// names (e.g. encoder_model.onnx) — no _quantized suffix.  Transformers.js q8
// dtype expects the _quantized suffix, so these models must force fp32 dtype to
// load the base-named files correctly.
interface ModelEntry {
  repo: string;
  /** When set, overrides the device-based dtype for all backends. */
  dtype?: 'fp32' | 'q8';
}

// Typed against WhisperModelName so TS errors if AVAILABLE_WHISPER_MODELS changes.
const MODEL_MAP: Record<WhisperModelName, ModelEntry> = {
  'whisper-tiny': { repo: 'onnx-community/whisper-tiny' },
  'whisper-base': { repo: 'onnx-community/whisper-base' },
  'whisper-small': { repo: 'onnx-community/whisper-small' },
  'whisper-medium': { repo: 'onnx-community/whisper-medium' },
  'whisper-large-v3-turbo': { repo: 'onnx-community/whisper-large-v3-turbo' },
  'breeze-asr-25': { repo: 'xeonchen/Breeze-ASR-25-ONNX', dtype: 'fp32' },
};

type Pipeline = {
  (audio: Float32Array, options: {
    language?: string;
    return_timestamps?: boolean;
    chunk_length_s?: number;
    stride_length_s?: number;
  }): Promise<{
    text: string;
    chunks?: Array<{
      text: string;
      timestamp: [number, number | null];
    }>;
  }>;
};

/** HF progress event shape (subset we use). */
export type HFProgressEvent = {
  status: string;
  file?: string;
  loaded?: number;
  total?: number;
};

/**
 * Aggregate per-file HF progress events into a single overall percentage.
 * HF transformers reports progress per file (tokenizer, config, weights…),
 * each going 0→100 independently — without aggregation the bar jumps back.
 */
export function createAggregatedProgressCallback(
  onProgress: (percent: number) => void,
): (data: HFProgressEvent) => void {
  const fileProgress = new Map<string, { loaded: number; total: number }>();
  return (data: HFProgressEvent) => {
    if (data.status === 'progress' && data.file && data.loaded !== undefined && data.total) {
      fileProgress.set(data.file, { loaded: data.loaded, total: data.total });
      let totalBytes = 0;
      let loadedBytes = 0;
      for (const f of fileProgress.values()) {
        totalBytes += f.total;
        loadedBytes += f.loaded;
      }
      onProgress(totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0);
    }
  };
}

export class WhisperTransformersTranscriber implements Transcriber {
  private pipeline: Pipeline | null = null;
  private ready = false;
  private modelId = '';

  async loadModel(
    modelName: string,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    // Dynamic import to allow code splitting
    const { pipeline, env } = await import('@huggingface/transformers');

    // Prefer WebGPU, fall back to WASM
    let device: 'webgpu' | 'wasm' = 'wasm';
    try {
      if ('gpu' in navigator) {
        const adapter = await (navigator as Navigator & { gpu: { requestAdapter(): Promise<unknown | null> } }).gpu.requestAdapter();
        if (adapter) device = 'webgpu';
      }
    } catch {
      // WebGPU not available
    }

    // Resolve model ID and per-model dtype override
    const entry = modelName in MODEL_MAP
      ? MODEL_MAP[modelName as WhisperModelName]
      : undefined;
    this.modelId = entry?.repo ?? modelName;
    const dtype = entry?.dtype ?? (device === 'webgpu' ? 'fp32' : 'q8');

    // Allow remote models and disable local model check
    env.allowRemoteModels = true;
    env.allowLocalModels = false;

    const progressCallback = onProgress
      ? createAggregatedProgressCallback(onProgress)
      : undefined;

    console.info(`[whisper] Loading model=${this.modelId} device=${device} dtype=${dtype}`);

    this.pipeline = (await pipeline(
      'automatic-speech-recognition',
      this.modelId,
      {
        device,
        dtype,
        progress_callback: progressCallback,
      },
    )) as unknown as Pipeline;

    console.info(`[whisper] Model loaded successfully: ${this.modelId}`);
    this.ready = true;
  }

  async transcribe(
    audio: Float32Array,
    language: string,
    _hints?: string[],
  ): Promise<TranscriptSegment[]> {
    if (!this.pipeline) {
      throw new Error('Whisper model not loaded. Call loadModel() first.');
    }

    console.info(`[whisper] Transcribing ${audio.length} samples, language=${language}`);

    const result = await this.pipeline(audio, {
      language: language || 'en',
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    const now = Date.now() / 1000;

    if (result.chunks && result.chunks.length > 0) {
      const segments = result.chunks
        .filter((c) => c.text.trim())
        .map((c) => ({
          text: c.text.trim(),
          wallStart: now + (c.timestamp[0] ?? 0),
          wallEnd: now + (c.timestamp[1] ?? c.timestamp[0] ?? 0),
        }));
      console.info(`[whisper] Transcription done: ${segments.length} segments from ${result.chunks.length} chunks`);
      return segments;
    }

    // Fallback: single segment
    if (result.text.trim()) {
      console.info(`[whisper] Transcription done: single segment fallback`);
      return [{ text: result.text.trim(), wallStart: now, wallEnd: now }];
    }

    console.warn(`[whisper] Transcription returned empty result for ${audio.length} samples`);
    return [];
  }

  isReady(): boolean {
    return this.ready;
  }

  close(): void {
    this.pipeline = null;
    this.ready = false;
  }
}

/**
 * L3 Adapter — Whisper transcriber using @huggingface/transformers.
 * Supports WebGPU (preferred) and WASM (fallback).
 */

import type { TranscriptSegment } from '../entities/types';
import type { Transcriber } from '../use-cases/ports';
import { type WhisperModelName } from '../entities/config';

// Model ID mapping: short name → HuggingFace model ID
// Typed against WhisperModelName so TS errors if AVAILABLE_WHISPER_MODELS changes.
const MODEL_MAP: Record<WhisperModelName, string> = {
  'whisper-tiny': 'onnx-community/whisper-tiny',
  'whisper-base': 'onnx-community/whisper-base',
  'whisper-small': 'onnx-community/whisper-small',
  'whisper-medium': 'onnx-community/whisper-medium',
  'whisper-large-v3-turbo': 'onnx-community/whisper-large-v3-turbo',
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

    // Resolve model ID
    this.modelId = (modelName in MODEL_MAP ? MODEL_MAP[modelName as WhisperModelName] : modelName);

    // Allow remote models and disable local model check
    env.allowRemoteModels = true;
    env.allowLocalModels = false;

    const progressCallback = onProgress
      ? (data: { status: string; progress?: number }) => {
          if (data.status === 'progress' && data.progress !== undefined) {
            onProgress(Math.round(data.progress));
          }
        }
      : undefined;

    this.pipeline = (await pipeline(
      'automatic-speech-recognition',
      this.modelId,
      {
        device,
        dtype: device === 'webgpu' ? 'fp32' : 'q8',
        progress_callback: progressCallback,
      },
    )) as unknown as Pipeline;

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

    const result = await this.pipeline(audio, {
      language: language || 'en',
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    const now = Date.now() / 1000;

    if (result.chunks && result.chunks.length > 0) {
      return result.chunks
        .filter((c) => c.text.trim())
        .map((c) => ({
          text: c.text.trim(),
          wallStart: now + (c.timestamp[0] ?? 0),
          wallEnd: now + (c.timestamp[1] ?? c.timestamp[0] ?? 0),
        }));
    }

    // Fallback: single segment
    if (result.text.trim()) {
      return [{ text: result.text.trim(), wallStart: now, wallEnd: now }];
    }

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

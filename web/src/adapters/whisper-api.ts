/**
 * L3 Adapter — OpenAI Whisper API transcriber (cloud fallback).
 */

import type { TranscriptSegment } from '../entities/types';
import type { Transcriber } from '../use-cases/ports';

export class WhisperApiTranscriber implements Transcriber {
  private ready = false;

  constructor(
    private apiKey: string,
    private baseUrl: string = 'https://api.openai.com/v1',
  ) {}

  async loadModel(_modelId: string, onProgress?: (progress: number) => void): Promise<void> {
    // No model to download for cloud API
    onProgress?.(100);
    this.ready = true;
  }

  async transcribe(
    audio: Float32Array,
    language: string,
    _hints?: string[],
  ): Promise<TranscriptSegment[]> {
    // Convert Float32Array to WAV blob
    const wavBlob = float32ToWav(audio, 16000);

    const formData = new FormData();
    formData.append('file', wavBlob, 'audio.wav');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');
    if (language) formData.append('language', language);

    const resp = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: formData,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText);
      throw new Error(`Whisper API error (${resp.status}): ${text}`);
    }

    const data = await resp.json() as {
      text: string;
      segments?: Array<{ text: string; start: number; end: number }>;
    };

    const now = Date.now() / 1000;

    if (data.segments && data.segments.length > 0) {
      return data.segments
        .filter((s) => s.text.trim())
        .map((s) => ({
          text: s.text.trim(),
          wallStart: now + s.start,
          wallEnd: now + s.end,
        }));
    }

    if (data.text.trim()) {
      return [{ text: data.text.trim(), wallStart: now, wallEnd: now }];
    }

    return [];
  }

  isReady(): boolean {
    return this.ready;
  }

  close(): void {
    this.ready = false;
  }
}

/** Convert Float32Array PCM to WAV Blob. */
function float32ToWav(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const dataLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // PCM data (float32 → int16)
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

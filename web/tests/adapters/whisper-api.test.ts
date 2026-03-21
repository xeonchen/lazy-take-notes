import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WhisperApiTranscriber } from '../../src/adapters/whisper-api';

describe('WhisperApiTranscriber', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('loadModel marks ready immediately', async () => {
    const t = new WhisperApiTranscriber('sk-test');
    expect(t.isReady()).toBe(false);

    const onProgress = vi.fn();
    await t.loadModel('whisper-1', onProgress);

    expect(t.isReady()).toBe(true);
    expect(onProgress).toHaveBeenCalledWith(100);
  });

  it('transcribe sends audio as WAV and returns segments', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        text: 'Hello world',
        segments: [
          { text: 'Hello', start: 0, end: 0.5 },
          { text: 'world', start: 0.5, end: 1.0 },
        ],
      }),
    });

    const t = new WhisperApiTranscriber('sk-test');
    await t.loadModel('whisper-1');

    const audio = new Float32Array([0.1, -0.2, 0.3]);
    const segments = await t.transcribe(audio, 'en');

    expect(segments).toHaveLength(2);
    expect(segments[0]!.text).toBe('Hello');
    expect(segments[1]!.text).toBe('world');

    // Verify FormData was sent
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toContain('/audio/transcriptions');
  });

  it('transcribe returns single segment when no segments in response', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'Just text' }),
    });

    const t = new WhisperApiTranscriber('sk-test');
    await t.loadModel('whisper-1');

    const segments = await t.transcribe(new Float32Array([0.1]), 'en');
    expect(segments).toHaveLength(1);
    expect(segments[0]!.text).toBe('Just text');
  });

  it('transcribe returns empty array for empty text', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ text: '   ' }),
    });

    const t = new WhisperApiTranscriber('sk-test');
    await t.loadModel('whisper-1');

    const segments = await t.transcribe(new Float32Array([0.1]), 'en');
    expect(segments).toHaveLength(0);
  });

  it('transcribe throws on API error', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
      statusText: 'Internal Server Error',
    });

    const t = new WhisperApiTranscriber('sk-test');
    await t.loadModel('whisper-1');

    await expect(t.transcribe(new Float32Array([0.1]), 'en')).rejects.toThrow(
      'Whisper API error (500)',
    );
  });

  it('close marks not ready', () => {
    const t = new WhisperApiTranscriber('sk-test');
    t.close();
    expect(t.isReady()).toBe(false);
  });
});

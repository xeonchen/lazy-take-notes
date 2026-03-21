import { useCallback, useRef, useState } from 'react';
import type { TranscriptSegment } from '../../entities/types';
import type { Transcriber } from '../../use-cases/ports';

interface TranscriptionState {
  isReady: boolean;
  isTranscribing: boolean;
  downloadProgress: number | null;
  error: string | null;
}

export function useTranscription(
  transcriber: Transcriber | null,
  language: string,
  hints: string[],
) {
  const [state, setState] = useState<TranscriptionState>({
    isReady: false,
    isTranscribing: false,
    downloadProgress: null,
    error: null,
  });

  // Buffer for accumulating audio before transcription
  const bufferRef = useRef<Float32Array[]>([]);
  const bufferLengthRef = useRef(0);
  const chunkDuration = 25; // seconds
  const sampleRate = 16000;
  const targetSamples = chunkDuration * sampleRate;

  // Refs for stable access in callbacks (avoids stale closures)
  const isReadyRef = useRef(false);
  const transcribingRef = useRef(false); // re-entrancy guard
  const languageRef = useRef(language);
  languageRef.current = language;
  const hintsRef = useRef(hints);
  hintsRef.current = hints;

  const loadModel = useCallback(
    async (modelId: string) => {
      if (!transcriber) return;
      setState((s) => ({ ...s, downloadProgress: 0, error: null }));
      try {
        await transcriber.loadModel(modelId, (progress) => {
          setState((s) => ({ ...s, downloadProgress: progress }));
        });
        isReadyRef.current = true;
        setState({ isReady: true, isTranscribing: false, downloadProgress: null, error: null });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        isReadyRef.current = false;
        setState({ isReady: false, isTranscribing: false, downloadProgress: null, error });
      }
    },
    [transcriber],
  );

  const transcribeBuffer = useCallback(
    async (): Promise<TranscriptSegment[]> => {
      if (!transcriber || !isReadyRef.current || bufferLengthRef.current === 0) return [];
      if (transcribingRef.current) return []; // prevent re-entrant calls

      // Merge buffer — clear refs synchronously before async work
      const merged = new Float32Array(bufferLengthRef.current);
      let offset = 0;
      for (const chunk of bufferRef.current) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      bufferRef.current = [];
      bufferLengthRef.current = 0;

      transcribingRef.current = true;
      setState((s) => ({ ...s, isTranscribing: true }));
      try {
        const segments = await transcriber.transcribe(merged, languageRef.current, hintsRef.current);
        return segments;
      } catch (e) {
        console.error('Transcription error:', e);
        return [];
      } finally {
        transcribingRef.current = false;
        setState((s) => ({ ...s, isTranscribing: false }));
      }
    },
    [transcriber],
  );

  /** Feed audio data and trigger transcription when buffer is full. */
  const feedAudio = useCallback(
    (chunk: Float32Array): Promise<TranscriptSegment[]> | null => {
      bufferRef.current.push(chunk);
      bufferLengthRef.current += chunk.length;

      if (bufferLengthRef.current >= targetSamples) {
        return transcribeBuffer();
      }
      return null;
    },
    [transcribeBuffer, targetSamples],
  );

  /** Force-transcribe whatever is in the buffer. */
  const flush = useCallback(() => {
    if (bufferLengthRef.current > 0) {
      return transcribeBuffer();
    }
    return Promise.resolve([]);
  }, [transcribeBuffer]);

  return {
    ...state,
    loadModel,
    feedAudio,
    flush,
  };
}

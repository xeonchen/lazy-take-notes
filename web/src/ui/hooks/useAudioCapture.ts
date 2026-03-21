import { useCallback, useRef, useState } from 'react';
import { WebAudioSource } from '../../adapters/web-audio';

const SAMPLE_RATE = 16000;

interface AudioCaptureState {
  isCapturing: boolean;
  isPaused: boolean;
  error: string | null;
}

interface AudioCaptureActions {
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

export function useAudioCapture(
  onData: (chunk: Float32Array) => void,
  onLevel: (rms: number) => void,
): [AudioCaptureState, AudioCaptureActions] {
  const [state, setState] = useState<AudioCaptureState>({
    isCapturing: false,
    isPaused: false,
    error: null,
  });
  const sourceRef = useRef<WebAudioSource | null>(null);

  // Ref pattern: always call the latest callback, not the one captured at start()
  const onDataRef = useRef(onData);
  onDataRef.current = onData;
  const onLevelRef = useRef(onLevel);
  onLevelRef.current = onLevel;

  const start = useCallback(async () => {
    try {
      const source = new WebAudioSource();
      source.onData((chunk) => onDataRef.current(chunk));
      source.onLevel((rms) => onLevelRef.current(rms));
      await source.open(SAMPLE_RATE);
      sourceRef.current = source;
      setState({ isCapturing: true, isPaused: false, error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      let error = msg;
      if (msg.includes('NotAllowed') || msg.includes('Permission')) {
        error = 'Microphone access denied. Please allow microphone access in your browser settings.';
      } else if (msg.includes('NotFound')) {
        error = 'No microphone found. Please connect a microphone and try again.';
      }
      setState({ isCapturing: false, isPaused: false, error });
    }
  }, []);

  const pause = useCallback(() => {
    sourceRef.current?.pause();
    setState((s) => ({ ...s, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    sourceRef.current?.resume();
    setState((s) => ({ ...s, isPaused: false }));
  }, []);

  const stop = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setState({ isCapturing: false, isPaused: false, error: null });
  }, []);

  return [state, { start, pause, resume, stop }];
}

/**
 * L3 Adapter — Browser audio capture via getUserMedia + AudioWorklet.
 * Implements the AudioSource port.
 */

import type { AudioSource } from '../use-cases/ports';

const WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._bufferSize = 0;
    // Accumulate ~0.5s of audio before posting (at 16kHz = 8000 samples)
    this._targetSize = 8000;
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];

    // Calculate RMS for level meter
    let sum = 0;
    for (let i = 0; i < channel.length; i++) {
      sum += channel[i] * channel[i];
    }
    const rms = Math.sqrt(sum / channel.length);
    this.port.postMessage({ type: 'level', rms });

    // Accumulate samples
    this._buffer.push(new Float32Array(channel));
    this._bufferSize += channel.length;

    if (this._bufferSize >= this._targetSize) {
      // Merge and send
      const merged = new Float32Array(this._bufferSize);
      let offset = 0;
      for (const chunk of this._buffer) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      this.port.postMessage({ type: 'audio', data: merged }, [merged.buffer]);
      this._buffer = [];
      this._bufferSize = 0;
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;

export class WebAudioSource implements AudioSource {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private dataCallback: ((chunk: Float32Array) => void) | null = null;
  private levelCallback: ((rms: number) => void) | null = null;
  private active = false;
  private paused = false;

  async open(sampleRate: number): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: { ideal: sampleRate },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.audioContext = new AudioContext({ sampleRate });

    // Register worklet processor inline via Blob URL
    const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    await this.audioContext.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');

    this.workletNode.port.onmessage = (e: MessageEvent) => {
      if (this.paused) return;
      const msg = e.data as { type: string; data?: Float32Array; rms?: number };
      if (msg.type === 'audio' && msg.data && this.dataCallback) {
        this.dataCallback(msg.data);
      } else if (msg.type === 'level' && msg.rms !== undefined && this.levelCallback) {
        this.levelCallback(msg.rms);
      }
    };

    this.sourceNode.connect(this.workletNode);
    this.workletNode.connect(this.audioContext.destination);
    this.active = true;
  }

  onData(callback: (chunk: Float32Array) => void): void {
    this.dataCallback = callback;
  }

  onLevel(callback: (rms: number) => void): void {
    this.levelCallback = callback;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  close(): void {
    this.active = false;
    this.paused = false;
    this.workletNode?.disconnect();
    this.sourceNode?.disconnect();
    this.audioContext?.close();
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.workletNode = null;
    this.sourceNode = null;
    this.audioContext = null;
    this.mediaStream = null;
  }

  /** Returns true when actively capturing audio (open and not paused). */
  isActive(): boolean {
    return this.active && !this.paused;
  }

  /** Returns true when the audio stream is open (even if paused). Use for cleanup decisions. */
  isOpen(): boolean {
    return this.active;
  }
}

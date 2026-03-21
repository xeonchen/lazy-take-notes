/**
 * L2 Ports — Abstract interfaces for adapters.
 * No concrete implementations, no framework dependencies.
 */

import type { ChatMessage, ChatResponse, TranscriptSegment } from '../entities/types';

/** Abstract LLM client. */
export interface LLMClient {
  chat(model: string, messages: ChatMessage[]): Promise<ChatResponse>;
  chatSingle(model: string, prompt: string): Promise<string>;
  checkConnectivity(): Promise<{ ok: boolean; error: string }>;
}

/** Abstract speech-to-text transcription engine. */
export interface Transcriber {
  loadModel(modelId: string, onProgress?: (progress: number) => void): Promise<void>;
  transcribe(audio: Float32Array, language: string, hints?: string[]): Promise<TranscriptSegment[]>;
  isReady(): boolean;
  close(): void;
}

/** Abstract audio capture source. */
export interface AudioSource {
  open(sampleRate: number): Promise<void>;
  onData(callback: (chunk: Float32Array) => void): void;
  onLevel(callback: (rms: number) => void): void;
  pause(): void;
  resume(): void;
  close(): void;
  isActive(): boolean;
}

/** Abstract persistence gateway for sessions. */
export interface PersistenceGateway {
  saveSession(session: SessionData): Promise<void>;
  loadSession(id: string): Promise<SessionData | null>;
  listSessions(): Promise<SessionSummary[]>;
  deleteSession(id: string): Promise<void>;
  saveConfig(config: unknown): Promise<void>;
  loadConfig<T>(): Promise<T | null>;
}

export interface SessionData {
  id: string;
  label: string;
  templateKey: string;
  createdAt: number;
  updatedAt: number;
  segments: TranscriptSegment[];
  digestMarkdown: string;
  digestHistory: Array<{ markdown: string; number: number; isFinal: boolean }>;
  context: string;
}

export interface SessionSummary {
  id: string;
  label: string;
  templateKey: string;
  createdAt: number;
  updatedAt: number;
  segmentCount: number;
  hasDigest: boolean;
}

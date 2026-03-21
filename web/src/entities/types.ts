/**
 * L1 Entities — Pure types with zero external dependencies.
 * Mirrors Python l1_entities.
 */

/** A single message in an LLM conversation. */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Response from an LLM chat call. */
export interface ChatResponse {
  content: string;
  promptTokens: number;
}

/** A transcribed speech segment with wall-clock timestamps. */
export interface TranscriptSegment {
  text: string;
  wallStart: number; // epoch seconds
  wallEnd: number;
}

/** Audio capture mode. */
export type AudioMode = 'mic_only' | 'system_only' | 'mix';

/** Result of a digest cycle. */
export interface DigestResult {
  data: string | null;
  error: string;
}

export function digestOk(r: DigestResult): boolean {
  return r.data !== null;
}

/** Format seconds to HH:MM:SS. */
export function formatElapsed(seconds: number): string {
  seconds = Math.max(0, seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Format wall time to [HH:MM:SS]. */
export function formatWallTime(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `[${h}:${m}:${s}]`;
}

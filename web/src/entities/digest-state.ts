/**
 * L1 Entity — Mutable state for the rolling digest pipeline.
 * Mirrors Python l1_entities.digest_state.DigestState.
 */

import type { ChatMessage } from './types';

export class DigestState {
  messages: ChatMessage[] = [];
  buffer: string[] = [];
  allLines: string[] = [];
  digestCount = 0;
  consecutiveFailures = 0;
  lastDigestTime: number = performance.now() / 1000;
  startTime: number = performance.now() / 1000;
  promptTokens = 0;

  /** Initialize conversation with system prompt. */
  initMessages(systemPrompt: string): void {
    this.messages = [{ role: 'system', content: systemPrompt }];
  }
}

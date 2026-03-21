/**
 * L2 Use Case — Run a digest cycle via the LLM client.
 * Mirrors Python l2_use_cases.digest_use_case.
 */

import { DigestState } from '../entities/digest-state';
import type { SessionTemplate } from '../entities/template';
import type { DigestResult } from '../entities/types';
import type { LLMClient } from './ports';
import { buildDigestPrompt } from './prompt-builder';

export class RunDigestUseCase {
  constructor(private llmClient: LLMClient) {}

  async execute(
    state: DigestState,
    model: string,
    template: SessionTemplate,
    options: {
      isFinal?: boolean;
      fullTranscript?: string;
      userContext?: string;
    } = {},
  ): Promise<DigestResult> {
    const { isFinal = false, fullTranscript = '', userContext = '' } = options;

    const prompt = buildDigestPrompt(template, state.buffer, {
      isFinal,
      fullTranscript,
      userContext,
    });

    state.messages.push({ role: 'user', content: prompt });

    try {
      const resp = await this.llmClient.chat(model, state.messages);
      const raw = resp.content;

      if (!raw.trim()) {
        state.consecutiveFailures++;
        state.messages.pop();
        return { data: null, error: 'Empty response from LLM' };
      }

      // Success
      state.messages.push({ role: 'assistant', content: raw });
      state.consecutiveFailures = 0;
      state.digestCount++;
      state.promptTokens = resp.promptTokens;
      state.buffer = [];
      state.lastDigestTime = performance.now() / 1000;

      return { data: raw.trim(), error: '' };
    } catch (e) {
      state.consecutiveFailures++;
      state.messages.pop();
      const err = e instanceof Error ? e.message : String(e);
      return { data: null, error: `LLM error: ${err}` };
    }
  }
}

/**
 * Check if a digest cycle should trigger based on buffer size and elapsed time.
 * Mirrors Python should_trigger_digest().
 */
export function shouldTriggerDigest(
  state: DigestState,
  minLines: number,
  minInterval: number,
  maxLines: number | null = null,
): boolean {
  const bufSize = state.buffer.length;
  if (bufSize < minLines) return false;

  const cap = maxLines ?? minLines * 2;
  if (bufSize >= cap) return true;

  const elapsed = performance.now() / 1000 - state.lastDigestTime;
  return elapsed >= minInterval;
}

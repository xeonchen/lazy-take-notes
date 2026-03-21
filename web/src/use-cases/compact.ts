/**
 * L2 Use Case — Compact conversation history to stay within token budget.
 * Mirrors Python l2_use_cases.compact_messages_use_case.
 */

import { DigestState } from '../entities/digest-state';
import { buildCompactUserMessage } from './prompt-builder';

export class CompactMessagesUseCase {
  execute(state: DigestState, latestMarkdown: string, systemPrompt: string): void {
    state.messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildCompactUserMessage(latestMarkdown) },
      { role: 'assistant', content: latestMarkdown },
    ];
    state.promptTokens = 0;
  }
}

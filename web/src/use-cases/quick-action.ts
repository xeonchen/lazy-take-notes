/**
 * L2 Use Case — Execute a quick action by key.
 * Mirrors Python l2_use_cases.quick_action_use_case.
 */

import type { QuickAction, SessionTemplate } from '../entities/template';
import type { TranscriptSegment } from '../entities/types';
import type { LLMClient } from './ports';
import { buildQuickActionPrompt } from './prompt-builder';

export class RunQuickActionUseCase {
  constructor(private llmClient: LLMClient) {}

  async execute(
    key: string,
    template: SessionTemplate,
    model: string,
    latestDigest: string | null,
    allSegments: TranscriptSegment[],
    options: { userContext?: string } = {},
  ): Promise<{ result: string; label: string } | null> {
    const { userContext = '' } = options;
    const qa = this.findAction(key, template);
    if (!qa) return null;

    const recent = allSegments.slice(-50);
    const recentTranscript = recent.map((s) => s.text).join('\n');

    const prompt = buildQuickActionPrompt(
      qa.promptTemplate,
      latestDigest || '(no digest yet)',
      recentTranscript,
      { userContext },
    );

    const result = await this.llmClient.chatSingle(model, prompt);
    return { result, label: qa.label };
  }

  private findAction(key: string, template: SessionTemplate): QuickAction | null {
    const idx = parseInt(key, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= template.quickActions.length) return null;
    return template.quickActions[idx]!;
  }
}

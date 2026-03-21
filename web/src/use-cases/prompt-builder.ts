/**
 * L2 Use Case Utility — Pure functions for building LLM prompts.
 * Mirrors Python l2_use_cases.utils.prompt_builder.
 */

import type { SessionTemplate } from '../entities/template';

/** Build the user prompt for a digest cycle. */
export function buildDigestPrompt(
  template: SessionTemplate,
  buffer: string[],
  options: {
    isFinal?: boolean;
    fullTranscript?: string;
    userContext?: string;
  } = {},
): string {
  const { isFinal = false, fullTranscript = '', userContext = '' } = options;
  const newLines = buffer.join('\n');
  const contextSection = userContext.trim()
    ? `User corrections and additions:\n${userContext.trim()}`
    : '';

  if (isFinal) {
    return template.finalUserTemplate
      .replace('{line_count}', String(buffer.length))
      .replace('{new_lines}', newLines)
      .replace('{user_context}', contextSection)
      .replace('{full_transcript}', fullTranscript || '(no full transcript)');
  }

  return template.digestUserTemplate
    .replace('{line_count}', String(buffer.length))
    .replace('{new_lines}', newLines)
    .replace('{user_context}', contextSection);
}

/** Build the user prompt for a quick action. */
export function buildQuickActionPrompt(
  promptTemplate: string,
  digestMarkdown: string,
  recentTranscript: string,
  options: { userContext?: string } = {},
): string {
  const { userContext = '' } = options;
  let result = promptTemplate
    .replace('{digest_markdown}', digestMarkdown || '(no digest yet)')
    .replace('{recent_transcript}', recentTranscript || '(no transcript yet)');

  if (userContext.trim()) {
    result += `\n\nUser corrections and context:\n${userContext.trim()}`;
  }
  return result;
}

/** Build the synthetic user message for conversation compaction. */
export function buildCompactUserMessage(latestMarkdown: string): string {
  return (
    '(Prior conversation compacted) Current session state:\n\n' +
    `${latestMarkdown}\n\n` +
    'Continue analyzing subsequent transcript segments based on this state.'
  );
}

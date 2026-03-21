import { describe, it, expect } from 'vitest';
import { buildDigestPrompt, buildQuickActionPrompt, buildCompactUserMessage } from '../../src/use-cases/prompt-builder';
import type { SessionTemplate } from '../../src/entities/template';

const mockTemplate: SessionTemplate = {
  metadata: { name: 'Test', description: '', locale: 'en', key: 'test' },
  systemPrompt: 'System prompt',
  digestUserTemplate: 'New transcript ({line_count} lines):\n{new_lines}\n{user_context}',
  finalUserTemplate: 'Final ({line_count} lines):\n{new_lines}\n{user_context}\nFull:\n{full_transcript}',
  recognitionHints: [],
  quickActions: [],
};

describe('buildDigestPrompt', () => {
  it('builds regular digest prompt', () => {
    const result = buildDigestPrompt(mockTemplate, ['hello', 'world']);
    expect(result).toContain('New transcript (2 lines)');
    expect(result).toContain('hello\nworld');
  });

  it('builds final digest prompt', () => {
    const result = buildDigestPrompt(mockTemplate, ['hello'], {
      isFinal: true,
      fullTranscript: 'full text',
    });
    expect(result).toContain('Final (1 lines)');
    expect(result).toContain('full text');
  });

  it('includes user context when provided', () => {
    const result = buildDigestPrompt(mockTemplate, ['hello'], {
      userContext: 'my corrections',
    });
    expect(result).toContain('my corrections');
  });
});

describe('buildQuickActionPrompt', () => {
  it('builds prompt with digest and transcript', () => {
    const result = buildQuickActionPrompt(
      'Digest: {digest_markdown}\nRecent: {recent_transcript}',
      'some digest',
      'some transcript',
    );
    expect(result).toContain('some digest');
    expect(result).toContain('some transcript');
  });

  it('handles missing digest', () => {
    const result = buildQuickActionPrompt('{digest_markdown}', '', '');
    expect(result).toContain('(no digest yet)');
  });
});

describe('buildCompactUserMessage', () => {
  it('builds compaction message', () => {
    const result = buildCompactUserMessage('# My Notes');
    expect(result).toContain('Prior conversation compacted');
    expect(result).toContain('# My Notes');
  });
});

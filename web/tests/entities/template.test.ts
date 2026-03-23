import { describe, it, expect } from 'vitest';
import { validateTemplate, extractFormatVars } from '../../src/entities/template';
import type { SessionTemplate } from '../../src/entities/template';

function makeTemplate(overrides: Partial<SessionTemplate> = {}): SessionTemplate {
  return {
    metadata: { key: 'test', name: 'Test', description: '', locale: 'en' },
    systemPrompt: 'You are a helpful assistant.',
    digestUserTemplate: 'New transcript ({line_count} lines):\n{new_lines}\n{user_context}',
    finalUserTemplate: '{line_count} {new_lines} {user_context} {full_transcript}',
    recognitionHints: [],
    quickActions: [],
    ...overrides,
  };
}

describe('extractFormatVars', () => {
  it('extracts simple variables', () => {
    expect(extractFormatVars('{line_count} and {new_lines}')).toEqual(
      new Set(['line_count', 'new_lines']),
    );
  });

  it('ignores escaped braces', () => {
    expect(extractFormatVars('{{not_a_var}}')).toEqual(new Set());
  });

  it('returns empty set for no variables', () => {
    expect(extractFormatVars('just plain text')).toEqual(new Set());
  });
});

describe('validateTemplate', () => {
  it('returns empty array for valid template', () => {
    expect(validateTemplate(makeTemplate())).toEqual([]);
  });

  it('rejects missing name', () => {
    const errors = validateTemplate(makeTemplate({ metadata: { key: 'x', name: '', description: '', locale: 'en' } }));
    expect(errors).toContain('Template name is required');
  });

  it('rejects empty system prompt', () => {
    const errors = validateTemplate(makeTemplate({ systemPrompt: '' }));
    expect(errors).toContain('system_prompt is required');
  });

  it('rejects empty digest user template', () => {
    const errors = validateTemplate(makeTemplate({ digestUserTemplate: '' }));
    expect(errors).toContain('digest_user_template is required');
  });

  it('rejects too many quick actions', () => {
    const qa = Array.from({ length: 6 }, (_, i) => ({
      label: `Action ${i}`,
      description: '',
      promptTemplate: '{digest_markdown}',
    }));
    const errors = validateTemplate(makeTemplate({ quickActions: qa }));
    expect(errors.some((e) => e.includes('At most 5'))).toBe(true);
  });

  it('catches unknown variable in digest template', () => {
    const errors = validateTemplate(makeTemplate({
      digestUserTemplate: '{line_count} {unknown_var}',
    }));
    expect(errors.some((e) => e.includes('unknown variable {unknown_var}'))).toBe(true);
  });

  it('catches unknown variable in final template', () => {
    const errors = validateTemplate(makeTemplate({
      finalUserTemplate: '{line_count} {bad_var}',
    }));
    expect(errors.some((e) => e.includes('unknown variable {bad_var}'))).toBe(true);
  });

  it('allows valid variables in final template', () => {
    const errors = validateTemplate(makeTemplate({
      finalUserTemplate: '{line_count} {new_lines} {user_context} {full_transcript}',
    }));
    expect(errors).toEqual([]);
  });

  it('catches unknown variable in quick action prompt', () => {
    const errors = validateTemplate(makeTemplate({
      quickActions: [{
        label: 'Test',
        description: '',
        promptTemplate: '{digest_markdown} {not_allowed}',
      }],
    }));
    expect(errors.some((e) => e.includes('unknown variable {not_allowed}'))).toBe(true);
  });

  it('requires quick action label', () => {
    const errors = validateTemplate(makeTemplate({
      quickActions: [{ label: '', description: '', promptTemplate: '{digest_markdown}' }],
    }));
    expect(errors.some((e) => e.includes('label is required'))).toBe(true);
  });

  it('requires quick action prompt template', () => {
    const errors = validateTemplate(makeTemplate({
      quickActions: [{ label: 'Test', description: '', promptTemplate: '' }],
    }));
    expect(errors.some((e) => e.includes('prompt_template is required'))).toBe(true);
  });

  it('collects multiple errors at once', () => {
    const errors = validateTemplate(makeTemplate({
      metadata: { key: 'x', name: '', description: '', locale: 'en' },
      systemPrompt: '',
      digestUserTemplate: '',
    }));
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

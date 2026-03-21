import { describe, it, expect } from 'vitest';
import { formatElapsed, formatWallTime, digestOk } from '../../src/entities/types';
import { SUGGESTED_MODELS, type LLMProvider } from '../../src/entities/config';

describe('formatElapsed', () => {
  it('formats zero seconds', () => {
    expect(formatElapsed(0)).toBe('00:00:00');
  });

  it('formats minutes and seconds', () => {
    expect(formatElapsed(125)).toBe('00:02:05');
  });

  it('formats hours', () => {
    expect(formatElapsed(3661)).toBe('01:01:01');
  });
});

describe('formatWallTime', () => {
  it('formats epoch seconds to [HH:MM:SS]', () => {
    // 2024-01-01 12:30:45 UTC
    const epoch = new Date('2024-01-01T12:30:45Z').getTime() / 1000;
    const result = formatWallTime(epoch);
    expect(result).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
  });
});

describe('digestOk', () => {
  it('returns true when data is present', () => {
    expect(digestOk({ data: 'some content', error: '' })).toBe(true);
  });

  it('returns false when data is null', () => {
    expect(digestOk({ data: null, error: 'some error' })).toBe(false);
  });
});

describe('SUGGESTED_MODELS', () => {
  it('covers all LLM providers', () => {
    const providers: LLMProvider[] = ['openai', 'ollama'];
    for (const provider of providers) {
      expect(SUGGESTED_MODELS[provider]).toBeDefined();
      expect(SUGGESTED_MODELS[provider].digest).toBeTruthy();
      expect(SUGGESTED_MODELS[provider].interactive).toBeTruthy();
    }
  });
});

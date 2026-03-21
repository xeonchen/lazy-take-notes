import { describe, it, expect } from 'vitest';
import { SUGGESTED_MODELS, DEFAULT_APP_CONFIG, DEFAULT_INFRA_CONFIG, MODEL_NAMES, AVAILABLE_WHISPER_MODELS, modelForLocale, type LLMProvider } from '../../src/entities/config';

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

describe('DEFAULT_APP_CONFIG uses MODEL_NAMES', () => {
  it('digest and interactive models reference MODEL_NAMES.OLLAMA_DEFAULT', () => {
    expect(DEFAULT_APP_CONFIG.digest.model).toBe(MODEL_NAMES.OLLAMA_DEFAULT);
    expect(DEFAULT_APP_CONFIG.interactive.model).toBe(MODEL_NAMES.OLLAMA_DEFAULT);
  });

  it('default infra provider is ollama', () => {
    expect(DEFAULT_INFRA_CONFIG.llmProvider).toBe('ollama');
  });
});

describe('AVAILABLE_WHISPER_MODELS includes breeze-asr-25', () => {
  it('contains breeze-asr-25', () => {
    expect(AVAILABLE_WHISPER_MODELS).toContain('breeze-asr-25');
  });
});

describe('modelForLocale', () => {
  it('returns breeze-asr-25 for zh locale', () => {
    expect(modelForLocale(DEFAULT_APP_CONFIG.transcription, 'zh')).toBe('breeze-asr-25');
  });

  it('returns breeze-asr-25 for zh-TW locale via prefix match', () => {
    expect(modelForLocale(DEFAULT_APP_CONFIG.transcription, 'zh-TW')).toBe('breeze-asr-25');
  });

  it('returns default model for en locale', () => {
    expect(modelForLocale(DEFAULT_APP_CONFIG.transcription, 'en')).toBe(DEFAULT_APP_CONFIG.transcription.model);
  });

  it('returns exact match over prefix match', () => {
    const config = { ...DEFAULT_APP_CONFIG.transcription, models: { zh: 'breeze-asr-25', 'zh-tw': 'special-model' } };
    expect(modelForLocale(config, 'zh-tw')).toBe('special-model');
  });
});

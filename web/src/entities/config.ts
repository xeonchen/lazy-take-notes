/**
 * L1 Entity — App configuration.
 * Mirrors Python l1_entities.config + l4_frameworks_and_drivers.config.
 */

export interface TranscriptionConfig {
  model: string;
  models: Record<string, string>; // locale → model override
  chunkDuration: number;
  overlap: number;
  silenceThreshold: number;
  pauseDuration: number;
}

export interface DigestConfig {
  model: string;
  minLines: number;
  minInterval: number; // seconds
  compactTokenThreshold: number;
  maxLines: number | null; // null → 2×minLines
}

export interface InteractiveConfig {
  model: string;
}

export interface OutputConfig {
  saveNotesHistory: boolean;
  saveContext: boolean;
}

export interface AppConfig {
  transcription: TranscriptionConfig;
  digest: DigestConfig;
  interactive: InteractiveConfig;
  output: OutputConfig;
  recognitionHints: string[];
}

export type LLMProvider = 'ollama' | 'openai';

export interface InfraConfig {
  llmProvider: LLMProvider;
  transcriptionBackend: 'webgpu' | 'wasm' | 'cloud';
  ollama: { host: string };
  openai: { apiKey: string; baseUrl: string };
}

/** Well-known model identifiers — single source of truth for default names. */
export const MODEL_NAMES = {
  /** Default Ollama model for digest & interactive. */
  OLLAMA_DEFAULT: 'gpt-oss:20b',
  /** Ollama cloud model recommended for digest (heavier). */
  OLLAMA_CLOUD_DIGEST: 'gpt-oss:120b-cloud',
  /** Ollama cloud model recommended for interactive (lighter). */
  OLLAMA_CLOUD_INTERACTIVE: 'gpt-oss:20b-cloud',
  /** Default OpenAI model for digest & interactive. */
  OPENAI_DEFAULT: 'gpt-5.4-nano',
  /** Larger OpenAI model (placeholder example). */
  OPENAI_LARGE: 'gpt-4o',
} as const;

/** Available whisper model short names. */
export const AVAILABLE_WHISPER_MODELS = [
  'whisper-tiny',
  'whisper-base',
  'whisper-small',
  'whisper-medium',
  'whisper-large-v3-turbo',
] as const;

export type WhisperModelName = typeof AVAILABLE_WHISPER_MODELS[number];

export const DEFAULT_APP_CONFIG: AppConfig = {
  transcription: {
    model: AVAILABLE_WHISPER_MODELS[0],
    models: {},
    chunkDuration: 25.0,
    overlap: 1.0,
    silenceThreshold: 0.01,
    pauseDuration: 1.5,
  },
  digest: {
    model: MODEL_NAMES.OLLAMA_DEFAULT,
    minLines: 15,
    minInterval: 60,
    compactTokenThreshold: 100_000,
    maxLines: null,
  },
  interactive: {
    model: MODEL_NAMES.OLLAMA_DEFAULT,
  },
  output: {
    saveNotesHistory: true,
    saveContext: true,
  },
  recognitionHints: [],
};

export const DEFAULT_INFRA_CONFIG: InfraConfig = {
  llmProvider: 'ollama',
  transcriptionBackend: 'webgpu',
  ollama: { host: 'http://localhost:11434' },
  openai: { apiKey: '', baseUrl: 'https://api.openai.com/v1' },
};

/** Default model suggestions per LLM provider. */
export const SUGGESTED_MODELS = {
  openai: { digest: MODEL_NAMES.OPENAI_DEFAULT, interactive: MODEL_NAMES.OPENAI_DEFAULT },
  ollama: { digest: MODEL_NAMES.OLLAMA_CLOUD_DIGEST, interactive: MODEL_NAMES.OLLAMA_CLOUD_INTERACTIVE },
} satisfies Record<LLMProvider, { digest: string; interactive: string }>;

/** Resolve whisper model name for a locale. */
export function modelForLocale(config: TranscriptionConfig, locale: string): string {
  const key = locale.toLowerCase();
  if (key in config.models) return config.models[key]!;
  const prefix = key.split('-')[0]!;
  if (prefix in config.models) return config.models[prefix]!;
  return config.model;
}

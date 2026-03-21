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

export const DEFAULT_APP_CONFIG: AppConfig = {
  transcription: {
    model: 'whisper-base',
    models: {},
    chunkDuration: 25.0,
    overlap: 1.0,
    silenceThreshold: 0.01,
    pauseDuration: 1.5,
  },
  digest: {
    model: 'gpt-4o-mini',
    minLines: 15,
    minInterval: 60,
    compactTokenThreshold: 100_000,
    maxLines: null,
  },
  interactive: {
    model: 'gpt-4o-mini',
  },
  output: {
    saveNotesHistory: true,
    saveContext: true,
  },
  recognitionHints: [],
};

export const DEFAULT_INFRA_CONFIG: InfraConfig = {
  llmProvider: 'openai',
  transcriptionBackend: 'webgpu',
  ollama: { host: 'http://localhost:11434' },
  openai: { apiKey: '', baseUrl: 'https://api.openai.com/v1' },
};

/** Available whisper model short names. */
export const AVAILABLE_WHISPER_MODELS = [
  'whisper-tiny',
  'whisper-base',
  'whisper-small',
  'whisper-medium',
  'whisper-large-v3-turbo',
] as const;

/** Resolve whisper model name for a locale. */
export function modelForLocale(config: TranscriptionConfig, locale: string): string {
  const key = locale.toLowerCase();
  if (key in config.models) return config.models[key]!;
  const prefix = key.split('-')[0]!;
  if (prefix in config.models) return config.models[prefix]!;
  return config.model;
}

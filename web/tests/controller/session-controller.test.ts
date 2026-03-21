import { describe, it, expect, vi } from 'vitest';
import { SessionController } from '../../src/controller/session-controller';
import type { AppConfig } from '../../src/entities/config';
import type { SessionTemplate } from '../../src/entities/template';
import type { LLMClient, PersistenceGateway } from '../../src/use-cases/ports';

function createFakeLLM(response = '# Digest'): LLMClient {
  return {
    chat: vi.fn().mockResolvedValue({ content: response, promptTokens: 100 }),
    chatSingle: vi.fn().mockResolvedValue(response),
    checkConnectivity: vi.fn().mockResolvedValue({ ok: true, error: '' }),
  };
}

function createFakePersistence(): PersistenceGateway {
  const store = new Map<string, unknown>();
  return {
    saveSession: vi.fn().mockResolvedValue(undefined),
    loadSession: vi.fn().mockImplementation(async (id: string) => store.get(id) ?? null),
    listSessions: vi.fn().mockResolvedValue([]),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    saveConfig: vi.fn().mockResolvedValue(undefined),
    loadConfig: vi.fn().mockResolvedValue(null),
  };
}

const template: SessionTemplate = {
  metadata: { name: 'Test', description: '', locale: 'en', key: 'test' },
  systemPrompt: 'You are helpful.',
  digestUserTemplate: 'Lines ({line_count}):\n{new_lines}\n{user_context}',
  finalUserTemplate: 'Final ({line_count}):\n{new_lines}\n{user_context}\n{full_transcript}',
  recognitionHints: [],
  quickActions: [
    { label: 'Summary', description: '', promptTemplate: '{digest_markdown}' },
  ],
};

const config: AppConfig = {
  transcription: {
    model: 'whisper-base',
    models: {},
    chunkDuration: 25,
    overlap: 1,
    silenceThreshold: 0.01,
    pauseDuration: 1.5,
  },
  digest: {
    model: 'gpt-4',
    minLines: 5,
    maxLines: 20,
    minInterval: 60,
    compactTokenThreshold: 4000,
  },
  interactive: {
    model: 'gpt-3.5-turbo',
  },
  output: {
    saveNotesHistory: true,
    saveContext: true,
  },
  recognitionHints: [],
};

describe('SessionController', () => {
  it('initializes digest state with system prompt', () => {
    const ctrl = new SessionController(
      config, template, createFakeLLM(), createFakePersistence(), 'sess-1',
    );
    expect(ctrl.digestState.messages).toHaveLength(1);
    expect(ctrl.digestState.messages[0]!.role).toBe('system');
  });

  it('onTranscriptSegments adds to buffer and allLines', () => {
    const ctrl = new SessionController(
      config, template, createFakeLLM(), createFakePersistence(), 'sess-1',
    );

    ctrl.onTranscriptSegments([
      { text: 'hello', wallStart: 0, wallEnd: 1 },
      { text: 'world', wallStart: 1, wallEnd: 2 },
    ]);

    expect(ctrl.digestState.buffer).toEqual(['hello', 'world']);
    expect(ctrl.digestState.allLines).toEqual(['hello', 'world']);
    expect(ctrl.allSegments).toHaveLength(2);
  });

  it('onTranscriptSegments returns true when digest should trigger', () => {
    const ctrl = new SessionController(
      config, template, createFakeLLM(), createFakePersistence(), 'sess-1',
    );

    // Add enough lines to force trigger (maxLines = 20)
    const segments = Array.from({ length: 21 }, (_, i) => ({
      text: `line ${i}`,
      wallStart: i,
      wallEnd: i + 1,
    }));

    const shouldTrigger = ctrl.onTranscriptSegments(segments);
    expect(shouldTrigger).toBe(true);
  });

  it('onTranscriptSegments persists session', () => {
    const persistence = createFakePersistence();
    const ctrl = new SessionController(
      config, template, createFakeLLM(), persistence, 'sess-1',
    );

    ctrl.onTranscriptSegments([{ text: 'hello', wallStart: 0, wallEnd: 1 }]);

    expect(persistence.saveSession).toHaveBeenCalled();
  });

  it('runDigest updates latestDigest on success', async () => {
    const ctrl = new SessionController(
      config, template, createFakeLLM('# Summary'), createFakePersistence(), 'sess-1',
    );

    ctrl.digestState.buffer = ['line1', 'line2'];

    const result = await ctrl.runDigest();
    expect(result.data).toBe('# Summary');
    expect(ctrl.latestDigest).toBe('# Summary');
  });

  it('runDigest does not update latestDigest on failure', async () => {
    const llm = createFakeLLM('');
    llm.chat = vi.fn().mockRejectedValue(new Error('Network error'));
    const ctrl = new SessionController(
      config, template, llm, createFakePersistence(), 'sess-1',
    );

    ctrl.digestState.buffer = ['line1'];

    const result = await ctrl.runDigest();
    expect(result.data).toBeNull();
    expect(ctrl.latestDigest).toBeNull();
  });

  it('runQuickAction delegates to quick action use case', async () => {
    const ctrl = new SessionController(
      config, template, createFakeLLM('QA result'), createFakePersistence(), 'sess-1',
    );

    ctrl.latestDigest = '# Digest';
    const result = await ctrl.runQuickAction('1');

    expect(result).not.toBeNull();
    expect(result!.label).toBe('Summary');
    expect(result!.result).toBe('QA result');
  });

  it('runQuickAction returns null for invalid key', async () => {
    const ctrl = new SessionController(
      config, template, createFakeLLM(), createFakePersistence(), 'sess-1',
    );

    const result = await ctrl.runQuickAction('99');
    expect(result).toBeNull();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { RunQuickActionUseCase } from '../../src/use-cases/quick-action';
import type { LLMClient } from '../../src/use-cases/ports';
import type { SessionTemplate } from '../../src/entities/template';

function createFakeLLM(response = 'Action result'): LLMClient {
  return {
    chat: vi.fn().mockResolvedValue({ content: response, promptTokens: 50 }),
    chatSingle: vi.fn().mockResolvedValue(response),
    checkConnectivity: vi.fn().mockResolvedValue({ ok: true, error: '' }),
  };
}

const template: SessionTemplate = {
  metadata: { name: 'Test', description: '', locale: 'en', key: 'test' },
  systemPrompt: 'You are helpful.',
  digestUserTemplate: '',
  finalUserTemplate: '',
  recognitionHints: [],
  quickActions: [
    { label: 'Summarize', description: '', promptTemplate: 'Summarize: {digest_markdown}' },
    { label: 'Actions', description: '', promptTemplate: 'Actions from: {recent_transcript}' },
  ],
};

describe('RunQuickActionUseCase', () => {
  it('executes quick action by 1-indexed key', async () => {
    const llm = createFakeLLM('Summary result');
    const uc = new RunQuickActionUseCase(llm);

    const result = await uc.execute('1', template, 'model', 'digest md', [
      { text: 'hello', wallStart: 0, wallEnd: 1 },
    ]);

    expect(result).not.toBeNull();
    expect(result!.label).toBe('Summarize');
    expect(result!.result).toBe('Summary result');
    expect(llm.chatSingle).toHaveBeenCalledOnce();
  });

  it('returns null for invalid key', async () => {
    const llm = createFakeLLM();
    const uc = new RunQuickActionUseCase(llm);

    expect(await uc.execute('0', template, 'model', null, [])).toBeNull();
    expect(await uc.execute('99', template, 'model', null, [])).toBeNull();
    expect(await uc.execute('abc', template, 'model', null, [])).toBeNull();
  });

  it('uses "(no digest yet)" when latestDigest is null', async () => {
    const llm = createFakeLLM();
    const uc = new RunQuickActionUseCase(llm);

    await uc.execute('1', template, 'model', null, []);

    const call = (llm.chatSingle as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[1]).toContain('(no digest yet)');
  });
});

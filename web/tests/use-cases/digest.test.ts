import { describe, it, expect, vi } from 'vitest';
import { RunDigestUseCase, shouldTriggerDigest } from '../../src/use-cases/digest';
import { DigestState } from '../../src/entities/digest-state';
import type { LLMClient } from '../../src/use-cases/ports';
import type { SessionTemplate } from '../../src/entities/template';

function createFakeLLM(response = 'Fake digest', promptTokens = 100): LLMClient {
  return {
    chat: vi.fn().mockResolvedValue({ content: response, promptTokens }),
    chatSingle: vi.fn().mockResolvedValue(response),
    checkConnectivity: vi.fn().mockResolvedValue({ ok: true, error: '' }),
  };
}

const template: SessionTemplate = {
  metadata: { name: 'Test', description: '', locale: 'en', key: 'test' },
  systemPrompt: 'You are helpful.',
  digestUserTemplate: 'Lines ({line_count}):\n{new_lines}\n{user_context}',
  finalUserTemplate: 'Final ({line_count}):\n{new_lines}\n{user_context}\n{full_transcript}',
  recognitionHints: [],
  quickActions: [],
};

describe('RunDigestUseCase', () => {
  it('successful digest updates state', async () => {
    const llm = createFakeLLM('# Summary');
    const uc = new RunDigestUseCase(llm);
    const state = new DigestState();
    state.initMessages('system');
    state.buffer = ['line1', 'line2'];

    const result = await uc.execute(state, 'model', template);

    expect(result.data).toBe('# Summary');
    expect(result.error).toBe('');
    expect(state.digestCount).toBe(1);
    expect(state.buffer).toEqual([]);
    expect(state.consecutiveFailures).toBe(0);
    expect(state.messages).toHaveLength(3); // system + user + assistant
  });

  it('empty response increments failures', async () => {
    const llm = createFakeLLM('   ');
    const uc = new RunDigestUseCase(llm);
    const state = new DigestState();
    state.initMessages('system');
    state.buffer = ['line1'];

    const result = await uc.execute(state, 'model', template);

    expect(result.data).toBeNull();
    expect(result.error).toBe('Empty response from LLM');
    expect(state.consecutiveFailures).toBe(1);
    expect(state.messages).toHaveLength(1); // user message popped
  });

  it('LLM error increments failures', async () => {
    const llm = createFakeLLM('');
    llm.chat = vi.fn().mockRejectedValue(new Error('Network error'));
    const uc = new RunDigestUseCase(llm);
    const state = new DigestState();
    state.initMessages('system');
    state.buffer = ['line1'];

    const result = await uc.execute(state, 'model', template);

    expect(result.data).toBeNull();
    expect(result.error).toContain('Network error');
    expect(state.consecutiveFailures).toBe(1);
  });
});

describe('shouldTriggerDigest', () => {
  it('returns false when buffer too small', () => {
    const state = new DigestState();
    state.buffer = ['a', 'b'];
    expect(shouldTriggerDigest(state, 5, 60)).toBe(false);
  });

  it('returns true when buffer exceeds max (force trigger)', () => {
    const state = new DigestState();
    state.buffer = Array(10).fill('line');
    expect(shouldTriggerDigest(state, 5, 60)).toBe(true);
  });

  it('returns false when buffer >= min but interval not met', () => {
    const state = new DigestState();
    state.buffer = Array(5).fill('line');
    state.lastDigestTime = performance.now() / 1000; // just now
    expect(shouldTriggerDigest(state, 5, 60)).toBe(false);
  });

  it('returns true when buffer >= min and interval met', () => {
    const state = new DigestState();
    state.buffer = Array(5).fill('line');
    state.lastDigestTime = performance.now() / 1000 - 120; // 2 minutes ago
    expect(shouldTriggerDigest(state, 5, 60)).toBe(true);
  });
});

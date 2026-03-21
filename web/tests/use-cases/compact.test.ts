import { describe, it, expect } from 'vitest';
import { CompactMessagesUseCase } from '../../src/use-cases/compact';
import { DigestState } from '../../src/entities/digest-state';

describe('CompactMessagesUseCase', () => {
  it('replaces messages with system + compact user + assistant', () => {
    const uc = new CompactMessagesUseCase();
    const state = new DigestState();
    state.initMessages('System prompt');
    state.messages.push({ role: 'user', content: 'old user msg' });
    state.messages.push({ role: 'assistant', content: 'old assistant msg' });
    state.messages.push({ role: 'user', content: 'another user msg' });
    state.messages.push({ role: 'assistant', content: 'another assistant msg' });
    state.promptTokens = 5000;

    uc.execute(state, '# Latest Notes', 'System prompt');

    expect(state.messages).toHaveLength(3);
    expect(state.messages[0]).toEqual({ role: 'system', content: 'System prompt' });
    expect(state.messages[1]!.role).toBe('user');
    expect(state.messages[1]!.content).toContain('# Latest Notes');
    expect(state.messages[1]!.content).toContain('Prior conversation compacted');
    expect(state.messages[2]).toEqual({ role: 'assistant', content: '# Latest Notes' });
    expect(state.promptTokens).toBe(0);
  });
});

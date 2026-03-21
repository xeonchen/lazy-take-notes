import { describe, it, expect } from 'vitest';
import { DigestState } from '../../src/entities/digest-state';

describe('DigestState', () => {
  it('initializes with empty state', () => {
    const state = new DigestState();
    expect(state.messages).toEqual([]);
    expect(state.buffer).toEqual([]);
    expect(state.allLines).toEqual([]);
    expect(state.digestCount).toBe(0);
    expect(state.consecutiveFailures).toBe(0);
    expect(state.promptTokens).toBe(0);
  });

  it('initMessages sets system prompt', () => {
    const state = new DigestState();
    state.initMessages('You are a helpful assistant.');
    expect(state.messages).toEqual([
      { role: 'system', content: 'You are a helpful assistant.' },
    ]);
  });

  it('can mutate buffer', () => {
    const state = new DigestState();
    state.buffer.push('line 1');
    state.buffer.push('line 2');
    expect(state.buffer).toEqual(['line 1', 'line 2']);
    state.buffer = [];
    expect(state.buffer).toEqual([]);
  });
});

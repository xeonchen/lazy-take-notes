import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAILLMClient } from '../../src/adapters/openai-llm';

describe('OpenAILLMClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('chat sends correct request and parses response', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hello!' } }],
        usage: { prompt_tokens: 42 },
      }),
    });

    const client = new OpenAILLMClient('sk-test', 'https://api.example.com/v1');
    const result = await client.chat('gpt-4', [
      { role: 'user', content: 'Hi' },
    ]);

    expect(result.content).toBe('Hello!');
    expect(result.promptTokens).toBe(42);

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toBe('https://api.example.com/v1/chat/completions');
    expect(call[1]!.headers.Authorization).toBe('Bearer sk-test');
  });

  it('chat throws on non-ok response', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      statusText: 'Unauthorized',
    });

    const client = new OpenAILLMClient('bad-key');
    await expect(client.chat('gpt-4', [])).rejects.toThrow('OpenAI API error (401)');
  });

  it('chatSingle wraps chat', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Result' } }],
        usage: {},
      }),
    });

    const client = new OpenAILLMClient('sk-test');
    const result = await client.chatSingle('gpt-4', 'prompt');
    expect(result).toBe('Result');
  });

  it('checkConnectivity returns ok on success', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const client = new OpenAILLMClient('sk-test');
    const result = await client.checkConnectivity();
    expect(result.ok).toBe(true);
  });

  it('checkConnectivity returns error on network failure', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const client = new OpenAILLMClient('sk-test');
    const result = await client.checkConnectivity();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Network error');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaLLMClient } from '../../src/adapters/ollama-llm';

describe('OllamaLLMClient', () => {
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
        message: { content: 'Ollama says hi' },
        prompt_eval_count: 30,
      }),
    });

    const client = new OllamaLLMClient('http://localhost:11434');
    const result = await client.chat('llama3', [
      { role: 'user', content: 'Hi' },
    ]);

    expect(result.content).toBe('Ollama says hi');
    expect(result.promptTokens).toBe(30);

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toBe('http://localhost:11434/api/chat');
    const body = JSON.parse(call[1]!.body);
    expect(body.stream).toBe(false);
  });

  it('chat detects CORS error', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 0,
      text: async () => 'CORS error',
      statusText: '',
    });

    const client = new OllamaLLMClient();
    await expect(client.chat('llama3', [])).rejects.toThrow('CORS error');
    await expect(client.chat('llama3', [])).rejects.toThrow('OLLAMA_ORIGINS');
  });

  it('checkConnectivity returns helpful error on network failure', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed to fetch'));

    const client = new OllamaLLMClient();
    const result = await client.checkConnectivity();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Cannot connect to Ollama');
    expect(result.error).toContain('OLLAMA_ORIGINS');
  });
});

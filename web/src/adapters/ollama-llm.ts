/**
 * L3 Adapter — Ollama LLM client (fetch to localhost).
 * Requires Ollama to set OLLAMA_ORIGINS=* for browser CORS.
 */

import type { ChatMessage, ChatResponse } from '../entities/types';
import type { LLMClient } from '../use-cases/ports';

export class OllamaLLMClient implements LLMClient {
  constructor(private host: string = 'http://localhost:11434') {}

  async chat(model: string, messages: ChatMessage[]): Promise<ChatResponse> {
    const resp = await fetch(`${this.host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText);
      if (resp.status === 0 || text.includes('CORS')) {
        throw new Error(
          `CORS error connecting to Ollama. Please set OLLAMA_ORIGINS=* ` +
            `and restart Ollama. See: https://github.com/ollama/ollama/blob/main/docs/faq.md`,
        );
      }
      throw new Error(`Ollama API error (${resp.status}): ${text}`);
    }

    const data = await resp.json() as {
      message?: { content: string };
      prompt_eval_count?: number;
    };

    const content = data.message?.content ?? '';
    const promptTokens = data.prompt_eval_count ?? 0;
    return { content, promptTokens };
  }

  async chatSingle(model: string, prompt: string): Promise<string> {
    const resp = await this.chat(model, [{ role: 'user', content: prompt }]);
    return resp.content;
  }

  async checkConnectivity(): Promise<{ ok: boolean; error: string }> {
    try {
      const resp = await fetch(`${this.host}/api/tags`);
      if (resp.ok) return { ok: true, error: '' };
      return { ok: false, error: `HTTP ${resp.status}: ${resp.statusText}` };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        return {
          ok: false,
          error:
            `Cannot connect to Ollama at ${this.host}. ` +
            `Make sure Ollama is running and OLLAMA_ORIGINS=* is set.`,
        };
      }
      return { ok: false, error: msg };
    }
  }
}

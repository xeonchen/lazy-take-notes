/**
 * L3 Adapter — OpenAI-compatible LLM client (fetch-based).
 * Works with OpenAI, Groq, Together, and any OpenAI-compatible API.
 */

import type { ChatMessage, ChatResponse } from '../entities/types';
import type { LLMClient } from '../use-cases/ports';

export class OpenAILLMClient implements LLMClient {
  constructor(
    private apiKey: string,
    private baseUrl: string = 'https://api.openai.com/v1',
  ) {}

  async chat(model: string, messages: ChatMessage[]): Promise<ChatResponse> {
    const resp = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText);
      throw new Error(`OpenAI API error (${resp.status}): ${text}`);
    }

    const data = await resp.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens?: number };
    };

    const content = data.choices[0]?.message?.content ?? '';
    const promptTokens = data.usage?.prompt_tokens ?? 0;
    return { content, promptTokens };
  }

  async chatSingle(model: string, prompt: string): Promise<string> {
    const resp = await this.chat(model, [{ role: 'user', content: prompt }]);
    return resp.content;
  }

  async checkConnectivity(): Promise<{ ok: boolean; error: string }> {
    try {
      const resp = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (resp.ok) return { ok: true, error: '' };
      return { ok: false, error: `HTTP ${resp.status}: ${resp.statusText}` };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

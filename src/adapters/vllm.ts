/**
 * vLLM Adapter (Default Port: 8000)
 * High-throughput local continuous batching inference engine via OpenAI-compatible endpoints
 */

import {
  ModelAdapter,
  AdapterType,
  AdapterHealth,
  ModelInfo,
  CompletionOptions,
  CompletionResult,
  ChatMessage,
  ChatResult
} from './base.js';

export interface VLLMOptions {
  endpoint?: string;
  timeoutMs?: number;
  defaultModel?: string;
  apiKey?: string;
}

export class VLLMAdapter implements ModelAdapter {
  readonly type: AdapterType = 'vllm';
  readonly defaultEndpoint = 'http://127.0.0.1:8000';
  endpoint: string;
  defaultModel: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor(options: VLLMOptions = {}) {
    this.endpoint = options.endpoint || this.defaultEndpoint;
    this.defaultModel = options.defaultModel || 'meta-llama/Llama-3.3-70B-Instruct';
    this.apiKey = options.apiKey || 'EMPTY';
    this.timeoutMs = options.timeoutMs || 30000;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
  }

  async checkHealth(): Promise<AdapterHealth> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      // Check /health or /v1/models
      const res = await fetch(`${this.endpoint}/v1/models`, {
        headers: this.getHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          connected: false,
          type: this.type,
          endpoint: this.endpoint,
          latencyMs: Date.now() - start,
          availableModels: [],
          error: `HTTP ${res.status}: ${res.statusText}`
        };
      }

      const data = (await res.json()) as { data?: Array<{ id: string }> };
      const models = (data.data || []).map((m) => m.id);

      return {
        connected: true,
        type: this.type,
        endpoint: this.endpoint,
        latencyMs: Date.now() - start,
        availableModels: models,
        version: 'vLLM OpenAI-Compatible Engine'
      };
    } catch (err: any) {
      return {
        connected: false,
        type: this.type,
        endpoint: this.endpoint,
        latencyMs: Date.now() - start,
        availableModels: [],
        error: err.message || String(err)
      };
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${this.endpoint}/v1/models`, {
      headers: this.getHeaders()
    });
    if (!res.ok) {
      throw new Error(`Failed to list vLLM models: ${res.statusText}`);
    }
    const data = (await res.json()) as { data?: Array<{ id: string; created?: number }> };
    return (data.data || []).map((m) => ({
      id: m.id,
      name: m.id,
      modifiedAt: m.created ? new Date(m.created * 1000).toISOString() : undefined
    }));
  }

  async generate(prompt: string, options: CompletionOptions = {}): Promise<CompletionResult> {
    const model = options.model || this.defaultModel;
    const start = Date.now();

    const payload = {
      model,
      prompt,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.2,
      top_p: options.topP ?? 0.9,
      stop: options.stop
    };

    const res = await fetch(`${this.endpoint}/v1/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`vLLM completion failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as {
      choices: Array<{ text: string }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const durationMs = Date.now() - start;
    const text = data.choices[0]?.text || '';
    const promptTokens = data.usage?.prompt_tokens || Math.ceil(prompt.length / 4);
    const completionTokens = data.usage?.completion_tokens || Math.ceil(text.length / 4);
    const totalTokens = data.usage?.total_tokens || (promptTokens + completionTokens);
    const tps = durationMs > 0 ? (completionTokens / (durationMs / 1000)) : 0;

    return {
      text,
      model,
      adapter: this.type,
      promptTokens,
      completionTokens,
      totalTokens,
      durationMs,
      tokensPerSecond: Math.round(tps * 10) / 10
    };
  }

  async chat(messages: ChatMessage[], options: CompletionOptions = {}): Promise<ChatResult> {
    const model = options.model || this.defaultModel;
    const start = Date.now();

    const formattedMessages = messages.map((m) => ({
      role: m.role,
      content: m.content
    }));

    if (options.systemPrompt && !messages.some((m) => m.role === 'system')) {
      formattedMessages.unshift({ role: 'system', content: options.systemPrompt });
    }

    const payload = {
      model,
      messages: formattedMessages,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.2,
      top_p: options.topP ?? 0.9,
      stop: options.stop
    };

    const res = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`vLLM chat failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { role: string; content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const durationMs = Date.now() - start;
    const text = data.choices[0]?.message?.content || '';
    const promptTokens = data.usage?.prompt_tokens || Math.ceil(JSON.stringify(messages).length / 4);
    const completionTokens = data.usage?.completion_tokens || Math.ceil(text.length / 4);
    const totalTokens = data.usage?.total_tokens || (promptTokens + completionTokens);
    const tps = durationMs > 0 ? (completionTokens / (durationMs / 1000)) : 0;

    return {
      text,
      message: {
        role: 'assistant',
        content: text
      },
      model,
      adapter: this.type,
      promptTokens,
      completionTokens,
      totalTokens,
      durationMs,
      tokensPerSecond: Math.round(tps * 10) / 10
    };
  }
}

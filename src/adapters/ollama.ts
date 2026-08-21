/**
 * Ollama Adapter (Default Port: 11434)
 * Connects directly to local Ollama daemon for fast zero-cloud inference
 */

import {
  ModelAdapter,
  AdapterType,
  AdapterHealth,
  ModelInfo,
  CompletionOptions,
  CompletionResult,
  ChatMessage,
  ChatResult,
  EmbeddingResult
} from './base.js';

export interface OllamaOptions {
  endpoint?: string;
  timeoutMs?: number;
  defaultModel?: string;
}

export class OllamaAdapter implements ModelAdapter {
  readonly type: AdapterType = 'ollama';
  readonly defaultEndpoint = 'http://127.0.0.1:11434';
  endpoint: string;
  defaultModel: string;
  private timeoutMs: number;

  constructor(options: OllamaOptions = {}) {
    this.endpoint = options.endpoint || this.defaultEndpoint;
    this.defaultModel = options.defaultModel || 'qwen2.5-coder:7b';
    this.timeoutMs = options.timeoutMs || 30000;
  }

  async checkHealth(): Promise<AdapterHealth> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${this.endpoint}/api/tags`, {
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

      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const models = (data.models || []).map((m) => m.name);

      return {
        connected: true,
        type: this.type,
        endpoint: this.endpoint,
        latencyMs: Date.now() - start,
        availableModels: models,
        version: res.headers.get('ollama-version') || 'active'
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
    const res = await fetch(`${this.endpoint}/api/tags`);
    if (!res.ok) {
      throw new Error(`Failed to list Ollama models: ${res.statusText}`);
    }
    const data = (await res.json()) as {
      models?: Array<{
        name: string;
        model: string;
        size: number;
        details?: { family?: string; quantization_level?: string };
        modified_at?: string;
      }>;
    };

    return (data.models || []).map((m) => ({
      id: m.name,
      name: m.name,
      sizeBytes: m.size,
      family: m.details?.family,
      quantization: m.details?.quantization_level,
      modifiedAt: m.modified_at
    }));
  }

  async generate(prompt: string, options: CompletionOptions = {}): Promise<CompletionResult> {
    const model = options.model || this.defaultModel;
    const start = Date.now();

    const payload = {
      model,
      prompt,
      system: options.systemPrompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.2,
        top_p: options.topP ?? 0.9,
        num_predict: options.maxTokens ?? 2048,
        stop: options.stop
      }
    };

    const res = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama generate failed (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      response: string;
      prompt_eval_count?: number;
      eval_count?: number;
      total_duration?: number;
      eval_duration?: number;
    };

    const durationMs = Date.now() - start;
    const promptTokens = data.prompt_eval_count || Math.ceil(prompt.length / 4);
    const completionTokens = data.eval_count || Math.ceil(data.response.length / 4);
    const totalTokens = promptTokens + completionTokens;
    const tps = durationMs > 0 ? (completionTokens / (durationMs / 1000)) : 0;

    return {
      text: data.response,
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
      stream: false,
      options: {
        temperature: options.temperature ?? 0.2,
        top_p: options.topP ?? 0.9,
        num_predict: options.maxTokens ?? 2048,
        stop: options.stop
      }
    };

    const res = await fetch(`${this.endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama chat failed (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      message: { role: 'assistant'; content: string };
      prompt_eval_count?: number;
      eval_count?: number;
      total_duration?: number;
    };

    const durationMs = Date.now() - start;
    const text = data.message?.content || '';
    const promptTokens = data.prompt_eval_count || Math.ceil(JSON.stringify(messages).length / 4);
    const completionTokens = data.eval_count || Math.ceil(text.length / 4);
    const totalTokens = promptTokens + completionTokens;
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

  async embed(prompt: string, model?: string): Promise<EmbeddingResult> {
    const res = await fetch(`${this.endpoint}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || this.defaultModel,
        prompt
      })
    });

    if (!res.ok) {
      throw new Error(`Ollama embeddings failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as { embedding: number[] };
    return {
      embedding: data.embedding,
      model: model || this.defaultModel,
      tokens: Math.ceil(prompt.length / 4)
    };
  }
}

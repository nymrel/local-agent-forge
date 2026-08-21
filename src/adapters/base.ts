/**
 * Base Adapter Definitions for Local AI Inference Engines
 * Copyright (c) 2026 Nymrel / JalenBuilds LLC
 */

export type AdapterType = 'ollama' | 'vllm' | 'lmstudio' | 'comfyui' | 'whisper' | 'custom';

export interface AdapterHealth {
  connected: boolean;
  type: AdapterType;
  endpoint: string;
  latencyMs: number;
  availableModels: string[];
  version?: string;
  error?: string;
  vramUsage?: {
    usedMb: number;
    totalMb: number;
  };
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
  stream?: boolean;
  systemPrompt?: string;
}

export interface CompletionResult {
  text: string;
  model: string;
  adapter: AdapterType;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  tokensPerSecond: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResult extends CompletionResult {
  message: ChatMessage;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokens: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  sizeBytes?: number;
  quantization?: string;
  family?: string;
  modifiedAt?: string;
}

export interface ModelAdapter {
  readonly type: AdapterType;
  readonly defaultEndpoint: string;
  endpoint: string;

  checkHealth(): Promise<AdapterHealth>;
  listModels(): Promise<ModelInfo[]>;
  generate(prompt: string, options?: CompletionOptions): Promise<CompletionResult>;
  chat(messages: ChatMessage[], options?: CompletionOptions): Promise<ChatResult>;
}

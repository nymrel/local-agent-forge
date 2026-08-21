/**
 * vLLM Adapter (Default Port: 8000)
 * High-throughput local continuous batching inference engine via OpenAI-compatible endpoints
 */
import { ModelAdapter, AdapterType, AdapterHealth, ModelInfo, CompletionOptions, CompletionResult, ChatMessage, ChatResult } from './base.js';
export interface VLLMOptions {
    endpoint?: string;
    timeoutMs?: number;
    defaultModel?: string;
    apiKey?: string;
}
export declare class VLLMAdapter implements ModelAdapter {
    readonly type: AdapterType;
    readonly defaultEndpoint = "http://127.0.0.1:8000";
    endpoint: string;
    defaultModel: string;
    private apiKey;
    private timeoutMs;
    constructor(options?: VLLMOptions);
    private getHeaders;
    checkHealth(): Promise<AdapterHealth>;
    listModels(): Promise<ModelInfo[]>;
    generate(prompt: string, options?: CompletionOptions): Promise<CompletionResult>;
    chat(messages: ChatMessage[], options?: CompletionOptions): Promise<ChatResult>;
}
//# sourceMappingURL=vllm.d.ts.map
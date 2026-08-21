/**
 * Ollama Adapter (Default Port: 11434)
 * Connects directly to local Ollama daemon for fast zero-cloud inference
 */
import { ModelAdapter, AdapterType, AdapterHealth, ModelInfo, CompletionOptions, CompletionResult, ChatMessage, ChatResult, EmbeddingResult } from './base.js';
export interface OllamaOptions {
    endpoint?: string;
    timeoutMs?: number;
    defaultModel?: string;
}
export declare class OllamaAdapter implements ModelAdapter {
    readonly type: AdapterType;
    readonly defaultEndpoint = "http://127.0.0.1:11434";
    endpoint: string;
    defaultModel: string;
    private timeoutMs;
    constructor(options?: OllamaOptions);
    checkHealth(): Promise<AdapterHealth>;
    listModels(): Promise<ModelInfo[]>;
    generate(prompt: string, options?: CompletionOptions): Promise<CompletionResult>;
    chat(messages: ChatMessage[], options?: CompletionOptions): Promise<ChatResult>;
    embed(prompt: string, model?: string): Promise<EmbeddingResult>;
}
//# sourceMappingURL=ollama.d.ts.map
/**
 * LM Studio Adapter (Default Port: 1234)
 * Connects directly to LM Studio local server
 */
import { ModelAdapter, AdapterType, AdapterHealth, ModelInfo, CompletionOptions, CompletionResult, ChatMessage, ChatResult } from './base.js';
export interface LMStudioOptions {
    endpoint?: string;
    timeoutMs?: number;
    defaultModel?: string;
}
export declare class LMStudioAdapter implements ModelAdapter {
    readonly type: AdapterType;
    readonly defaultEndpoint = "http://127.0.0.1:1234";
    endpoint: string;
    defaultModel: string;
    private timeoutMs;
    constructor(options?: LMStudioOptions);
    checkHealth(): Promise<AdapterHealth>;
    listModels(): Promise<ModelInfo[]>;
    generate(prompt: string, options?: CompletionOptions): Promise<CompletionResult>;
    chat(messages: ChatMessage[], options?: CompletionOptions): Promise<ChatResult>;
}
//# sourceMappingURL=lmstudio.d.ts.map
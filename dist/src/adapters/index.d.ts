/**
 * Local AI Adapters Unified Registry
 * Copyright (c) 2026 Nymrel / JalenBuilds LLC
 */
export * from './base.js';
export * from './ollama.js';
export * from './vllm.js';
export * from './lmstudio.js';
export * from './comfyui.js';
export * from './whisper.js';
import { ModelAdapter, AdapterHealth, AdapterType } from './base.js';
import { OllamaAdapter, OllamaOptions } from './ollama.js';
import { VLLMAdapter, VLLMOptions } from './vllm.js';
import { LMStudioAdapter, LMStudioOptions } from './lmstudio.js';
import { ComfyUIAdapter } from './comfyui.js';
import { WhisperAdapter } from './whisper.js';
export interface AdapterRegistryConfig {
    ollama?: OllamaOptions | boolean;
    vllm?: VLLMOptions | boolean;
    lmstudio?: LMStudioOptions | boolean;
    comfyui?: {
        endpoint?: string;
    } | boolean;
    whisper?: {
        endpoint?: string;
    } | boolean;
}
export declare class AdapterRegistry {
    readonly ollama: OllamaAdapter;
    readonly vllm: VLLMAdapter;
    readonly lmstudio: LMStudioAdapter;
    readonly comfyui: ComfyUIAdapter;
    readonly whisper: WhisperAdapter;
    constructor(config?: AdapterRegistryConfig);
    getLLMAdapters(): ModelAdapter[];
    probeAll(): Promise<Record<AdapterType, AdapterHealth>>;
    getFirstHealthyLLMAdapter(): Promise<ModelAdapter | null>;
}
//# sourceMappingURL=index.d.ts.map
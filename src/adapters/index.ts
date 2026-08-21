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
  comfyui?: { endpoint?: string } | boolean;
  whisper?: { endpoint?: string } | boolean;
}

export class AdapterRegistry {
  readonly ollama: OllamaAdapter;
  readonly vllm: VLLMAdapter;
  readonly lmstudio: LMStudioAdapter;
  readonly comfyui: ComfyUIAdapter;
  readonly whisper: WhisperAdapter;

  constructor(config: AdapterRegistryConfig = {}) {
    this.ollama = new OllamaAdapter(typeof config.ollama === 'object' ? config.ollama : {});
    this.vllm = new VLLMAdapter(typeof config.vllm === 'object' ? config.vllm : {});
    this.lmstudio = new LMStudioAdapter(typeof config.lmstudio === 'object' ? config.lmstudio : {});
    this.comfyui = new ComfyUIAdapter(typeof config.comfyui === 'object' ? config.comfyui : {});
    this.whisper = new WhisperAdapter(typeof config.whisper === 'object' ? config.whisper : {});
  }

  getLLMAdapters(): ModelAdapter[] {
    return [this.ollama, this.vllm, this.lmstudio];
  }

  async probeAll(): Promise<Record<AdapterType, AdapterHealth>> {
    const [ollamaHealth, vllmHealth, lmstudioHealth, comfyHealth, whisperHealth] =
      await Promise.all([
        this.ollama.checkHealth(),
        this.vllm.checkHealth(),
        this.lmstudio.checkHealth(),
        this.comfyui.checkHealth(),
        this.whisper.checkHealth()
      ]);

    return {
      ollama: ollamaHealth,
      vllm: vllmHealth,
      lmstudio: lmstudioHealth,
      comfyui: comfyHealth,
      whisper: whisperHealth,
      custom: {
        connected: false,
        type: 'custom',
        endpoint: '',
        latencyMs: 0,
        availableModels: []
      }
    };
  }

  async getFirstHealthyLLMAdapter(): Promise<ModelAdapter | null> {
    const adapters = this.getLLMAdapters();
    for (const adapter of adapters) {
      const health = await adapter.checkHealth();
      if (health.connected) {
        return adapter;
      }
    }
    return null;
  }
}

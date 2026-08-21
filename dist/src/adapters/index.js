"use strict";
/**
 * Local AI Adapters Unified Registry
 * Copyright (c) 2026 Nymrel / JalenBuilds LLC
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterRegistry = void 0;
__exportStar(require("./base.js"), exports);
__exportStar(require("./ollama.js"), exports);
__exportStar(require("./vllm.js"), exports);
__exportStar(require("./lmstudio.js"), exports);
__exportStar(require("./comfyui.js"), exports);
__exportStar(require("./whisper.js"), exports);
const ollama_js_1 = require("./ollama.js");
const vllm_js_1 = require("./vllm.js");
const lmstudio_js_1 = require("./lmstudio.js");
const comfyui_js_1 = require("./comfyui.js");
const whisper_js_1 = require("./whisper.js");
class AdapterRegistry {
    ollama;
    vllm;
    lmstudio;
    comfyui;
    whisper;
    constructor(config = {}) {
        this.ollama = new ollama_js_1.OllamaAdapter(typeof config.ollama === 'object' ? config.ollama : {});
        this.vllm = new vllm_js_1.VLLMAdapter(typeof config.vllm === 'object' ? config.vllm : {});
        this.lmstudio = new lmstudio_js_1.LMStudioAdapter(typeof config.lmstudio === 'object' ? config.lmstudio : {});
        this.comfyui = new comfyui_js_1.ComfyUIAdapter(typeof config.comfyui === 'object' ? config.comfyui : {});
        this.whisper = new whisper_js_1.WhisperAdapter(typeof config.whisper === 'object' ? config.whisper : {});
    }
    getLLMAdapters() {
        return [this.ollama, this.vllm, this.lmstudio];
    }
    async probeAll() {
        const [ollamaHealth, vllmHealth, lmstudioHealth, comfyHealth, whisperHealth] = await Promise.all([
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
    async getFirstHealthyLLMAdapter() {
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
exports.AdapterRegistry = AdapterRegistry;
//# sourceMappingURL=index.js.map
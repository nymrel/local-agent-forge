"use strict";
/**
 * LM Studio Adapter (Default Port: 1234)
 * Connects directly to LM Studio local server
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LMStudioAdapter = void 0;
const http_url_js_1 = require("../utils/http-url.js");
class LMStudioAdapter {
    type = 'lmstudio';
    defaultEndpoint = 'http://127.0.0.1:1234';
    endpoint;
    defaultModel;
    timeoutMs;
    constructor(options = {}) {
        this.endpoint = (0, http_url_js_1.normalizeHttpBaseUrl)(options.endpoint ?? this.defaultEndpoint, 'LM Studio endpoint');
        this.defaultModel = options.defaultModel || 'local-model';
        this.timeoutMs = options.timeoutMs || 30000;
    }
    async checkHealth() {
        const start = Date.now();
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(`${this.endpoint}/v1/models`, {
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
            const data = (await res.json());
            const models = (data.data || []).map((m) => m.id);
            return {
                connected: true,
                type: this.type,
                endpoint: this.endpoint,
                latencyMs: Date.now() - start,
                availableModels: models,
                version: 'LM Studio OpenAI Server'
            };
        }
        catch (err) {
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
    async listModels() {
        const res = await fetch(`${this.endpoint}/v1/models`);
        if (!res.ok) {
            throw new Error(`Failed to list LM Studio models: ${res.statusText}`);
        }
        const data = (await res.json());
        return (data.data || []).map((m) => ({
            id: m.id,
            name: m.id
        }));
    }
    async generate(prompt, options = {}) {
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            throw new Error(`LM Studio completion failed (${res.status}): ${await res.text()}`);
        }
        const data = (await res.json());
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
    async chat(messages, options = {}) {
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            throw new Error(`LM Studio chat failed (${res.status}): ${await res.text()}`);
        }
        const data = (await res.json());
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
exports.LMStudioAdapter = LMStudioAdapter;
//# sourceMappingURL=lmstudio.js.map
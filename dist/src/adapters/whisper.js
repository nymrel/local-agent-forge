"use strict";
/**
 * Whisper Adapter (Default Port: 8080)
 * Connects directly to local Whisper / faster-whisper / whisper.cpp servers for $0 local audio transcription
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhisperAdapter = void 0;
const http_url_js_1 = require("../utils/http-url.js");
class WhisperAdapter {
    type = 'whisper';
    defaultEndpoint = 'http://127.0.0.1:8080';
    endpoint;
    constructor(options = {}) {
        this.endpoint = (0, http_url_js_1.normalizeHttpBaseUrl)(options.endpoint ?? this.defaultEndpoint, 'Whisper endpoint');
    }
    async checkHealth() {
        const start = Date.now();
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            // Check /health or /
            const res = await fetch(`${this.endpoint}/health`, {
                signal: controller.signal
            }).catch(() => fetch(`${this.endpoint}/`, { signal: controller.signal }));
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
            return {
                connected: true,
                type: this.type,
                endpoint: this.endpoint,
                latencyMs: Date.now() - start,
                availableModels: ['whisper-base', 'whisper-medium', 'whisper-large-v3'],
                version: 'Local Whisper Engine'
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
    async transcribe(audioData, options = {}) {
        const start = Date.now();
        const formData = new FormData();
        const blob = audioData instanceof Blob ? audioData : new Blob([audioData], { type: 'audio/wav' });
        formData.append('file', blob, 'audio.wav');
        if (options.language) {
            formData.append('language', options.language);
        }
        if (options.model) {
            formData.append('model', options.model);
        }
        // Try OpenAI-compatible /v1/audio/transcriptions or /inference
        let res = await fetch(`${this.endpoint}/v1/audio/transcriptions`, {
            method: 'POST',
            body: formData
        }).catch(() => null);
        if (!res || !res.ok) {
            res = await fetch(`${this.endpoint}/inference`, {
                method: 'POST',
                body: formData
            });
        }
        if (!res.ok) {
            throw new Error(`Whisper transcription failed (${res.status}): ${await res.text()}`);
        }
        const data = (await res.json());
        const latencyMs = Date.now() - start;
        return {
            text: data.text || '',
            language: data.language || options.language,
            durationSeconds: data.duration,
            latencyMs,
            segments: data.segments
        };
    }
}
exports.WhisperAdapter = WhisperAdapter;
//# sourceMappingURL=whisper.js.map
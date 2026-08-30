"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const index_js_1 = require("../src/adapters/index.js");
const http_url_js_1 = require("../src/utils/http-url.js");
(0, node_test_1.describe)('HTTP adapter endpoint boundary', () => {
    (0, node_test_1.test)('normalizes credential-free HTTP(S) base URLs', () => {
        strict_1.default.equal((0, http_url_js_1.normalizeHttpBaseUrl)(' https://Example.test:8443/api/// '), 'https://example.test:8443/api');
        strict_1.default.equal((0, http_url_js_1.normalizeHttpBaseUrl)('http://[::1]:11434/'), 'http://[::1]:11434');
    });
    (0, node_test_1.test)('rejects unsupported, credentialed, relative, and ambiguous URLs', () => {
        for (const candidate of [
            '',
            '/api',
            'file:///tmp/socket',
            'ftp://example.test/models',
            'http://user:secret@example.test',
            'https://example.test/api?token=secret',
            'https://example.test/api#fragment',
            'http://example.test/\nheader'
        ]) {
            strict_1.default.throws(() => (0, http_url_js_1.normalizeHttpBaseUrl)(candidate), TypeError, candidate);
        }
    });
    (0, node_test_1.test)('all adapters apply the shared validator to custom endpoints', () => {
        const constructors = [index_js_1.OllamaAdapter, index_js_1.VLLMAdapter, index_js_1.LMStudioAdapter, index_js_1.ComfyUIAdapter, index_js_1.WhisperAdapter];
        for (const Adapter of constructors) {
            const adapter = new Adapter({ endpoint: 'https://models.example.test/api///' });
            strict_1.default.equal(adapter.endpoint, 'https://models.example.test/api');
            strict_1.default.throws(() => new Adapter({ endpoint: 'file:///tmp/adapter.sock' }), TypeError);
            strict_1.default.throws(() => new Adapter({ endpoint: 'https://user:secret@models.example.test' }), TypeError);
        }
    });
});
//# sourceMappingURL=http-url.test.js.map
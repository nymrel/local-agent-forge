"use strict";
/**
 * Test Suite: Local AI Adapters & Registry
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const index_js_1 = require("../src/adapters/index.js");
(0, node_test_1.describe)('Local AI Inference Adapters', () => {
    (0, node_test_1.test)('OllamaAdapter default configuration and endpoint', () => {
        const adapter = new index_js_1.OllamaAdapter();
        node_assert_1.default.strictEqual(adapter.type, 'ollama');
        node_assert_1.default.strictEqual(adapter.endpoint, 'http://127.0.0.1:11434');
        node_assert_1.default.strictEqual(adapter.defaultModel, 'qwen2.5-coder:7b');
    });
    (0, node_test_1.test)('VLLMAdapter default configuration and OpenAI endpoint', () => {
        const adapter = new index_js_1.VLLMAdapter();
        node_assert_1.default.strictEqual(adapter.type, 'vllm');
        node_assert_1.default.strictEqual(adapter.endpoint, 'http://127.0.0.1:8000');
        node_assert_1.default.strictEqual(adapter.defaultModel, 'meta-llama/Llama-3.3-70B-Instruct');
    });
    (0, node_test_1.test)('LMStudioAdapter default configuration', () => {
        const adapter = new index_js_1.LMStudioAdapter();
        node_assert_1.default.strictEqual(adapter.type, 'lmstudio');
        node_assert_1.default.strictEqual(adapter.endpoint, 'http://127.0.0.1:1234');
    });
    (0, node_test_1.test)('ComfyUIAdapter default configuration and workflow generation', () => {
        const adapter = new index_js_1.ComfyUIAdapter();
        node_assert_1.default.strictEqual(adapter.type, 'comfyui');
        node_assert_1.default.strictEqual(adapter.endpoint, 'http://127.0.0.1:8188');
        const workflow = adapter.buildDefaultTxt2ImgWorkflow({
            prompt: 'A sleek futuristic terminal UI in amber and slate',
            width: 768,
            height: 768,
            steps: 25
        });
        node_assert_1.default.ok(workflow['3'], 'Should contain KSampler node');
        node_assert_1.default.strictEqual(workflow['3'].inputs.steps, 25);
        node_assert_1.default.strictEqual(workflow['5'].inputs.width, 768);
        node_assert_1.default.strictEqual(workflow['6'].inputs.text, 'A sleek futuristic terminal UI in amber and slate');
    });
    (0, node_test_1.test)('WhisperAdapter default configuration', () => {
        const adapter = new index_js_1.WhisperAdapter();
        node_assert_1.default.strictEqual(adapter.type, 'whisper');
        node_assert_1.default.strictEqual(adapter.endpoint, 'http://127.0.0.1:8080');
    });
    (0, node_test_1.test)('AdapterRegistry probes all 5 local endpoints gracefully when offline', async () => {
        const registry = new index_js_1.AdapterRegistry();
        const health = await registry.probeAll();
        node_assert_1.default.ok(health.ollama, 'Ollama health probed');
        node_assert_1.default.ok(health.vllm, 'vLLM health probed');
        node_assert_1.default.ok(health.lmstudio, 'LM Studio health probed');
        node_assert_1.default.ok(health.comfyui, 'ComfyUI health probed');
        node_assert_1.default.ok(health.whisper, 'Whisper health probed');
        // Health objects should have correct types and non-throwing error handling
        node_assert_1.default.strictEqual(typeof health.ollama.connected, 'boolean');
        node_assert_1.default.strictEqual(typeof health.ollama.latencyMs, 'number');
    });
});
//# sourceMappingURL=adapters.test.js.map
/**
 * Test Suite: Local AI Adapters & Registry
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  OllamaAdapter,
  VLLMAdapter,
  LMStudioAdapter,
  ComfyUIAdapter,
  WhisperAdapter,
  AdapterRegistry
} from '../src/adapters/index.js';

describe('Local AI Inference Adapters', () => {
  test('OllamaAdapter default configuration and endpoint', () => {
    const adapter = new OllamaAdapter();
    assert.strictEqual(adapter.type, 'ollama');
    assert.strictEqual(adapter.endpoint, 'http://127.0.0.1:11434');
    assert.strictEqual(adapter.defaultModel, 'qwen2.5-coder:7b');
  });

  test('VLLMAdapter default configuration and OpenAI endpoint', () => {
    const adapter = new VLLMAdapter();
    assert.strictEqual(adapter.type, 'vllm');
    assert.strictEqual(adapter.endpoint, 'http://127.0.0.1:8000');
    assert.strictEqual(adapter.defaultModel, 'meta-llama/Llama-3.3-70B-Instruct');
  });

  test('LMStudioAdapter default configuration', () => {
    const adapter = new LMStudioAdapter();
    assert.strictEqual(adapter.type, 'lmstudio');
    assert.strictEqual(adapter.endpoint, 'http://127.0.0.1:1234');
  });

  test('ComfyUIAdapter default configuration and workflow generation', () => {
    const adapter = new ComfyUIAdapter();
    assert.strictEqual(adapter.type, 'comfyui');
    assert.strictEqual(adapter.endpoint, 'http://127.0.0.1:8188');

    const workflow = adapter.buildDefaultTxt2ImgWorkflow({
      prompt: 'A sleek futuristic terminal UI in amber and slate',
      width: 768,
      height: 768,
      steps: 25
    });

    assert.ok(workflow['3'], 'Should contain KSampler node');
    assert.strictEqual(workflow['3'].inputs.steps, 25);
    assert.strictEqual(workflow['5'].inputs.width, 768);
    assert.strictEqual(workflow['6'].inputs.text, 'A sleek futuristic terminal UI in amber and slate');
  });

  test('WhisperAdapter default configuration', () => {
    const adapter = new WhisperAdapter();
    assert.strictEqual(adapter.type, 'whisper');
    assert.strictEqual(adapter.endpoint, 'http://127.0.0.1:8080');
  });

  test('AdapterRegistry probes all 5 local endpoints gracefully when offline', async () => {
    const registry = new AdapterRegistry();
    const health = await registry.probeAll();

    assert.ok(health.ollama, 'Ollama health probed');
    assert.ok(health.vllm, 'vLLM health probed');
    assert.ok(health.lmstudio, 'LM Studio health probed');
    assert.ok(health.comfyui, 'ComfyUI health probed');
    assert.ok(health.whisper, 'Whisper health probed');

    // Health objects should have correct types and non-throwing error handling
    assert.strictEqual(typeof health.ollama.connected, 'boolean');
    assert.strictEqual(typeof health.ollama.latencyMs, 'number');
  });
});

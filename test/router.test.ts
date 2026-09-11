/**
 * Test Suite: Dynamic Model Router & Heuristic Classifier
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  TaskClassifier,
  LocalAgentRouter,
  TaskComplexity,
  REASONING_ESCALATION_THRESHOLD
} from '../src/router/index.js';
import { AdapterRegistry } from '../src/adapters/index.js';
import { ModelAdapter, AdapterHealth, CompletionResult } from '../src/adapters/base.js';

describe('Dynamic Model Router & Classifier', () => {
  const classifier = new TaskClassifier();

  test('Classifies formatting and linting as TRIVIAL/ROUTINE (< 0.50 score)', () => {
    const res = classifier.classify('Format this JSON data and add proper indentation and linting');
    assert.ok(res.score < 0.50, `Score ${res.score} should be < 0.50`);
    assert.ok(res.score <= REASONING_ESCALATION_THRESHOLD, 'Should not exceed escalation threshold');
    assert.ok(res.triggers.some(t => t.includes('formatting') || t.includes('data_serialization')));
  });

  test('Classifies unit tests and docstrings within local GPU envelope (<= 0.85)', () => {
    const res = classifier.classify('Generate Jest unit tests and docstrings for this authentication helper function');
    assert.ok(res.score <= REASONING_ESCALATION_THRESHOLD, `Score ${res.score} should be <= 0.85`);
    assert.strictEqual(res.recommendedCloudModel, 'gpt-4o-mini');
  });

  test('Classifies formal verification and theorem proving as FRONTIER_REASONING (> 0.85)', () => {
    const res = classifier.classify('Write a formal verification proof in Lean 4 for distributed consensus correctness');
    assert.ok(res.score > REASONING_ESCALATION_THRESHOLD, `Score ${res.score} should exceed 0.85`);
    assert.strictEqual(res.complexity, TaskComplexity.FRONTIER_REASONING);
    assert.strictEqual(res.recommendedCloudModel, 'claude-3-5-sonnet');
    assert.ok(res.triggers.some(t => t.startsWith('high:')));
  });

  test('Classifies novel cryptographic protocols as FRONTIER_REASONING (> 0.85)', () => {
    const res = classifier.classify('Design a novel cryptographic protocol with zero-knowledge proofs and elliptic curve mathematics');
    assert.ok(res.score > REASONING_ESCALATION_THRESHOLD, `Score ${res.score} should exceed 0.85`);
    assert.strictEqual(res.complexity, TaskComplexity.FRONTIER_REASONING);
  });

  test('Router escalates high-complexity task (> 0.85) to Cloud Frontier', async () => {
    const router = new LocalAgentRouter();
    const prompt = 'Prove mathematical theorem for Byzantine fault tolerance using formal verification and category theory';
    const decision = await router.evaluate(prompt);

    assert.strictEqual(decision.route, 'CLOUD');
    assert.strictEqual(decision.cloudEscalated, true);
    assert.ok(decision.complexityScore > REASONING_ESCALATION_THRESHOLD);
    assert.strictEqual(decision.reasoningThreshold, 0.85);
  });

  test('Router falls back to Cloud when local inference engines are offline', async () => {
    const router = new LocalAgentRouter();
    const prompt = 'Create a simple TypeScript interface for a User profile';
    const decision = await router.evaluate(prompt);

    // If local servers are offline, it marks cloudEscalated due to offline adapters
    if (decision.route === 'CLOUD') {
      assert.strictEqual(decision.cloudEscalated, true);
      assert.ok(decision.triggers.includes('fallback:no_local_servers_online'));
    } else {
      assert.strictEqual(decision.route, 'LOCAL');
    }
  });

  test('Router respects forceCloud override', async () => {
    const router = new LocalAgentRouter({ forceCloud: true });
    const decision = await router.evaluate('Simple test prompt');

    assert.strictEqual(decision.route, 'CLOUD');
    assert.strictEqual(decision.cloudEscalated, true);
  });
});

describe('ExecutionReceipt truthful outcome contract', () => {
  const OFFLINE_HEALTH: AdapterHealth = {
    connected: false,
    type: 'ollama',
    endpoint: 'http://localhost:11434',
    latencyMs: 0,
    availableModels: []
  };

  /** Build a no-network adapter whose generate() succeeds or fails on demand. */
  function stubAdapter(
    health: AdapterHealth,
    generate?: (prompt: string) => Promise<CompletionResult>
  ): ModelAdapter {
    return {
      type: 'ollama',
      defaultEndpoint: 'http://localhost:11434',
      endpoint: 'http://localhost:11434',
      checkHealth: async () => health,
      listModels: async () => [],
      generate:
        generate ??
        (async () => {
          throw new Error('generate() not configured in stub');
        }),
      chat: async () => {
        throw new Error('chat() not configured in stub');
      }
    };
  }

  function stubRegistry(
    adapter: ModelAdapter,
    offlineAdapter: ModelAdapter
  ): AdapterRegistry {
    return {
      ollama: adapter,
      vllm: offlineAdapter,
      lmstudio: offlineAdapter,
      comfyui: offlineAdapter,
      whisper: offlineAdapter,
      probeAll: async () => ({
        ollama: await adapter.checkHealth(),
        vllm: OFFLINE_HEALTH,
        lmstudio: OFFLINE_HEALTH,
        comfyui: OFFLINE_HEALTH,
        whisper: OFFLINE_HEALTH
      })
    } as unknown as AdapterRegistry;
  }

  test('Local adapter success reports completed with no blocker', async () => {
    const okAdapter = stubAdapter(
      { connected: true, type: 'ollama', endpoint: 'http://localhost:11434', latencyMs: 1, availableModels: ['qwen2.5-coder:7b'] },
      async (prompt) => ({
        text: `local-answer:${prompt.length}`,
        model: 'qwen2.5-coder:7b',
        adapter: 'ollama',
        promptTokens: 5,
        completionTokens: 7,
        totalTokens: 12,
        durationMs: 20,
        tokensPerSecond: 350
      })
    );
    const router = new LocalAgentRouter({ adapters: stubRegistry(okAdapter, stubAdapter(OFFLINE_HEALTH)) });
    const receipt = await router.execute('Create a simple TypeScript interface for a User profile');

    assert.strictEqual(receipt.decision.route, 'LOCAL');
    assert.strictEqual(receipt.outcome, 'completed');
    assert.strictEqual(receipt.blocker, undefined);
    assert.ok(receipt.text.startsWith('local-answer:'), 'adapter response text is surfaced verbatim');
    assert.ok(receipt.timestamp, 'ledger transaction still recorded');
  });

  test('Local adapter failure reports blocked with actionable blocker', async () => {
    const failingAdapter = stubAdapter(
      { connected: true, type: 'ollama', endpoint: 'http://localhost:11434', latencyMs: 1, availableModels: ['qwen2.5-coder:7b'] },
      async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:11434');
      }
    );
    const router = new LocalAgentRouter({ adapters: stubRegistry(failingAdapter, stubAdapter(OFFLINE_HEALTH)) });
    const receipt = await router.execute('Create a simple TypeScript interface for a User profile');

    assert.strictEqual(receipt.decision.route, 'LOCAL');
    assert.strictEqual(receipt.outcome, 'blocked');
    assert.strictEqual(receipt.blocker?.code, 'LOCAL_ADAPTER_EXECUTION_FAILED');
    assert.ok(receipt.blocker?.message.includes('ECONNREFUSED'), 'blocker message carries the engine error');
    assert.ok(receipt.blocker?.message.includes('ollama'), 'blocker message names the adapter');
    // Backward-compatible placeholder text is retained, but never as a completion.
    assert.ok(receipt.text.includes('Local Forge Offline Execution Fallback'));
    assert.ok(receipt.timestamp, 'ledger transaction still recorded');
  });

  test('Cloud handler success reports completed', async () => {
    const router = new LocalAgentRouter({
      forceCloud: true,
      adapters: stubRegistry(stubAdapter(OFFLINE_HEALTH), stubAdapter(OFFLINE_HEALTH))
    });
    const receipt = await router.execute('Simple test prompt', {
      cloudFallbackHandler: async (prompt, model) => `cloud-answer:${model}:${prompt.length}`
    });

    assert.strictEqual(receipt.decision.route, 'CLOUD');
    assert.strictEqual(receipt.outcome, 'completed');
    assert.strictEqual(receipt.blocker, undefined);
    assert.ok(receipt.text.startsWith('cloud-answer:'));
  });

  test('Cloud decision without handler reports blocked with reroute guidance', async () => {
    const router = new LocalAgentRouter({
      forceCloud: true,
      adapters: stubRegistry(stubAdapter(OFFLINE_HEALTH), stubAdapter(OFFLINE_HEALTH))
    });
    const receipt = await router.execute('Simple test prompt');

    assert.strictEqual(receipt.decision.route, 'CLOUD');
    assert.strictEqual(receipt.outcome, 'blocked');
    assert.strictEqual(receipt.blocker?.code, 'CLOUD_FALLBACK_HANDLER_MISSING');
    assert.ok(receipt.blocker?.message.includes(receipt.modelUsed), 'blocker names the target cloud model');
    assert.ok(receipt.blocker?.message.includes('cloudFallbackHandler'), 'blocker tells the caller how to proceed');
    assert.ok(receipt.text.includes('Cloud Frontier Escalation'));
    assert.ok(receipt.timestamp, 'ledger transaction still recorded');
  });
});

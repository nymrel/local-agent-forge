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

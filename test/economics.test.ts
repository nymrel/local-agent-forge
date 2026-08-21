/**
 * Test Suite: Token Economics & Financial Savings Ledger
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  TokenLedger,
  CLOUD_BASELINES,
  calculateCost
} from '../src/economics/index.js';

describe('Token Economics Ledger', () => {
  test('calculateCost computes accurate pricing per million tokens', () => {
    const sonnet = CLOUD_BASELINES['claude-3-5-sonnet'];
    // 10,000 prompt ($0.03) + 2,000 comp ($0.03) = $0.06
    const cost = calculateCost(10000, 2000, sonnet);
    assert.strictEqual(cost, 0.06);

    const local = CLOUD_BASELINES['local-gpu'];
    const localCost = calculateCost(10000, 2000, local);
    assert.strictEqual(localCost, 0);
  });

  test('TokenLedger records local transactions and computes positive dollar savings', () => {
    const ledger = new TokenLedger('claude-3-5-sonnet');

    const tx = ledger.record({
      taskType: 'code_gen',
      model: 'qwen2.5-coder:7b',
      isLocal: true,
      adapter: 'ollama',
      promptTokens: 5000,
      completionTokens: 1000,
      durationMs: 450
    });

    assert.strictEqual(tx.isLocal, true);
    assert.strictEqual(tx.actualCost, 0);
    // Baseline Claude 3.5 Sonnet: 5000 * $3/M = $0.015, 1000 * $15/M = $0.015. Total = $0.03
    assert.strictEqual(tx.baselineCost, 0.03);
    assert.strictEqual(tx.savedDollars, 0.03);
  });

  test('TokenLedger generates comprehensive summary metrics', () => {
    const ledger = new TokenLedger('claude-3-5-sonnet');

    // Record 3 local transactions and 1 cloud transaction
    ledger.record({ model: 'qwen2.5-coder:7b', isLocal: true, promptTokens: 1000, completionTokens: 500, durationMs: 200, tokensPerSecond: 50 });
    ledger.record({ model: 'qwen2.5-coder:14b', isLocal: true, promptTokens: 2000, completionTokens: 1000, durationMs: 400, tokensPerSecond: 40 });
    ledger.record({ model: 'deepseek-r1:14b', isLocal: true, promptTokens: 3000, completionTokens: 1500, durationMs: 600, tokensPerSecond: 30 });
    ledger.record({ model: 'claude-3-5-sonnet', isLocal: false, promptTokens: 5000, completionTokens: 2000, durationMs: 1200, tokensPerSecond: 25 });

    const summary = ledger.getSummary();
    assert.strictEqual(summary.totalRequests, 4);
    assert.strictEqual(summary.localRequests, 3);
    assert.strictEqual(summary.cloudRequests, 1);
    assert.strictEqual(summary.localComputeRatioPercent, 75);
    assert.strictEqual(summary.totalPromptTokens, 11000);
    assert.strictEqual(summary.totalCompletionTokens, 5000);
    assert.strictEqual(summary.totalTokens, 16000);
    assert.ok(summary.totalSavingsDollars > 0, 'Total savings should be positive');
  });

  test('TokenLedger exports ASCII dashboard and JSON roundtrip', () => {
    const ledger = new TokenLedger();
    ledger.record({ model: 'qwen2.5-coder:7b', isLocal: true, promptTokens: 500, completionTokens: 250, durationMs: 100 });

    const dashboard = ledger.formatAsciiDashboard();
    assert.ok(dashboard.includes('LOCAL AGENT FORGE - TOKEN ECONOMICS LEDGER'));
    assert.ok(dashboard.includes('NET DOLLARS SAVED'));

    const jsonStr = ledger.exportJson();
    const newLedger = new TokenLedger();
    newLedger.importJson(jsonStr);

    assert.strictEqual(newLedger.getTransactions().length, 1);
    assert.strictEqual(newLedger.getTransactions()[0].model, 'qwen2.5-coder:7b');
  });
});

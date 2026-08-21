"use strict";
/**
 * Test Suite: Token Economics & Financial Savings Ledger
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const index_js_1 = require("../src/economics/index.js");
(0, node_test_1.describe)('Token Economics Ledger', () => {
    (0, node_test_1.test)('calculateCost computes accurate pricing per million tokens', () => {
        const sonnet = index_js_1.CLOUD_BASELINES['claude-3-5-sonnet'];
        // 10,000 prompt ($0.03) + 2,000 comp ($0.03) = $0.06
        const cost = (0, index_js_1.calculateCost)(10000, 2000, sonnet);
        node_assert_1.default.strictEqual(cost, 0.06);
        const local = index_js_1.CLOUD_BASELINES['local-gpu'];
        const localCost = (0, index_js_1.calculateCost)(10000, 2000, local);
        node_assert_1.default.strictEqual(localCost, 0);
    });
    (0, node_test_1.test)('TokenLedger records local transactions and computes positive dollar savings', () => {
        const ledger = new index_js_1.TokenLedger('claude-3-5-sonnet');
        const tx = ledger.record({
            taskType: 'code_gen',
            model: 'qwen2.5-coder:7b',
            isLocal: true,
            adapter: 'ollama',
            promptTokens: 5000,
            completionTokens: 1000,
            durationMs: 450
        });
        node_assert_1.default.strictEqual(tx.isLocal, true);
        node_assert_1.default.strictEqual(tx.actualCost, 0);
        // Baseline Claude 3.5 Sonnet: 5000 * $3/M = $0.015, 1000 * $15/M = $0.015. Total = $0.03
        node_assert_1.default.strictEqual(tx.baselineCost, 0.03);
        node_assert_1.default.strictEqual(tx.savedDollars, 0.03);
    });
    (0, node_test_1.test)('TokenLedger generates comprehensive summary metrics', () => {
        const ledger = new index_js_1.TokenLedger('claude-3-5-sonnet');
        // Record 3 local transactions and 1 cloud transaction
        ledger.record({ model: 'qwen2.5-coder:7b', isLocal: true, promptTokens: 1000, completionTokens: 500, durationMs: 200, tokensPerSecond: 50 });
        ledger.record({ model: 'qwen2.5-coder:14b', isLocal: true, promptTokens: 2000, completionTokens: 1000, durationMs: 400, tokensPerSecond: 40 });
        ledger.record({ model: 'deepseek-r1:14b', isLocal: true, promptTokens: 3000, completionTokens: 1500, durationMs: 600, tokensPerSecond: 30 });
        ledger.record({ model: 'claude-3-5-sonnet', isLocal: false, promptTokens: 5000, completionTokens: 2000, durationMs: 1200, tokensPerSecond: 25 });
        const summary = ledger.getSummary();
        node_assert_1.default.strictEqual(summary.totalRequests, 4);
        node_assert_1.default.strictEqual(summary.localRequests, 3);
        node_assert_1.default.strictEqual(summary.cloudRequests, 1);
        node_assert_1.default.strictEqual(summary.localComputeRatioPercent, 75);
        node_assert_1.default.strictEqual(summary.totalPromptTokens, 11000);
        node_assert_1.default.strictEqual(summary.totalCompletionTokens, 5000);
        node_assert_1.default.strictEqual(summary.totalTokens, 16000);
        node_assert_1.default.ok(summary.totalSavingsDollars > 0, 'Total savings should be positive');
    });
    (0, node_test_1.test)('TokenLedger exports ASCII dashboard and JSON roundtrip', () => {
        const ledger = new index_js_1.TokenLedger();
        ledger.record({ model: 'qwen2.5-coder:7b', isLocal: true, promptTokens: 500, completionTokens: 250, durationMs: 100 });
        const dashboard = ledger.formatAsciiDashboard();
        node_assert_1.default.ok(dashboard.includes('LOCAL AGENT FORGE - TOKEN ECONOMICS LEDGER'));
        node_assert_1.default.ok(dashboard.includes('NET DOLLARS SAVED'));
        const jsonStr = ledger.exportJson();
        const newLedger = new index_js_1.TokenLedger();
        newLedger.importJson(jsonStr);
        node_assert_1.default.strictEqual(newLedger.getTransactions().length, 1);
        node_assert_1.default.strictEqual(newLedger.getTransactions()[0].model, 'qwen2.5-coder:7b');
    });
});
//# sourceMappingURL=economics.test.js.map
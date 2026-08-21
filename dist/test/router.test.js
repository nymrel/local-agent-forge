"use strict";
/**
 * Test Suite: Dynamic Model Router & Heuristic Classifier
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const index_js_1 = require("../src/router/index.js");
(0, node_test_1.describe)('Dynamic Model Router & Classifier', () => {
    const classifier = new index_js_1.TaskClassifier();
    (0, node_test_1.test)('Classifies formatting and linting as TRIVIAL/ROUTINE (< 0.50 score)', () => {
        const res = classifier.classify('Format this JSON data and add proper indentation and linting');
        node_assert_1.default.ok(res.score < 0.50, `Score ${res.score} should be < 0.50`);
        node_assert_1.default.ok(res.score <= index_js_1.REASONING_ESCALATION_THRESHOLD, 'Should not exceed escalation threshold');
        node_assert_1.default.ok(res.triggers.some(t => t.includes('formatting') || t.includes('data_serialization')));
    });
    (0, node_test_1.test)('Classifies unit tests and docstrings within local GPU envelope (<= 0.85)', () => {
        const res = classifier.classify('Generate Jest unit tests and docstrings for this authentication helper function');
        node_assert_1.default.ok(res.score <= index_js_1.REASONING_ESCALATION_THRESHOLD, `Score ${res.score} should be <= 0.85`);
        node_assert_1.default.strictEqual(res.recommendedCloudModel, 'gpt-4o-mini');
    });
    (0, node_test_1.test)('Classifies formal verification and theorem proving as FRONTIER_REASONING (> 0.85)', () => {
        const res = classifier.classify('Write a formal verification proof in Lean 4 for distributed consensus correctness');
        node_assert_1.default.ok(res.score > index_js_1.REASONING_ESCALATION_THRESHOLD, `Score ${res.score} should exceed 0.85`);
        node_assert_1.default.strictEqual(res.complexity, index_js_1.TaskComplexity.FRONTIER_REASONING);
        node_assert_1.default.strictEqual(res.recommendedCloudModel, 'claude-3-5-sonnet');
        node_assert_1.default.ok(res.triggers.some(t => t.startsWith('high:')));
    });
    (0, node_test_1.test)('Classifies novel cryptographic protocols as FRONTIER_REASONING (> 0.85)', () => {
        const res = classifier.classify('Design a novel cryptographic protocol with zero-knowledge proofs and elliptic curve mathematics');
        node_assert_1.default.ok(res.score > index_js_1.REASONING_ESCALATION_THRESHOLD, `Score ${res.score} should exceed 0.85`);
        node_assert_1.default.strictEqual(res.complexity, index_js_1.TaskComplexity.FRONTIER_REASONING);
    });
    (0, node_test_1.test)('Router escalates high-complexity task (> 0.85) to Cloud Frontier', async () => {
        const router = new index_js_1.LocalAgentRouter();
        const prompt = 'Prove mathematical theorem for Byzantine fault tolerance using formal verification and category theory';
        const decision = await router.evaluate(prompt);
        node_assert_1.default.strictEqual(decision.route, 'CLOUD');
        node_assert_1.default.strictEqual(decision.cloudEscalated, true);
        node_assert_1.default.ok(decision.complexityScore > index_js_1.REASONING_ESCALATION_THRESHOLD);
        node_assert_1.default.strictEqual(decision.reasoningThreshold, 0.85);
    });
    (0, node_test_1.test)('Router falls back to Cloud when local inference engines are offline', async () => {
        const router = new index_js_1.LocalAgentRouter();
        const prompt = 'Create a simple TypeScript interface for a User profile';
        const decision = await router.evaluate(prompt);
        // If local servers are offline, it marks cloudEscalated due to offline adapters
        if (decision.route === 'CLOUD') {
            node_assert_1.default.strictEqual(decision.cloudEscalated, true);
            node_assert_1.default.ok(decision.triggers.includes('fallback:no_local_servers_online'));
        }
        else {
            node_assert_1.default.strictEqual(decision.route, 'LOCAL');
        }
    });
    (0, node_test_1.test)('Router respects forceCloud override', async () => {
        const router = new index_js_1.LocalAgentRouter({ forceCloud: true });
        const decision = await router.evaluate('Simple test prompt');
        node_assert_1.default.strictEqual(decision.route, 'CLOUD');
        node_assert_1.default.strictEqual(decision.cloudEscalated, true);
    });
});
//# sourceMappingURL=router.test.js.map
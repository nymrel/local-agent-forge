"use strict";
/**
 * Local Agent Dynamic Model Router
 * Routes routine tasks to local GPU ($0) and only escalates to cloud when complexity > 85%
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalAgentRouter = void 0;
const index_js_1 = require("../adapters/index.js");
const ledger_js_1 = require("../economics/ledger.js");
const baselines_js_1 = require("../economics/baselines.js");
const classifier_js_1 = require("./classifier.js");
const registry_js_1 = require("./registry.js");
const types_js_1 = require("./types.js");
class LocalAgentRouter {
    adapters;
    ledger;
    classifier;
    defaultCloudModel;
    forceLocal;
    forceCloud;
    constructor(config = {}) {
        this.adapters = config.adapters || new index_js_1.AdapterRegistry();
        this.ledger = config.ledger || new ledger_js_1.TokenLedger();
        this.classifier = config.classifier || new classifier_js_1.TaskClassifier();
        this.defaultCloudModel = config.defaultCloudModel || baselines_js_1.DEFAULT_BASELINE_MODEL;
        this.forceLocal = config.forceLocal ?? false;
        this.forceCloud = config.forceCloud ?? false;
    }
    async evaluate(prompt, context) {
        const classification = this.classifier.classify(prompt, context);
        const health = await this.adapters.probeAll();
        // Check LLM adapters in priority order: Ollama -> vLLM -> LM Studio
        let activeAdapter = null;
        let availableModels = [];
        if (health.ollama.connected) {
            activeAdapter = this.adapters.ollama;
            availableModels = health.ollama.availableModels;
        }
        else if (health.vllm.connected) {
            activeAdapter = this.adapters.vllm;
            availableModels = health.vllm.availableModels;
        }
        else if (health.lmstudio.connected) {
            activeAdapter = this.adapters.lmstudio;
            availableModels = health.lmstudio.availableModels;
        }
        const estPromptTokens = classification.estimatedPromptTokens;
        const estCompTokens = classification.estimatedCompletionTokens;
        const baselinePricing = this.ledger.getBaselineModel();
        const estDollarSavings = (0, baselines_js_1.calculateCost)(estPromptTokens, estCompTokens, baselinePricing);
        // Rule 1: User forced Cloud
        if (this.forceCloud) {
            return {
                route: 'CLOUD',
                targetModel: this.defaultCloudModel,
                adapterType: 'cloud_frontier',
                endpoint: 'https://api.anthropic.com/v1',
                complexityScore: classification.score,
                reasoningThreshold: types_js_1.REASONING_ESCALATION_THRESHOLD,
                taskComplexity: classification.complexity,
                taskCategory: classification.taskCategory,
                rationale: 'Cloud execution manually forced by operator flag.',
                triggers: [...classification.triggers, 'override:force_cloud'],
                cloudEscalated: true,
                escalationReason: 'Manual operator override',
                estimatedTokens: {
                    prompt: estPromptTokens,
                    completion: estCompTokens,
                    total: estPromptTokens + estCompTokens
                },
                estimatedDollarsSaved: 0
            };
        }
        // Rule 2: Complexity > 85% (Reasoning Escalation)
        if (!this.forceLocal && classification.score > types_js_1.REASONING_ESCALATION_THRESHOLD) {
            return {
                route: 'CLOUD',
                targetModel: classification.recommendedCloudModel || this.defaultCloudModel,
                adapterType: 'cloud_frontier',
                endpoint: 'https://api.anthropic.com/v1',
                complexityScore: classification.score,
                reasoningThreshold: types_js_1.REASONING_ESCALATION_THRESHOLD,
                taskComplexity: classification.complexity,
                taskCategory: classification.taskCategory,
                rationale: classification.rationale,
                triggers: classification.triggers,
                cloudEscalated: true,
                escalationReason: `Reasoning complexity score (${classification.score}) exceeds ${types_js_1.REASONING_ESCALATION_THRESHOLD * 100}% threshold`,
                estimatedTokens: {
                    prompt: estPromptTokens,
                    completion: estCompTokens,
                    total: estPromptTokens + estCompTokens
                },
                estimatedDollarsSaved: 0
            };
        }
        // Rule 3: Routine / Local Complexity (<= 85%) - Check Local Server Availability
        if (activeAdapter) {
            const selectedModel = context?.preferredModel || (0, registry_js_1.getBestLocalModelForTask)(classification.taskCategory, availableModels);
            return {
                route: 'LOCAL',
                targetModel: selectedModel,
                adapterType: activeAdapter.type,
                endpoint: activeAdapter.endpoint,
                complexityScore: classification.score,
                reasoningThreshold: types_js_1.REASONING_ESCALATION_THRESHOLD,
                taskComplexity: classification.complexity,
                taskCategory: classification.taskCategory,
                rationale: classification.rationale,
                triggers: classification.triggers,
                cloudEscalated: false,
                estimatedTokens: {
                    prompt: estPromptTokens,
                    completion: estCompTokens,
                    total: estPromptTokens + estCompTokens
                },
                estimatedDollarsSaved: estDollarSavings
            };
        }
        // Rule 4: Local complexity (<=85%), but no local adapter connected -> Fallback escalation to Cloud
        return {
            route: 'CLOUD',
            targetModel: this.defaultCloudModel,
            adapterType: 'cloud_frontier',
            endpoint: 'https://api.anthropic.com/v1',
            complexityScore: classification.score,
            reasoningThreshold: types_js_1.REASONING_ESCALATION_THRESHOLD,
            taskComplexity: classification.complexity,
            taskCategory: classification.taskCategory,
            rationale: `Task is suitable for local GPU ($0), but all local inference engines (Ollama, vLLM, LM Studio) are currently offline. Escalating to cloud.`,
            triggers: [...classification.triggers, 'fallback:no_local_servers_online'],
            cloudEscalated: true,
            escalationReason: 'No local AI inference engines reachable on localhost',
            estimatedTokens: {
                prompt: estPromptTokens,
                completion: estCompTokens,
                total: estPromptTokens + estCompTokens
            },
            estimatedDollarsSaved: 0
        };
    }
    async execute(prompt, options = {}) {
        const start = Date.now();
        const decision = await this.evaluate(prompt, { preferredModel: options.preferredModel });
        let responseText = '';
        let promptTokens = decision.estimatedTokens.prompt;
        let completionTokens = decision.estimatedTokens.completion;
        let durationMs = 0;
        let tokensPerSecond = 0;
        let modelUsed = decision.targetModel;
        let adapterUsed = decision.adapterType;
        const isLocal = decision.route === 'LOCAL';
        if (decision.route === 'LOCAL') {
            let adapter = null;
            if (decision.adapterType === 'ollama')
                adapter = this.adapters.ollama;
            else if (decision.adapterType === 'vllm')
                adapter = this.adapters.vllm;
            else if (decision.adapterType === 'lmstudio')
                adapter = this.adapters.lmstudio;
            if (adapter) {
                try {
                    const comp = await adapter.generate(prompt, {
                        model: decision.targetModel,
                        systemPrompt: options.systemPrompt,
                        temperature: options.temperature,
                        maxTokens: options.maxTokens
                    });
                    responseText = comp.text;
                    promptTokens = comp.promptTokens;
                    completionTokens = comp.completionTokens;
                    durationMs = comp.durationMs;
                    tokensPerSecond = comp.tokensPerSecond;
                    modelUsed = comp.model;
                }
                catch (err) {
                    // Local execution error fallback simulation
                    durationMs = Date.now() - start;
                    responseText = `[Local Forge Offline Execution Fallback: ${err.message}]`;
                }
            }
        }
        else {
            // Cloud Execution Path
            if (options.cloudFallbackHandler) {
                responseText = await options.cloudFallbackHandler(prompt, decision.targetModel);
            }
            else {
                responseText = `[Cloud Frontier Escalation (${decision.targetModel}): ${decision.escalationReason || 'High Reasoning'}]`;
            }
            durationMs = Date.now() - start;
            completionTokens = Math.ceil(responseText.length / 4);
            tokensPerSecond = durationMs > 0 ? completionTokens / (durationMs / 1000) : 0;
        }
        // Record in Token Economics Ledger
        const tx = this.ledger.record({
            taskType: decision.taskCategory,
            model: modelUsed,
            isLocal,
            adapter: adapterUsed,
            promptTokens,
            completionTokens,
            durationMs,
            tokensPerSecond
        });
        return {
            decision,
            text: responseText,
            modelUsed,
            adapterUsed,
            isLocal,
            actualTokens: {
                prompt: promptTokens,
                completion: completionTokens,
                total: promptTokens + completionTokens
            },
            durationMs,
            tokensPerSecond: Math.round(tokensPerSecond * 10) / 10,
            actualCost: tx.actualCost,
            hypotheticalBaselineCost: tx.baselineCost,
            dollarSavings: tx.savedDollars,
            timestamp: tx.timestamp
        };
    }
}
exports.LocalAgentRouter = LocalAgentRouter;
//# sourceMappingURL=router.js.map
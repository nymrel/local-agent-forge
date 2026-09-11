/**
 * Local Agent Dynamic Model Router
 * Routes routine tasks to local GPU ($0) and only escalates to cloud when complexity > 85%
 */

import { AdapterRegistry } from '../adapters/index.js';
import { ModelAdapter, CompletionResult } from '../adapters/base.js';
import { TokenLedger } from '../economics/ledger.js';
import { calculateCost, CLOUD_BASELINES, DEFAULT_BASELINE_MODEL } from '../economics/baselines.js';
import { TaskClassifier } from './classifier.js';
import { getBestLocalModelForTask } from './registry.js';
import {
  RoutingDecision,
  ExecutionReceipt,
  ExecutionOutcome,
  ExecutionBlocker,
  REASONING_ESCALATION_THRESHOLD
} from './types.js';

export interface LocalAgentRouterConfig {
  adapters?: AdapterRegistry;
  ledger?: TokenLedger;
  classifier?: TaskClassifier;
  defaultCloudModel?: string;
  forceLocal?: boolean;
  forceCloud?: boolean;
}

export class LocalAgentRouter {
  readonly adapters: AdapterRegistry;
  readonly ledger: TokenLedger;
  readonly classifier: TaskClassifier;
  readonly defaultCloudModel: string;
  private forceLocal: boolean;
  private forceCloud: boolean;

  constructor(config: LocalAgentRouterConfig = {}) {
    this.adapters = config.adapters || new AdapterRegistry();
    this.ledger = config.ledger || new TokenLedger();
    this.classifier = config.classifier || new TaskClassifier();
    this.defaultCloudModel = config.defaultCloudModel || DEFAULT_BASELINE_MODEL;
    this.forceLocal = config.forceLocal ?? false;
    this.forceCloud = config.forceCloud ?? false;
  }

  async evaluate(
    prompt: string,
    context?: { fileCount?: number; historyLength?: number; preferredModel?: string }
  ): Promise<RoutingDecision> {
    const classification = this.classifier.classify(prompt, context);
    const health = await this.adapters.probeAll();

    // Check LLM adapters in priority order: Ollama -> vLLM -> LM Studio
    let activeAdapter: ModelAdapter | null = null;
    let availableModels: string[] = [];

    if (health.ollama.connected) {
      activeAdapter = this.adapters.ollama;
      availableModels = health.ollama.availableModels;
    } else if (health.vllm.connected) {
      activeAdapter = this.adapters.vllm;
      availableModels = health.vllm.availableModels;
    } else if (health.lmstudio.connected) {
      activeAdapter = this.adapters.lmstudio;
      availableModels = health.lmstudio.availableModels;
    }

    const estPromptTokens = classification.estimatedPromptTokens;
    const estCompTokens = classification.estimatedCompletionTokens;
    const baselinePricing = this.ledger.getBaselineModel();
    const estDollarSavings = calculateCost(estPromptTokens, estCompTokens, baselinePricing);

    // Rule 1: User forced Cloud
    if (this.forceCloud) {
      return {
        route: 'CLOUD',
        targetModel: this.defaultCloudModel,
        adapterType: 'cloud_frontier',
        endpoint: 'https://api.anthropic.com/v1',
        complexityScore: classification.score,
        reasoningThreshold: REASONING_ESCALATION_THRESHOLD,
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
    if (!this.forceLocal && classification.score > REASONING_ESCALATION_THRESHOLD) {
      return {
        route: 'CLOUD',
        targetModel: classification.recommendedCloudModel || this.defaultCloudModel,
        adapterType: 'cloud_frontier',
        endpoint: 'https://api.anthropic.com/v1',
        complexityScore: classification.score,
        reasoningThreshold: REASONING_ESCALATION_THRESHOLD,
        taskComplexity: classification.complexity,
        taskCategory: classification.taskCategory,
        rationale: classification.rationale,
        triggers: classification.triggers,
        cloudEscalated: true,
        escalationReason: `Reasoning complexity score (${classification.score}) exceeds ${REASONING_ESCALATION_THRESHOLD * 100}% threshold`,
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
      const selectedModel = context?.preferredModel || getBestLocalModelForTask(classification.taskCategory, availableModels);
      return {
        route: 'LOCAL',
        targetModel: selectedModel,
        adapterType: activeAdapter.type,
        endpoint: activeAdapter.endpoint,
        complexityScore: classification.score,
        reasoningThreshold: REASONING_ESCALATION_THRESHOLD,
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
      reasoningThreshold: REASONING_ESCALATION_THRESHOLD,
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

  async execute(
    prompt: string,
    options: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      preferredModel?: string;
      cloudFallbackHandler?: (prompt: string, model: string) => Promise<string>;
    } = {}
  ): Promise<ExecutionReceipt> {
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
    let outcome: ExecutionOutcome = 'completed';
    let blocker: ExecutionBlocker | undefined;

    if (decision.route === 'LOCAL') {
      let adapter: ModelAdapter | null = null;
      if (decision.adapterType === 'ollama') adapter = this.adapters.ollama;
      else if (decision.adapterType === 'vllm') adapter = this.adapters.vllm;
      else if (decision.adapterType === 'lmstudio') adapter = this.adapters.lmstudio;

      if (!adapter) {
        // No local engine instance resolved for this route: nothing was executed.
        durationMs = Date.now() - start;
        outcome = 'blocked';
        blocker = {
          code: 'LOCAL_ADAPTER_UNAVAILABLE',
          message: `Route selected LOCAL (${decision.adapterType}) but no matching adapter is registered. Start the local inference engine or reroute to cloud.`
        };
        responseText = `[Local Forge Execution Blocked: ${blocker.message}]`;
      } else {
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
        } catch (err: any) {
          // Local execution failed: report blocked instead of a fake completion.
          durationMs = Date.now() - start;
          outcome = 'blocked';
          blocker = {
            code: 'LOCAL_ADAPTER_EXECUTION_FAILED',
            message: `Local adapter '${decision.adapterType}' failed to generate via model '${decision.targetModel}': ${err.message}. Verify the engine is running and the model is pulled, or reroute to cloud.`
          };
          responseText = `[Local Forge Offline Execution Fallback: ${err.message}]`;
        }
      }
    } else {
      // Cloud Execution Path
      if (options.cloudFallbackHandler) {
        responseText = await options.cloudFallbackHandler(prompt, decision.targetModel);
      } else {
        outcome = 'blocked';
        blocker = {
          code: 'CLOUD_FALLBACK_HANDLER_MISSING',
          message: `Routing escalated to cloud model '${decision.targetModel}' (${decision.escalationReason || 'High Reasoning'}) but no cloudFallbackHandler was provided. Supply a handler or reroute locally.`
        };
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
      outcome,
      ...(blocker ? { blocker } : {}),
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

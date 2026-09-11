/**
 * Router Types & Routing Decision Contracts
 * Copyright (c) 2026 Nymrel / JalenBuilds LLC
 */

export enum TaskComplexity {
  TRIVIAL = 'TRIVIAL',                 // 0.00 - 0.20 ($0 Local GPU)
  ROUTINE = 'ROUTINE',                 // 0.21 - 0.50 ($0 Local GPU)
  MODERATE = 'MODERATE',               // 0.51 - 0.70 ($0 Local GPU)
  COMPLEX = 'COMPLEX',                 // 0.71 - 0.85 ($0 Local GPU)
  FRONTIER_REASONING = 'FRONTIER_REASONING' // > 0.85 (Escalate to Cloud Frontier)
}

export const REASONING_ESCALATION_THRESHOLD = 0.85; // 85% Complexity Threshold

export interface TaskClassification {
  score: number; // 0.0 to 1.0
  complexity: TaskComplexity;
  triggers: string[];
  rationale: string;
  codeDensity: number;
  estimatedPromptTokens: number;
  estimatedCompletionTokens: number;
  recommendedLocalModel: string;
  recommendedCloudModel: string;
  taskCategory: 'code_gen' | 'refactor' | 'unit_test' | 'documentation' | 'debugging' | 'deep_reasoning' | 'general';
}

export interface RoutingDecision {
  route: 'LOCAL' | 'CLOUD';
  targetModel: string;
  adapterType: string;
  endpoint: string;
  complexityScore: number;
  reasoningThreshold: number;
  taskComplexity: TaskComplexity;
  taskCategory: string;
  rationale: string;
  triggers: string[];
  cloudEscalated: boolean;
  escalationReason?: string;
  estimatedTokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  estimatedDollarsSaved: number;
}

/**
 * Truthful execution outcome contract.
 * `completed` means a real provider (adapter or cloud handler) response was received.
 * `blocked` means no provider response was obtained; `blocker` carries a stable,
 * actionable code plus a human-readable message so MCP callers can reroute safely.
 */
export type ExecutionOutcome = 'completed' | 'blocked';

export interface ExecutionBlocker {
  code: 'LOCAL_ADAPTER_EXECUTION_FAILED' | 'LOCAL_ADAPTER_UNAVAILABLE' | 'CLOUD_FALLBACK_HANDLER_MISSING';
  message: string;
}

export interface ExecutionReceipt {
  decision: RoutingDecision;
  outcome: ExecutionOutcome;
  blocker?: ExecutionBlocker;
  text: string;
  modelUsed: string;
  adapterUsed: string;
  isLocal: boolean;
  actualTokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  durationMs: number;
  tokensPerSecond: number;
  actualCost: number;
  hypotheticalBaselineCost: number;
  dollarSavings: number;
  timestamp: string;
}

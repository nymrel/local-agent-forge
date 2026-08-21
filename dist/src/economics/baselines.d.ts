/**
 * Cloud Model Pricing Baselines (Per 1 Million Tokens in USD)
 * Used to calculate real-time dollar savings achieved by local GPU execution
 */
export interface ModelPricing {
    id: string;
    name: string;
    provider: 'anthropic' | 'openai' | 'google' | 'local';
    inputPricePerM: number;
    outputPricePerM: number;
    description: string;
}
export declare const CLOUD_BASELINES: Record<string, ModelPricing>;
export declare const DEFAULT_BASELINE_MODEL = "claude-3-5-sonnet";
export declare function calculateCost(promptTokens: number, completionTokens: number, pricing: ModelPricing): number;
//# sourceMappingURL=baselines.d.ts.map
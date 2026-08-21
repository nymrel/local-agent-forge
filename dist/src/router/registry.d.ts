/**
 * Local Model Capabilities Registry
 * Maps model tags to context limits, VRAM requirements, and strengths
 */
export interface ModelCapability {
    name: string;
    family: string;
    parameters: string;
    contextWindow: number;
    minVramGb: number;
    recommendedTask: string[];
    tokensPerSecEstimate: number;
}
export declare const LOCAL_MODELS_REGISTRY: Record<string, ModelCapability>;
export declare function getBestLocalModelForTask(category: string, availableModels: string[]): string;
//# sourceMappingURL=registry.d.ts.map
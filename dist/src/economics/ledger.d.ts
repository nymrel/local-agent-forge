/**
 * Real-Time Token Cost & Dollar Savings Ledger
 * Tracks local compute economics vs cloud frontier baselines
 */
import { ModelPricing } from './baselines.js';
export interface LedgerTransaction {
    id: string;
    timestamp: string;
    taskType: string;
    model: string;
    isLocal: boolean;
    adapter?: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    durationMs: number;
    tokensPerSecond: number;
    baselineModel: string;
    actualCost: number;
    baselineCost: number;
    savedDollars: number;
}
export interface LedgerSummary {
    totalRequests: number;
    localRequests: number;
    cloudRequests: number;
    localComputeRatioPercent: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    totalActualCost: number;
    totalBaselineCost: number;
    totalSavingsDollars: number;
    averageLatencyMs: number;
    averageTokensPerSecond: number;
    savedDollarsPer1kRequests: number;
}
export declare class TokenLedger {
    private transactions;
    private baselineModelKey;
    constructor(defaultBaseline?: string);
    setBaselineModel(modelKey: string): void;
    getBaselineModel(): ModelPricing;
    record(entry: {
        taskType?: string;
        model: string;
        isLocal: boolean;
        adapter?: string;
        promptTokens: number;
        completionTokens: number;
        durationMs: number;
        tokensPerSecond?: number;
        baselineModelOverride?: string;
    }): LedgerTransaction;
    getTransactions(): LedgerTransaction[];
    getSummary(): LedgerSummary;
    formatAsciiDashboard(): string;
    exportJson(): string;
    importJson(jsonStr: string): void;
    clear(): void;
}
//# sourceMappingURL=ledger.d.ts.map
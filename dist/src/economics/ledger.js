"use strict";
/**
 * Real-Time Token Cost & Dollar Savings Ledger
 * Tracks local compute economics vs cloud frontier baselines
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenLedger = void 0;
const baselines_js_1 = require("./baselines.js");
class TokenLedger {
    transactions = [];
    baselineModelKey;
    constructor(defaultBaseline = baselines_js_1.DEFAULT_BASELINE_MODEL) {
        this.baselineModelKey = defaultBaseline;
    }
    setBaselineModel(modelKey) {
        if (baselines_js_1.CLOUD_BASELINES[modelKey]) {
            this.baselineModelKey = modelKey;
        }
    }
    getBaselineModel() {
        return baselines_js_1.CLOUD_BASELINES[this.baselineModelKey] || baselines_js_1.CLOUD_BASELINES[baselines_js_1.DEFAULT_BASELINE_MODEL];
    }
    record(entry) {
        const baselineKey = entry.baselineModelOverride || this.baselineModelKey;
        const baselinePricing = baselines_js_1.CLOUD_BASELINES[baselineKey] || this.getBaselineModel();
        const localPricing = baselines_js_1.CLOUD_BASELINES['local-gpu'];
        const promptTokens = Math.max(0, entry.promptTokens);
        const completionTokens = Math.max(0, entry.completionTokens);
        const totalTokens = promptTokens + completionTokens;
        const actualCost = entry.isLocal
            ? (0, baselines_js_1.calculateCost)(promptTokens, completionTokens, localPricing)
            : (0, baselines_js_1.calculateCost)(promptTokens, completionTokens, baselinePricing);
        const baselineCost = (0, baselines_js_1.calculateCost)(promptTokens, completionTokens, baselinePricing);
        const savedDollars = Math.max(0, Math.round((baselineCost - actualCost) * 100000) / 100000);
        const durationMs = Math.max(1, entry.durationMs);
        const tps = entry.tokensPerSecond || (completionTokens / (durationMs / 1000));
        const tx = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            timestamp: new Date().toISOString(),
            taskType: entry.taskType || 'code_generation',
            model: entry.model,
            isLocal: entry.isLocal,
            adapter: entry.adapter,
            promptTokens,
            completionTokens,
            totalTokens,
            durationMs,
            tokensPerSecond: Math.round(tps * 10) / 10,
            baselineModel: baselinePricing.name,
            actualCost,
            baselineCost,
            savedDollars
        };
        this.transactions.push(tx);
        return tx;
    }
    getTransactions() {
        return [...this.transactions];
    }
    getSummary() {
        const total = this.transactions.length;
        if (total === 0) {
            return {
                totalRequests: 0,
                localRequests: 0,
                cloudRequests: 0,
                localComputeRatioPercent: 100,
                totalPromptTokens: 0,
                totalCompletionTokens: 0,
                totalTokens: 0,
                totalActualCost: 0,
                totalBaselineCost: 0,
                totalSavingsDollars: 0,
                averageLatencyMs: 0,
                averageTokensPerSecond: 0,
                savedDollarsPer1kRequests: 0
            };
        }
        let localCount = 0;
        let totalPrompt = 0;
        let totalComp = 0;
        let totalActCost = 0;
        let totalBaseCost = 0;
        let totalSavings = 0;
        let totalDuration = 0;
        let totalTps = 0;
        for (const tx of this.transactions) {
            if (tx.isLocal)
                localCount++;
            totalPrompt += tx.promptTokens;
            totalComp += tx.completionTokens;
            totalActCost += tx.actualCost;
            totalBaseCost += tx.baselineCost;
            totalSavings += tx.savedDollars;
            totalDuration += tx.durationMs;
            totalTps += tx.tokensPerSecond;
        }
        const cloudCount = total - localCount;
        const localRatio = Math.round((localCount / total) * 1000) / 10;
        const avgLatency = Math.round(totalDuration / total);
        const avgTps = Math.round((totalTps / total) * 10) / 10;
        const savedPer1k = Math.round((totalSavings / total) * 1000 * 100) / 100;
        return {
            totalRequests: total,
            localRequests: localCount,
            cloudRequests: cloudCount,
            localComputeRatioPercent: localRatio,
            totalPromptTokens: totalPrompt,
            totalCompletionTokens: totalComp,
            totalTokens: totalPrompt + totalComp,
            totalActualCost: Math.round(totalActCost * 10000) / 10000,
            totalBaselineCost: Math.round(totalBaseCost * 10000) / 10000,
            totalSavingsDollars: Math.round(totalSavings * 10000) / 10000,
            averageLatencyMs: avgLatency,
            averageTokensPerSecond: avgTps,
            savedDollarsPer1kRequests: savedPer1k
        };
    }
    formatAsciiDashboard() {
        const s = this.getSummary();
        const baseline = this.getBaselineModel();
        return `
================================================================================
                    LOCAL AGENT FORGE - TOKEN ECONOMICS LEDGER                  
================================================================================
  Baseline Benchmark       : ${baseline.name} ($${baseline.inputPricePerM}/$${baseline.outputPricePerM} per 1M)
  Total Requests Handled   : ${s.totalRequests.toLocaleString()}
  Local GPU Dispatched     : ${s.localRequests.toLocaleString()} (${s.localComputeRatioPercent}%) -> $0 Compute
  Cloud Escalated          : ${s.cloudRequests.toLocaleString()}
--------------------------------------------------------------------------------
  Total Tokens Processed   : ${s.totalTokens.toLocaleString()} tokens
    - Prompt Tokens        : ${s.totalPromptTokens.toLocaleString()}
    - Completion Tokens    : ${s.totalCompletionTokens.toLocaleString()}
--------------------------------------------------------------------------------
  Actual Compute Spent     : $${s.totalActualCost.toFixed(4)}
  Hypothetical Cloud Cost  : $${s.totalBaselineCost.toFixed(4)}
  NET DOLLARS SAVED        : $${s.totalSavingsDollars.toFixed(4)}
  Projected Savings / 1k Tx: $${s.savedDollarsPer1kRequests.toFixed(2)}
--------------------------------------------------------------------------------
  Avg Latency              : ${s.averageLatencyMs} ms
  Avg GPU Throughput       : ${s.averageTokensPerSecond} tokens/sec
================================================================================
`.trim();
    }
    exportJson() {
        return JSON.stringify({
            baseline: this.baselineModelKey,
            summary: this.getSummary(),
            transactions: this.transactions
        }, null, 2);
    }
    importJson(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            if (Array.isArray(data.transactions)) {
                this.transactions = data.transactions;
            }
            if (data.baseline && baselines_js_1.CLOUD_BASELINES[data.baseline]) {
                this.baselineModelKey = data.baseline;
            }
        }
        catch {
            // ignore bad format
        }
    }
    clear() {
        this.transactions = [];
    }
}
exports.TokenLedger = TokenLedger;
//# sourceMappingURL=ledger.js.map
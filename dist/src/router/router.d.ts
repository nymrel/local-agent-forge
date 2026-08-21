/**
 * Local Agent Dynamic Model Router
 * Routes routine tasks to local GPU ($0) and only escalates to cloud when complexity > 85%
 */
import { AdapterRegistry } from '../adapters/index.js';
import { TokenLedger } from '../economics/ledger.js';
import { TaskClassifier } from './classifier.js';
import { RoutingDecision, ExecutionReceipt } from './types.js';
export interface LocalAgentRouterConfig {
    adapters?: AdapterRegistry;
    ledger?: TokenLedger;
    classifier?: TaskClassifier;
    defaultCloudModel?: string;
    forceLocal?: boolean;
    forceCloud?: boolean;
}
export declare class LocalAgentRouter {
    readonly adapters: AdapterRegistry;
    readonly ledger: TokenLedger;
    readonly classifier: TaskClassifier;
    readonly defaultCloudModel: string;
    private forceLocal;
    private forceCloud;
    constructor(config?: LocalAgentRouterConfig);
    evaluate(prompt: string, context?: {
        fileCount?: number;
        historyLength?: number;
        preferredModel?: string;
    }): Promise<RoutingDecision>;
    execute(prompt: string, options?: {
        systemPrompt?: string;
        temperature?: number;
        maxTokens?: number;
        preferredModel?: string;
        cloudFallbackHandler?: (prompt: string, model: string) => Promise<string>;
    }): Promise<ExecutionReceipt>;
}
//# sourceMappingURL=router.d.ts.map
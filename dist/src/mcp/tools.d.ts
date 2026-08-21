/**
 * Model Context Protocol (MCP) Tool Definitions for Local AI Inference
 * Exposes local models and GPU tools to Claude Code, Cursor, and Codex
 */
import { LocalAgentRouter } from '../router/index.js';
import { AdapterRegistry } from '../adapters/index.js';
import { TokenLedger } from '../economics/ledger.js';
export interface MCPToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
    };
}
export declare const MCP_TOOLS: MCPToolDefinition[];
export declare class MCPToolExecutor {
    readonly router: LocalAgentRouter;
    readonly adapters: AdapterRegistry;
    readonly ledger: TokenLedger;
    constructor(options?: {
        router?: LocalAgentRouter;
        adapters?: AdapterRegistry;
        ledger?: TokenLedger;
    });
    executeTool(name: string, args: Record<string, any>): Promise<any>;
}
//# sourceMappingURL=tools.d.ts.map
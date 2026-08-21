/**
 * Model Context Protocol (MCP) JSON-RPC 2.0 Server
 * Connects local models directly to Claude Code, Cursor, and Codex via standard stdio
 */
import { MCPToolExecutor } from './tools.js';
export interface JSONRPCRequest {
    jsonrpc: '2.0';
    id?: string | number | null;
    method: string;
    params?: Record<string, any>;
}
export interface JSONRPCResponse {
    jsonrpc: '2.0';
    id: string | number | null;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}
export declare class MCPServer {
    readonly executor: MCPToolExecutor;
    private isRunning;
    constructor(executor?: MCPToolExecutor);
    handleRequest(req: JSONRPCRequest): Promise<JSONRPCResponse | null>;
    startStdio(): void;
}
//# sourceMappingURL=server.d.ts.map
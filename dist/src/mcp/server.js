"use strict";
/**
 * Model Context Protocol (MCP) JSON-RPC 2.0 Server
 * Connects local models directly to Claude Code, Cursor, and Codex via standard stdio
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPServer = void 0;
const readline = __importStar(require("node:readline"));
const tools_js_1 = require("./tools.js");
class MCPServer {
    executor;
    isRunning = false;
    constructor(executor) {
        this.executor = executor || new tools_js_1.MCPToolExecutor();
    }
    async handleRequest(req) {
        const id = req.id ?? null;
        try {
            switch (req.method) {
                case 'initialize': {
                    return {
                        jsonrpc: '2.0',
                        id,
                        result: {
                            protocolVersion: '2024-11-05',
                            capabilities: {
                                tools: {
                                    listChanged: false
                                },
                                resources: {},
                                prompts: {}
                            },
                            serverInfo: {
                                name: 'local-agent-forge-mcp',
                                version: '1.0.0'
                            }
                        }
                    };
                }
                case 'notifications/initialized': {
                    // Notification has no return
                    return null;
                }
                case 'ping': {
                    return {
                        jsonrpc: '2.0',
                        id,
                        result: {}
                    };
                }
                case 'tools/list': {
                    return {
                        jsonrpc: '2.0',
                        id,
                        result: {
                            tools: tools_js_1.MCP_TOOLS
                        }
                    };
                }
                case 'tools/call': {
                    const params = req.params || {};
                    const toolName = params.name;
                    const toolArgs = params.arguments || {};
                    if (!toolName) {
                        return {
                            jsonrpc: '2.0',
                            id,
                            error: {
                                code: -32602,
                                message: 'Missing "name" parameter in tools/call request'
                            }
                        };
                    }
                    const toolResult = await this.executor.executeTool(toolName, toolArgs);
                    return {
                        jsonrpc: '2.0',
                        id,
                        result: {
                            content: [
                                {
                                    type: 'text',
                                    text: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2)
                                }
                            ]
                        }
                    };
                }
                case 'resources/list': {
                    return {
                        jsonrpc: '2.0',
                        id,
                        result: {
                            resources: [
                                {
                                    uri: 'local-forge://economics/ledger',
                                    name: 'Token Economics Ledger',
                                    mimeType: 'application/json',
                                    description: 'Real-time compute and dollar savings ledger'
                                },
                                {
                                    uri: 'local-forge://gpu/health',
                                    name: 'Local GPU Health Status',
                                    mimeType: 'application/json',
                                    description: 'Health status of local inference engines'
                                }
                            ]
                        }
                    };
                }
                default: {
                    return {
                        jsonrpc: '2.0',
                        id,
                        error: {
                            code: -32601,
                            message: `Method not found: ${req.method}`
                        }
                    };
                }
            }
        }
        catch (err) {
            return {
                jsonrpc: '2.0',
                id,
                error: {
                    code: -32000,
                    message: err.message || String(err)
                }
            };
        }
    }
    startStdio() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });
        rl.on('line', async (line) => {
            const trimmed = line.trim();
            if (!trimmed)
                return;
            try {
                const req = JSON.parse(trimmed);
                const res = await this.handleRequest(req);
                if (res) {
                    process.stdout.write(JSON.stringify(res) + '\n');
                }
            }
            catch (err) {
                const errRes = {
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                        code: -32700,
                        message: `Parse error: ${err.message}`
                    }
                };
                process.stdout.write(JSON.stringify(errRes) + '\n');
            }
        });
        process.stderr.write('[local-agent-forge] MCP stdio server active and listening on standard I/O\n');
    }
}
exports.MCPServer = MCPServer;
//# sourceMappingURL=server.js.map
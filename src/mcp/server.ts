/**
 * Model Context Protocol (MCP) JSON-RPC 2.0 Server
 * Connects local models directly to Claude Code, Cursor, and Codex via standard stdio
 */

import * as readline from 'node:readline';
import { MCP_TOOLS, MCPToolExecutor } from './tools.js';

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

export class MCPServer {
  readonly executor: MCPToolExecutor;
  private isRunning: boolean = false;

  constructor(executor?: MCPToolExecutor) {
    this.executor = executor || new MCPToolExecutor();
  }

  async handleRequest(req: JSONRPCRequest): Promise<JSONRPCResponse | null> {
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
              tools: MCP_TOOLS
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
    } catch (err: any) {
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

  startStdio(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const req = JSON.parse(trimmed) as JSONRPCRequest;
        const res = await this.handleRequest(req);
        if (res) {
          process.stdout.write(JSON.stringify(res) + '\n');
        }
      } catch (err: any) {
        const errRes: JSONRPCResponse = {
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

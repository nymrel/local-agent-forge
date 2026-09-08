"""
Model Context Protocol (MCP) Server for Python
"""

import sys
import json
from typing import Dict, Any, Optional
from .router import LocalAgentRouter

MCP_TOOLS = [
    {
        "name": "local_generate",
        "description": "Generate code or text using local GPU ($0 token cost).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "prompt": {"type": "string", "description": "Prompt text to generate."},
                "model": {"type": "string", "description": "Local model tag."}
            },
            "required": ["prompt"]
        }
    },
    {
        "name": "route_task",
        "description": "Classify task complexity and evaluate 85% local vs cloud routing decision.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "prompt": {"type": "string", "description": "Task prompt to analyze."}
            },
            "required": ["prompt"]
        }
    },
    {
        "name": "check_gpu_health",
        "description": "Probe health and latency across local Ollama, vLLM, LM Studio, ComfyUI, Whisper.",
        "inputSchema": {"type": "object", "properties": {}}
    },
    {
        "name": "get_savings_stats",
        "description": "Retrieve real-time token savings and dollar ledger.",
        "inputSchema": {"type": "object", "properties": {}}
    }
]


class MCPServer:
    def __init__(self):
        self.router = LocalAgentRouter()
        self.adapters = self.router.adapters
        self.ledger = self.router.ledger

    def handle_request(self, req: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        req_id = req.get("id")
        method = req.get("method")
        params = req.get("params", {})

        try:
            if method == "initialize":
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {"tools": {}},
                        "serverInfo": {"name": "local-agent-forge-py-mcp", "version": "1.0.0"}
                    }
                }
            elif method == "tools/list":
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {"tools": MCP_TOOLS}
                }
            elif method == "ping":
                return {"jsonrpc": "2.0", "id": req_id, "result": {}}
            elif method == "tools/call":
                tool_name = params.get("name")
                args = params.get("arguments", {})

                if tool_name == "route_task":
                    decision = self.router.evaluate(args.get("prompt", ""))
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [{"type": "text", "text": json.dumps(decision.__dict__, default=str, indent=2)}]
                        }
                    }
                elif tool_name == "check_gpu_health":
                    health = self.adapters.probe_all()
                    formatted = {k: v.__dict__ for k, v in health.items()}
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [{"type": "text", "text": json.dumps(formatted, indent=2)}]
                        }
                    }
                elif tool_name == "get_savings_stats":
                    summary = self.ledger.get_summary()
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [{"type": "text", "text": json.dumps(summary, indent=2)}]
                        }
                    }
                elif tool_name == "local_generate":
                    prompt = args.get("prompt", "")
                    health = self.adapters.probe_all()
                    if health["ollama"].connected:
                        comp = self.adapters.ollama.generate(prompt, model=args.get("model"))
                        return {
                            "jsonrpc": "2.0",
                            "id": req_id,
                            "result": {
                                "content": [{"type": "text", "text": json.dumps(comp.__dict__, indent=2)}]
                            }
                        }
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [{"type": "text", "text": f"[Offline simulation: {prompt[:30]}...]"}]
                        }
                    }
                else:
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"}
                    }
            else:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32601, "message": f"Unknown method: {method}"}
                }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32000, "message": str(e)}
            }

    def start_stdio(self):
        sys.stderr.write("[local-agent-forge-py] MCP stdio server active\n")
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                req = json.loads(line)
                res = self.handle_request(req)
                if res:
                    sys.stdout.write(json.dumps(res) + "\n")
                    sys.stdout.flush()
            except Exception as e:
                err_res = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": str(e)}}
                sys.stdout.write(json.dumps(err_res) + "\n")
                sys.stdout.flush()

"""
Unit tests for Python MCP Server
"""

import unittest
import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../python")))

from local_agent_forge.mcp_server import MCPServer, MCP_TOOLS


class TestMCPServer(unittest.TestCase):
    def setUp(self):
        self.server = MCPServer()

    def test_mcp_tools_list(self):
        res = self.server.handle_request({"jsonrpc": "2.0", "id": 1, "method": "tools/list"})
        self.assertIsNotNone(res)
        self.assertEqual(res["id"], 1)
        self.assertEqual(len(res["result"]["tools"]), len(MCP_TOOLS))

    def test_mcp_initialize(self):
        res = self.server.handle_request({"jsonrpc": "2.0", "id": 2, "method": "initialize"})
        self.assertIsNotNone(res)
        self.assertEqual(res["result"]["serverInfo"]["name"], "local-agent-forge-py-mcp")

    def test_mcp_tool_route_task(self):
        res = self.server.handle_request({
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "route_task",
                "arguments": {"prompt": "Write a unit test for sorting algorithm"}
            }
        })
        self.assertIsNotNone(res)
        self.assertIn("content", res["result"])
        parsed = json.loads(res["result"]["content"][0]["text"])
        self.assertIn("complexity_score", parsed)
        self.assertLessEqual(parsed["complexity_score"], 0.85)


if __name__ == "__main__":
    unittest.main()

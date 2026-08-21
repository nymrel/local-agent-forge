"use strict";
/**
 * Test Suite: Model Context Protocol (MCP) Server & Tool Serializers
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const index_js_1 = require("../src/mcp/index.js");
(0, node_test_1.describe)('Model Context Protocol (MCP) Engine', () => {
    const server = new index_js_1.MCPServer();
    (0, node_test_1.test)('MCP_TOOLS definitions contain required tools and valid schemas', () => {
        const toolNames = index_js_1.MCP_TOOLS.map(t => t.name);
        node_assert_1.default.ok(toolNames.includes('local_generate'), 'Contains local_generate');
        node_assert_1.default.ok(toolNames.includes('local_chat'), 'Contains local_chat');
        node_assert_1.default.ok(toolNames.includes('route_task'), 'Contains route_task');
        node_assert_1.default.ok(toolNames.includes('check_gpu_health'), 'Contains check_gpu_health');
        node_assert_1.default.ok(toolNames.includes('get_savings_stats'), 'Contains get_savings_stats');
        node_assert_1.default.ok(toolNames.includes('comfy_generate_image'), 'Contains comfy_generate_image');
        node_assert_1.default.ok(toolNames.includes('transcribe_audio'), 'Contains transcribe_audio');
        for (const tool of index_js_1.MCP_TOOLS) {
            node_assert_1.default.strictEqual(tool.inputSchema.type, 'object');
            node_assert_1.default.ok(tool.description.length > 10);
        }
    });
    (0, node_test_1.test)('MCPServer handles "initialize" handshake compliant with MCP spec', async () => {
        const res = await server.handleRequest({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: { protocolVersion: '2024-11-05' }
        });
        node_assert_1.default.ok(res);
        node_assert_1.default.strictEqual(res.jsonrpc, '2.0');
        node_assert_1.default.strictEqual(res.id, 1);
        node_assert_1.default.strictEqual(res.result.serverInfo.name, 'local-agent-forge-mcp');
        node_assert_1.default.ok(res.result.capabilities.tools);
    });
    (0, node_test_1.test)('MCPServer handles "tools/list" request', async () => {
        const res = await server.handleRequest({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list'
        });
        node_assert_1.default.ok(res);
        node_assert_1.default.strictEqual(res.id, 2);
        node_assert_1.default.strictEqual(res.result.tools.length, index_js_1.MCP_TOOLS.length);
    });
    (0, node_test_1.test)('MCPServer handles "tools/call" for route_task', async () => {
        const res = await server.handleRequest({
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
                name: 'route_task',
                arguments: {
                    prompt: 'Write a quick regex to validate email addresses'
                }
            }
        });
        node_assert_1.default.ok(res);
        node_assert_1.default.strictEqual(res.id, 3);
        node_assert_1.default.ok(res.result.content);
        node_assert_1.default.strictEqual(res.result.content[0].type, 'text');
        const parsed = JSON.parse(res.result.content[0].text);
        node_assert_1.default.ok(parsed.decision);
        node_assert_1.default.ok(parsed.decision.complexityScore <= 0.85);
    });
    (0, node_test_1.test)('MCPServer handles "tools/call" for get_savings_stats', async () => {
        const res = await server.handleRequest({
            jsonrpc: '2.0',
            id: 4,
            method: 'tools/call',
            params: {
                name: 'get_savings_stats',
                arguments: {}
            }
        });
        node_assert_1.default.ok(res);
        node_assert_1.default.strictEqual(res.id, 4);
        const parsed = JSON.parse(res.result.content[0].text);
        node_assert_1.default.ok(parsed.summary);
        node_assert_1.default.ok(parsed.asciiDashboard);
    });
    (0, node_test_1.test)('MCPServer returns error for unknown tool or method', async () => {
        const toolErr = await server.handleRequest({
            jsonrpc: '2.0',
            id: 5,
            method: 'tools/call',
            params: { name: 'non_existent_tool' }
        });
        node_assert_1.default.ok(toolErr);
        node_assert_1.default.ok(toolErr.error);
        const methodErr = await server.handleRequest({
            jsonrpc: '2.0',
            id: 6,
            method: 'invalid_method'
        });
        node_assert_1.default.ok(methodErr);
        node_assert_1.default.strictEqual(methodErr.error?.code, -32601);
    });
});
//# sourceMappingURL=mcp.test.js.map
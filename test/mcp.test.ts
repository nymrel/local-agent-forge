/**
 * Test Suite: Model Context Protocol (MCP) Server & Tool Serializers
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { MCPServer, MCP_TOOLS } from '../src/mcp/index.js';

describe('Model Context Protocol (MCP) Engine', () => {
  const server = new MCPServer();

  test('MCP_TOOLS definitions contain required tools and valid schemas', () => {
    const toolNames = MCP_TOOLS.map(t => t.name);
    assert.ok(toolNames.includes('local_generate'), 'Contains local_generate');
    assert.ok(toolNames.includes('local_chat'), 'Contains local_chat');
    assert.ok(toolNames.includes('route_task'), 'Contains route_task');
    assert.ok(toolNames.includes('check_gpu_health'), 'Contains check_gpu_health');
    assert.ok(toolNames.includes('get_savings_stats'), 'Contains get_savings_stats');
    assert.ok(toolNames.includes('comfy_generate_image'), 'Contains comfy_generate_image');
    assert.ok(toolNames.includes('transcribe_audio'), 'Contains transcribe_audio');

    for (const tool of MCP_TOOLS) {
      assert.strictEqual(tool.inputSchema.type, 'object');
      assert.ok(tool.description.length > 10);
    }
  });

  test('MCPServer handles "initialize" handshake compliant with MCP spec', async () => {
    const res = await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05' }
    });

    assert.ok(res);
    assert.strictEqual(res.jsonrpc, '2.0');
    assert.strictEqual(res.id, 1);
    assert.strictEqual(res.result.serverInfo.name, 'local-agent-forge-mcp');
    assert.ok(res.result.capabilities.tools);
  });

  test('MCPServer handles "tools/list" request', async () => {
    const res = await server.handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    });

    assert.ok(res);
    assert.strictEqual(res.id, 2);
    assert.strictEqual(res.result.tools.length, MCP_TOOLS.length);
  });

  test('MCPServer handles "tools/call" for route_task', async () => {
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

    assert.ok(res);
    assert.strictEqual(res.id, 3);
    assert.ok(res.result.content);
    assert.strictEqual(res.result.content[0].type, 'text');

    const parsed = JSON.parse(res.result.content[0].text);
    assert.ok(parsed.decision);
    assert.ok(parsed.decision.complexityScore <= 0.85);
  });

  test('MCPServer handles "tools/call" for get_savings_stats', async () => {
    const res = await server.handleRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'get_savings_stats',
        arguments: {}
      }
    });

    assert.ok(res);
    assert.strictEqual(res.id, 4);
    const parsed = JSON.parse(res.result.content[0].text);
    assert.ok(parsed.summary);
    assert.ok(parsed.asciiDashboard);
  });

  test('MCPServer returns error for unknown tool or method', async () => {
    const toolErr = await server.handleRequest({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'non_existent_tool' }
    });
    assert.ok(toolErr);
    assert.ok(toolErr.error);

    const methodErr = await server.handleRequest({
      jsonrpc: '2.0',
      id: 6,
      method: 'invalid_method'
    });
    assert.ok(methodErr);
    assert.strictEqual(methodErr.error?.code, -32601);
  });
});

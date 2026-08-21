/**
 * Command-Line Interface for Local Agent Forge
 * Copyright (c) 2026 Nymrel / JalenBuilds LLC
 */

import { AdapterRegistry } from './adapters/index.js';
import { LocalAgentRouter } from './router/index.js';
import { TokenLedger } from './economics/index.js';
import { MCPServer } from './mcp/index.js';
import * as http from 'node:http';

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<void> {
  const command = argv[0] || 'help';

  switch (command) {
    case 'start': {
      const portArgIdx = argv.indexOf('--port');
      const port = portArgIdx !== -1 && argv[portArgIdx + 1] ? parseInt(argv[portArgIdx + 1], 10) : 4000;
      await startHttpProxy(port);
      break;
    }

    case 'route': {
      const prompt = argv.slice(1).join(' ').trim();
      if (!prompt) {
        console.error('Error: Please provide a prompt to route. Example: local-forge route "Format this JSON"');
        process.exit(1);
      }
      await handleRouteCommand(prompt);
      break;
    }

    case 'bench': {
      await handleBenchCommand();
      break;
    }

    case 'stats': {
      await handleStatsCommand();
      break;
    }

    case 'health':
    case 'status': {
      await handleHealthCommand();
      break;
    }

    case 'mcp': {
      const mcpServer = new MCPServer();
      mcpServer.startStdio();
      break;
    }

    case 'version':
    case '-v':
    case '--version': {
      console.log('@nymrel/local-forge v1.0.0');
      break;
    }

    case 'help':
    case '--help':
    case '-h':
    default: {
      printHelp();
      break;
    }
  }
}

async function handleHealthCommand(): Promise<void> {
  console.log('\n🔍 Probing Local AI Inference Servers on localhost...\n');
  const adapters = new AdapterRegistry();
  const health = await adapters.probeAll();

  console.log('Adapter Status:');
  console.log('----------------------------------------------------------------------');
  
  const printRow = (name: string, port: string, status: boolean, latency: number, models: string[], error?: string) => {
    const symbol = status ? '🟢 ONLINE ' : '🔴 OFFLINE';
    console.log(`${symbol} | ${name.padEnd(12)} (${port.padEnd(6)}) | ${status ? `${latency}ms`.padEnd(8) : 'N/A'.padEnd(8)} | Models: ${models.length > 0 ? models.slice(0, 3).join(', ') : 'None'}`);
    if (error && !status) {
      console.log(`       └─ Reason: ${error}`);
    }
  };

  printRow('Ollama', ':11434', health.ollama.connected, health.ollama.latencyMs, health.ollama.availableModels, health.ollama.error);
  printRow('vLLM', ':8000', health.vllm.connected, health.vllm.latencyMs, health.vllm.availableModels, health.vllm.error);
  printRow('LM Studio', ':1234', health.lmstudio.connected, health.lmstudio.latencyMs, health.lmstudio.availableModels, health.lmstudio.error);
  printRow('ComfyUI', ':8188', health.comfyui.connected, health.comfyui.latencyMs, health.comfyui.availableModels, health.comfyui.error);
  printRow('Whisper', ':8080', health.whisper.connected, health.whisper.latencyMs, health.whisper.availableModels, health.whisper.error);

  console.log('----------------------------------------------------------------------\n');
}

async function handleRouteCommand(prompt: string): Promise<void> {
  console.log(`\nEvaluating Task Complexity & Routing Heuristic...\n`);
  const router = new LocalAgentRouter();
  const decision = await router.evaluate(prompt);

  console.log('======================================================================');
  console.log('                     DYNAMIC ROUTING DECISION                         ');
  console.log('======================================================================');
  console.log(`  Route Target       : [ ${decision.route} ]`);
  console.log(`  Target Model       : ${decision.targetModel}`);
  console.log(`  Inference Engine   : ${decision.adapterType} (${decision.endpoint})`);
  console.log(`  Complexity Score   : ${(decision.complexityScore * 100).toFixed(1)}% (Threshold: ${(decision.reasoningThreshold * 100)}%)`);
  console.log(`  Task Bucket        : ${decision.taskComplexity} [Category: ${decision.taskCategory}]`);
  console.log(`  Triggers Detected  : ${decision.triggers.join(', ') || 'none'}`);
  console.log(`  Cloud Escalated    : ${decision.cloudEscalated ? `YES (${decision.escalationReason})` : 'NO ($0 Local GPU)'}`);
  console.log(`  Est. Tokens        : ${decision.estimatedTokens.prompt} prompt + ${decision.estimatedTokens.completion} comp = ${decision.estimatedTokens.total} total`);
  console.log(`  Est. Dollar Savings: $${decision.estimatedDollarsSaved.toFixed(5)} vs Claude 3.5 Sonnet`);
  console.log(`  Rationale          : ${decision.rationale}`);
  console.log('======================================================================\n');
}

async function handleBenchCommand(): Promise<void> {
  console.log('\n⚡ Benchmarking Local GPU Inference Latency & Throughput...\n');
  const adapters = new AdapterRegistry();
  const testPrompt = 'Write a fast, self-contained binary search function in TypeScript with JSDoc comments.';

  const llmAdapters = [
    { name: 'Ollama', adapter: adapters.ollama },
    { name: 'vLLM', adapter: adapters.vllm },
    { name: 'LM Studio', adapter: adapters.lmstudio }
  ];

  for (const { name, adapter } of llmAdapters) {
    const health = await adapter.checkHealth();
    if (health.connected) {
      console.log(`Testing ${name}...`);
      try {
        const result = await adapter.generate(testPrompt, { maxTokens: 100 });
        console.log(`  ✅ ${name}: ${result.tokensPerSecond} tokens/sec (${result.durationMs}ms for ${result.completionTokens} tokens)`);
      } catch (err: any) {
        console.log(`  ⚠️  ${name} execution error: ${err.message}`);
      }
    } else {
      console.log(`  ⏸️  ${name}: Offline (Skipping benchmark)`);
    }
  }
  console.log('\nBenchmark complete.\n');
}

async function handleStatsCommand(): Promise<void> {
  const ledger = new TokenLedger();
  console.log('\n' + ledger.formatAsciiDashboard() + '\n');
}

async function startHttpProxy(port: number): Promise<void> {
  const router = new LocalAgentRouter();

  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/health' && req.method === 'GET') {
      const health = await router.adapters.probeAll();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', health }));
      return;
    }

    if (req.url === '/stats' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(router.ledger.exportJson());
      return;
    }

    if ((req.url === '/v1/chat/completions' || req.url === '/v1/completions' || req.url === '/route') && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const prompt = parsed.prompt || (parsed.messages ? parsed.messages.map((m: any) => `${m.role}: ${m.content}`).join('\n') : '');
          
          if (req.url === '/route') {
            const decision = await router.evaluate(prompt);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(decision));
            return;
          }

          const result = await router.execute(prompt, {
            preferredModel: parsed.model,
            temperature: parsed.temperature,
            maxTokens: parsed.max_tokens
          });

          // OpenAI compatible response format
          const openAiResponse = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: result.modelUsed,
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: result.text
                },
                finish_reason: 'stop'
              }
            ],
            usage: {
              prompt_tokens: result.actualTokens.prompt,
              completion_tokens: result.actualTokens.completion,
              total_tokens: result.actualTokens.total
            },
            forge_meta: {
              route: result.decision.route,
              adapter: result.adapterUsed,
              savedDollars: result.dollarSavings,
              latencyMs: result.durationMs
            }
          };

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(openAiResponse));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  });

  server.listen(port, () => {
    console.log(`\n🚀 Local Agent Forge Proxy Server running at http://127.0.0.1:${port}`);
    console.log(`   - OpenAI Compatible Chat: POST http://127.0.0.1:${port}/v1/chat/completions`);
    console.log(`   - Dynamic Route Tester : POST http://127.0.0.1:${port}/route`);
    console.log(`   - Server Health Check  : GET  http://127.0.0.1:${port}/health`);
    console.log(`   - Token Economics Stats: GET  http://127.0.0.1:${port}/stats\n`);
  });
}

function printHelp(): void {
  console.log(`
Local Agent Forge CLI - Zero-Cloud Local GPU Orchestrator & Dynamic Model Router
Copyright (c) 2026 Nymrel / JalenBuilds LLC

USAGE:
  local-forge <command> [options]

COMMANDS:
  start [--port 4000]    Start the OpenAI-compatible zero-cloud local proxy router
  route "<prompt>"       Classify task complexity and evaluate 85% reasoning escalation route
  bench                  Benchmark latency and throughput across local inference engines
  health | status        Probe status, latency, and available models on localhost
  stats                  Display token savings ledger and financial analytics
  mcp                    Launch Model Context Protocol (MCP) stdio server for Claude/Cursor/Codex
  version                Print version information
  help                   Show this help menu

EXAMPLES:
  local-forge route "Convert this SQL query to TypeScript Prisma schema"
  local-forge start --port 4000
  local-forge mcp
`);
}

// Auto-run if executed directly as script
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.endsWith('cli.js')) {
  runCli().catch(err => {
    console.error('Fatal CLI Error:', err);
    process.exit(1);
  });
}

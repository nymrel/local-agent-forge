"use strict";
/**
 * Command-Line Interface for Local Agent Forge
 * Copyright (c) 2026 Nymrel / JalenBuilds LLC
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
exports.DEFAULT_PROXY_HOST = void 0;
exports.runCli = runCli;
exports.createHttpProxyServer = createHttpProxyServer;
const index_js_1 = require("./adapters/index.js");
const index_js_2 = require("./router/index.js");
const index_js_3 = require("./economics/index.js");
const index_js_4 = require("./mcp/index.js");
const http = __importStar(require("node:http"));
const MAX_PROXY_REQUEST_BYTES = 1_048_576;
exports.DEFAULT_PROXY_HOST = '127.0.0.1';
class ProxyRequestError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'ProxyRequestError';
    }
}
async function readRequestBody(req) {
    const chunks = [];
    let receivedBytes = 0;
    for await (const chunk of req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        receivedBytes += buffer.length;
        if (receivedBytes > MAX_PROXY_REQUEST_BYTES) {
            throw new ProxyRequestError(413, `Request body exceeds ${MAX_PROXY_REQUEST_BYTES} bytes`);
        }
        chunks.push(buffer);
    }
    return Buffer.concat(chunks).toString('utf8');
}
function hasAllowedProxyHost(req) {
    const hostHeader = req.headers.host;
    const localPort = req.socket.localPort;
    if (!hostHeader || !localPort)
        return false;
    try {
        const parsed = new URL(`http://${hostHeader}`);
        const isLoopbackHost = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
        const isBareAuthority = !parsed.username && !parsed.password && parsed.pathname === '/' && !parsed.search && !parsed.hash;
        return isLoopbackHost && isBareAuthority && parsed.port === String(localPort);
    }
    catch {
        return false;
    }
}
function hasJsonContentType(req) {
    return req.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase() === 'application/json';
}
async function runCli(argv = process.argv.slice(2)) {
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
            const mcpServer = new index_js_4.MCPServer();
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
async function handleHealthCommand() {
    console.log('\n🔍 Probing Local AI Inference Servers on localhost...\n');
    const adapters = new index_js_1.AdapterRegistry();
    const health = await adapters.probeAll();
    console.log('Adapter Status:');
    console.log('----------------------------------------------------------------------');
    const printRow = (name, port, status, latency, models, error) => {
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
async function handleRouteCommand(prompt) {
    console.log(`\nEvaluating Task Complexity & Routing Heuristic...\n`);
    const router = new index_js_2.LocalAgentRouter();
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
async function handleBenchCommand() {
    console.log('\n⚡ Benchmarking Local GPU Inference Latency & Throughput...\n');
    const adapters = new index_js_1.AdapterRegistry();
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
            }
            catch (err) {
                console.log(`  ⚠️  ${name} execution error: ${err.message}`);
            }
        }
        else {
            console.log(`  ⏸️  ${name}: Offline (Skipping benchmark)`);
        }
    }
    console.log('\nBenchmark complete.\n');
}
async function handleStatsCommand() {
    const ledger = new index_js_3.TokenLedger();
    console.log('\n' + ledger.formatAsciiDashboard() + '\n');
}
function createHttpProxyServer() {
    const router = new index_js_2.LocalAgentRouter();
    return http.createServer(async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (!hasAllowedProxyHost(req)) {
            res.writeHead(421, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Request Host must match the loopback listener' }));
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
            if (!hasJsonContentType(req)) {
                res.writeHead(415, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Content-Type must be application/json' }));
                return;
            }
            try {
                const body = await readRequestBody(req);
                let parsed;
                try {
                    parsed = JSON.parse(body || '{}');
                }
                catch {
                    throw new ProxyRequestError(400, 'Request body must contain valid JSON');
                }
                const prompt = parsed.prompt || (parsed.messages ? parsed.messages.map((m) => `${m.role}: ${m.content}`).join('\n') : '');
                if (req.url === '/route') {
                    const decision = await router.evaluate(prompt);
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify(decision));
                    return;
                }
                const result = await router.execute(prompt, {
                    preferredModel: parsed.model,
                    temperature: parsed.temperature,
                    maxTokens: parsed.max_tokens
                });
                // OpenAI-compatible response shape for local evaluation.
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
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(openAiResponse));
            }
            catch (err) {
                if (err instanceof ProxyRequestError) {
                    res.writeHead(err.statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: err.message }));
                }
                else {
                    console.error('Local proxy request failed:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Request failed' }));
                }
            }
            return;
        }
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
    });
}
async function startHttpProxy(port) {
    const server = createHttpProxyServer();
    server.listen(port, exports.DEFAULT_PROXY_HOST, () => {
        console.log(`\n🚀 Local Agent Forge Proxy Server running at http://127.0.0.1:${port}`);
        console.log(`   - OpenAI Compatible Chat: POST http://127.0.0.1:${port}/v1/chat/completions`);
        console.log(`   - Dynamic Route Tester : POST http://127.0.0.1:${port}/route`);
        console.log(`   - Server Health Check  : GET  http://127.0.0.1:${port}/health`);
        console.log(`   - Token Economics Stats: GET  http://127.0.0.1:${port}/stats\n`);
    });
}
function printHelp() {
    console.log(`
Local Agent Forge CLI - Pre-release Local Inference Adapter and Heuristic Router
Copyright (c) 2026 Nymrel / JalenBuilds LLC

USAGE:
  local-forge <command> [options]

COMMANDS:
  start [--port 4000]    Start the loopback-only OpenAI-compatible proxy
  route "<prompt>"       Evaluate the deterministic 0.85 routing heuristic
  bench                  Benchmark latency and throughput across local inference engines
  health | status        Probe status, latency, and available models on localhost
  stats                  Display measured usage and illustrative cost comparisons
  mcp                    Launch the experimental MCP stdio server
  version                Print version information
  help                   Show this help menu

EXAMPLES:
  local-forge route "Convert this SQL query to TypeScript Prisma schema"
  local-forge start --port 4000
  local-forge mcp

NOTICE:
  Routing decisions are advisory. Model availability, provider execution,
  privacy, pricing, and savings require separate current evidence.
`);
}
// Auto-run if executed directly as script
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.endsWith('cli.js')) {
    runCli().catch(err => {
        console.error('Fatal CLI Error:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=cli.js.map
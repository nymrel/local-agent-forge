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

export const MCP_TOOLS: MCPToolDefinition[] = [
  {
    name: 'local_generate',
    description: 'Generate code, text, or documentation using a zero-cloud local GPU inference engine (Ollama/vLLM/LMStudio) at $0 token cost.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The instruction or prompt to execute locally.'
        },
        model: {
          type: 'string',
          description: 'Optional local model tag (e.g. qwen2.5-coder:7b, deepseek-r1:14b, llama3.3:70b).'
        },
        systemPrompt: {
          type: 'string',
          description: 'Optional system instructions.'
        },
        temperature: {
          type: 'number',
          description: 'Sampling temperature (0.0 to 1.0). Default: 0.2'
        },
        maxTokens: {
          type: 'number',
          description: 'Maximum tokens to generate. Default: 2048'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'local_chat',
    description: 'Multi-turn conversational chat with an on-device local model at $0 cost.',
    inputSchema: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          description: 'Array of chat message objects with role (system, user, assistant) and content.',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['system', 'user', 'assistant'] },
              content: { type: 'string' }
            },
            required: ['role', 'content']
          }
        },
        model: {
          type: 'string',
          description: 'Optional local model identifier.'
        }
      },
      required: ['messages']
    }
  },
  {
    name: 'route_task',
    description: 'Classify task complexity and dynamically determine whether to route to local GPU ($0) or escalate to metered cloud frontier based on the 85% reasoning threshold.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The user prompt or agent task to analyze.'
        },
        execute: {
          type: 'boolean',
          description: 'Whether to immediately execute the routed task (default: false).'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'check_gpu_health',
    description: 'Probe connection status, latency, available models, and VRAM across all local inference servers (Ollama, vLLM, LM Studio, ComfyUI, Whisper).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_savings_stats',
    description: 'Retrieve the real-time token economics ledger showing total local requests, prompt/completion tokens, dollar savings vs cloud baseline, and GPU throughput.',
    inputSchema: {
      type: 'object',
      properties: {
        baselineModel: {
          type: 'string',
          description: 'Optional cloud baseline model to compare against (e.g. claude-3-5-sonnet, gpt-4o, gpt-5-sol).'
        }
      }
    }
  },
  {
    name: 'comfy_generate_image',
    description: 'Dispatch a local text-to-image workflow to ComfyUI running on local GPU.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Visual description of the image to generate.'
        },
        negativePrompt: {
          type: 'string',
          description: 'Negative prompt for unwanted artifacts.'
        },
        width: {
          type: 'number',
          description: 'Image width in pixels (default: 512).'
        },
        height: {
          type: 'number',
          description: 'Image height in pixels (default: 512).'
        },
        steps: {
          type: 'number',
          description: 'Diffusion sampling steps (default: 20).'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'transcribe_audio',
    description: 'Transcribe audio via local Whisper / faster-whisper server at $0 compute cost.',
    inputSchema: {
      type: 'object',
      properties: {
        audioBase64: {
          type: 'string',
          description: 'Base64-encoded WAV/MP3 audio payload.'
        },
        language: {
          type: 'string',
          description: 'Optional ISO language code (e.g. en, es, fr).'
        }
      },
      required: ['audioBase64']
    }
  }
];

export class MCPToolExecutor {
  readonly router: LocalAgentRouter;
  readonly adapters: AdapterRegistry;
  readonly ledger: TokenLedger;

  constructor(options: { router?: LocalAgentRouter; adapters?: AdapterRegistry; ledger?: TokenLedger } = {}) {
    this.router = options.router || new LocalAgentRouter();
    this.adapters = options.adapters || this.router.adapters;
    this.ledger = options.ledger || this.router.ledger;
  }

  async executeTool(name: string, args: Record<string, any>): Promise<any> {
    switch (name) {
      case 'local_generate': {
        const prompt = args.prompt;
        const result = await this.router.execute(prompt, {
          preferredModel: args.model,
          systemPrompt: args.systemPrompt,
          temperature: args.temperature,
          maxTokens: args.maxTokens
        });
        return {
          text: result.text,
          model: result.modelUsed,
          adapter: result.adapterUsed,
          tokens: result.actualTokens,
          savingsDollars: result.dollarSavings,
          latencyMs: result.durationMs
        };
      }

      case 'local_chat': {
        const messages = args.messages || [];
        const adapter = await this.adapters.getFirstHealthyLLMAdapter();
        if (!adapter) {
          throw new Error('No local LLM inference engines (Ollama/vLLM/LMStudio) are currently online.');
        }
        const chatResult = await adapter.chat(messages, { model: args.model });
        this.ledger.record({
          taskType: 'local_chat',
          model: chatResult.model,
          isLocal: true,
          adapter: adapter.type,
          promptTokens: chatResult.promptTokens,
          completionTokens: chatResult.completionTokens,
          durationMs: chatResult.durationMs,
          tokensPerSecond: chatResult.tokensPerSecond
        });
        return chatResult;
      }

      case 'route_task': {
        const prompt = args.prompt;
        const decision = await this.router.evaluate(prompt);
        if (args.execute) {
          const execReceipt = await this.router.execute(prompt);
          return {
            decision,
            execution: execReceipt
          };
        }
        return { decision };
      }

      case 'check_gpu_health': {
        const health = await this.adapters.probeAll();
        return health;
      }

      case 'get_savings_stats': {
        if (args.baselineModel) {
          this.ledger.setBaselineModel(args.baselineModel);
        }
        return {
          summary: this.ledger.getSummary(),
          asciiDashboard: this.ledger.formatAsciiDashboard()
        };
      }

      case 'comfy_generate_image': {
        const imageResult = await this.adapters.comfyui.generateImage({
          prompt: args.prompt,
          negativePrompt: args.negativePrompt,
          width: args.width,
          height: args.height,
          steps: args.steps
        });
        return imageResult;
      }

      case 'transcribe_audio': {
        const buffer = Buffer.from(args.audioBase64, 'base64');
        const transcript = await this.adapters.whisper.transcribe(buffer, {
          language: args.language
        });
        return transcript;
      }

      default:
        throw new Error(`Unknown MCP tool: ${name}`);
    }
  }
}

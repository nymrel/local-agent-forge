/**
 * Cloud Model Pricing Baselines (Per 1 Million Tokens in USD)
 * Used to calculate real-time dollar savings achieved by local GPU execution
 */

export interface ModelPricing {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google' | 'local';
  inputPricePerM: number;
  outputPricePerM: number;
  description: string;
}

export const CLOUD_BASELINES: Record<string, ModelPricing> = {
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    inputPricePerM: 3.00,
    outputPricePerM: 15.00,
    description: 'Industry standard frontier coding and reasoning model'
  },
  'claude-3-opus': {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus / 3.7',
    provider: 'anthropic',
    inputPricePerM: 15.00,
    outputPricePerM: 75.00,
    description: 'High-tier heavy reasoning and synthesis model'
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    inputPricePerM: 2.50,
    outputPricePerM: 10.00,
    description: 'OpenAI flagship multimodal reasoning model'
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    provider: 'openai',
    inputPricePerM: 0.15,
    outputPricePerM: 0.60,
    description: 'Fast lightweight cloud utility model'
  },
  'gpt-5-sol': {
    id: 'gpt-5-sol',
    name: 'GPT-5.6 Sol / Frontier Reasoning',
    provider: 'openai',
    inputPricePerM: 5.00,
    outputPricePerM: 20.00,
    description: 'Next-gen enterprise high-reasoning model'
  },
  'gemini-1-5-pro': {
    id: 'gemini-1-5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    inputPricePerM: 3.50,
    outputPricePerM: 10.50,
    description: 'Long-context multimodal model'
  },
  'local-gpu': {
    id: 'local-gpu',
    name: 'Local GPU (Zero Cloud)',
    provider: 'local',
    inputPricePerM: 0.00,
    outputPricePerM: 0.00,
    description: 'On-device RTX / Apple Silicon / Datacenter GPU ($0 marginal token cost)'
  }
};

export const DEFAULT_BASELINE_MODEL = 'claude-3-5-sonnet';

export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  pricing: ModelPricing
): number {
  const inputCost = (promptTokens / 1_000_000) * pricing.inputPricePerM;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPricePerM;
  return Math.round((inputCost + outputCost) * 100000) / 100000;
}

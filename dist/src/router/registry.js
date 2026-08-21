"use strict";
/**
 * Local Model Capabilities Registry
 * Maps model tags to context limits, VRAM requirements, and strengths
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCAL_MODELS_REGISTRY = void 0;
exports.getBestLocalModelForTask = getBestLocalModelForTask;
exports.LOCAL_MODELS_REGISTRY = {
    'qwen2.5-coder:7b': {
        name: 'Qwen 2.5 Coder 7B',
        family: 'qwen',
        parameters: '7B',
        contextWindow: 32768,
        minVramGb: 6,
        recommendedTask: ['code_gen', 'refactor', 'unit_test', 'debugging'],
        tokensPerSecEstimate: 75
    },
    'qwen2.5-coder:14b': {
        name: 'Qwen 2.5 Coder 14B',
        family: 'qwen',
        parameters: '14B',
        contextWindow: 32768,
        minVramGb: 10,
        recommendedTask: ['code_gen', 'refactor', 'architecture', 'debugging'],
        tokensPerSecEstimate: 50
    },
    'qwen2.5-coder:32b': {
        name: 'Qwen 2.5 Coder 32B',
        family: 'qwen',
        parameters: '32B',
        contextWindow: 32768,
        minVramGb: 22,
        recommendedTask: ['code_gen', 'complex_refactor', 'multi_file'],
        tokensPerSecEstimate: 30
    },
    'deepseek-r1:8b': {
        name: 'DeepSeek R1 Distill 8B',
        family: 'deepseek',
        parameters: '8B',
        contextWindow: 65536,
        minVramGb: 6,
        recommendedTask: ['deep_reasoning', 'math', 'logic_puzzles'],
        tokensPerSecEstimate: 60
    },
    'deepseek-r1:14b': {
        name: 'DeepSeek R1 Distill 14B',
        family: 'deepseek',
        parameters: '14B',
        contextWindow: 65536,
        minVramGb: 10,
        recommendedTask: ['deep_reasoning', 'algorithmic_proofs'],
        tokensPerSecEstimate: 45
    },
    'llama3.3:70b': {
        name: 'Llama 3.3 70B Instruct',
        family: 'llama',
        parameters: '70B',
        contextWindow: 131072,
        minVramGb: 40,
        recommendedTask: ['general', 'synthesis', 'complex_reasoning'],
        tokensPerSecEstimate: 20
    },
    'mistral-nemo:12b': {
        name: 'Mistral Nemo 12B',
        family: 'mistral',
        parameters: '12B',
        contextWindow: 128000,
        minVramGb: 8,
        recommendedTask: ['general', 'chat', 'summarization'],
        tokensPerSecEstimate: 55
    }
};
function getBestLocalModelForTask(category, availableModels) {
    if (availableModels.length === 0)
        return 'qwen2.5-coder:7b';
    // Check if any preferred model is already loaded locally
    const codingPreferences = ['qwen2.5-coder:14b', 'qwen2.5-coder:7b', 'deepseek-r1:14b', 'deepseek-r1:8b', 'mistral-nemo:12b', 'llama3.3:70b'];
    for (const pref of codingPreferences) {
        if (availableModels.some(m => m.includes(pref) || pref.includes(m))) {
            return availableModels.find(m => m.includes(pref) || pref.includes(m));
        }
    }
    // Fallback to first available local model
    return availableModels[0];
}
//# sourceMappingURL=registry.js.map
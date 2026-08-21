/**
 * Heuristic Task Classifier
 * Analyzes prompt semantics, code structure, token estimates, and reasoning demands
 */

import {
  TaskComplexity,
  TaskClassification,
  REASONING_ESCALATION_THRESHOLD
} from './types.js';

export class TaskClassifier {
  private lowComplexityPatterns = [
    { pattern: /\b(format|prettier|beautify|lint|indent)\b/i, weight: -0.25, name: 'formatting' },
    { pattern: /\b(docstring|jsdoc|comment|document this|add comments)\b/i, weight: -0.20, name: 'documentation' },
    { pattern: /\b(unit test|test case|mock|jest|pytest|assert)\b/i, weight: -0.10, name: 'unit_testing' },
    { pattern: /\b(regex|regular expression|pattern match)\b/i, weight: -0.15, name: 'regex_pattern' },
    { pattern: /\b(json|yaml|csv|xml|convert to json|parse json)\b/i, weight: -0.20, name: 'data_serialization' },
    { pattern: /\b(crud|create read update delete|boilerplate|skeleton)\b/i, weight: -0.15, name: 'crud_boilerplate' },
    { pattern: /\b(rename|refactor variable|extract variable)\b/i, weight: -0.20, name: 'simple_rename' },
    { pattern: /\b(translate|grammar|typo|spell check)\b/i, weight: -0.25, name: 'translation_text' },
    { pattern: /\b(css|tailwind|html markup|style this)\b/i, weight: -0.15, name: 'styling_markup' },
    { pattern: /\b(typescript types|type definition|interface for)\b/i, weight: -0.10, name: 'type_generation' },
    { pattern: /\b(sql query|select from|join table)\b/i, weight: -0.05, name: 'basic_sql' }
  ];

  private highReasoningPatterns = [
    { pattern: /\b(formal verification|theorem prove|z3|coq|lean 4|isabelle)\b/i, weight: 0.50, name: 'formal_verification' },
    { pattern: /\b(novel cryptographic protocol|zero[- ]knowledge proof|zksnark|elliptic curve)\b/i, weight: 0.50, name: 'novel_cryptography' },
    { pattern: /\b(distributed consensus|raft algorithm|paxos|byzantine fault)\b/i, weight: 0.45, name: 'distributed_consensus' },
    { pattern: /\b(mathematical proof|rigorous proof|combinatorics proof|topology)\b/i, weight: 0.40, name: 'math_proof' },
    { pattern: /\b(multi[- ]repository architectural overhaul|monorepo split|enterprise system migration)\b/i, weight: 0.40, name: 'enterprise_migration' },
    { pattern: /\b(kernel driver|low[- ]level memory safety proof|race condition teardown|assembly exploit)\b/i, weight: 0.40, name: 'low_level_security' },
    { pattern: /\b(category theory|type theory soundness|compiler optimization pass)\b/i, weight: 0.35, name: 'compiler_theory' },
    { pattern: /\b(quantum computing|qubit simulation|shor's algorithm)\b/i, weight: 0.40, name: 'quantum_computation' }
  ];

  classify(prompt: string, context?: { fileCount?: number; historyLength?: number }): TaskClassification {
    const text = prompt.trim();
    const triggers: string[] = [];
    let baseScore = 0.40; // Default baseline: ROUTINE code/general task

    // 1. Calculate Code Density
    const codeDensity = this.calculateCodeDensity(text);

    // 2. Evaluate Low-Complexity Heuristics
    for (const item of this.lowComplexityPatterns) {
      if (item.pattern.test(text)) {
        baseScore += item.weight;
        triggers.push(`low:${item.name}`);
      }
    }

    // 3. Evaluate High-Reasoning Heuristics
    for (const item of this.highReasoningPatterns) {
      if (item.pattern.test(text)) {
        baseScore += item.weight;
        triggers.push(`high:${item.name}`);
      }
    }

    // 4. Multi-File / Context Complexity
    if (context?.fileCount && context.fileCount > 5) {
      baseScore += 0.15;
      triggers.push('context:multi_file');
    }

    // 5. Length Adjustments
    const charCount = text.length;
    const estPromptTokens = Math.ceil(charCount / 4);
    let estCompletionTokens = 400;

    const hasHighReasoning = triggers.some(t => t.startsWith('high:'));

    if (charCount > 4000) {
      baseScore += 0.10;
      estCompletionTokens = 1200;
      triggers.push('length:extended_context');
    } else if (charCount < 150 && !hasHighReasoning) {
      baseScore -= 0.05;
      estCompletionTokens = 200;
      triggers.push('length:compact');
    }

    // Clamp score between 0.05 and 0.99
    const score = Math.max(0.05, Math.min(0.99, Math.round(baseScore * 100) / 100));

    // Determine Complexity Bucket
    let complexity: TaskComplexity;
    if (score <= 0.20) {
      complexity = TaskComplexity.TRIVIAL;
    } else if (score <= 0.50) {
      complexity = TaskComplexity.ROUTINE;
    } else if (score <= 0.70) {
      complexity = TaskComplexity.MODERATE;
    } else if (score <= REASONING_ESCALATION_THRESHOLD) {
      complexity = TaskComplexity.COMPLEX;
    } else {
      complexity = TaskComplexity.FRONTIER_REASONING;
    }

    // Determine category
    const category = this.determineCategory(text, triggers);

    // Model recommendations
    const recommendedLocalModel = this.recommendLocalModel(category, complexity);
    const recommendedCloudModel = score > REASONING_ESCALATION_THRESHOLD ? 'claude-3-5-sonnet' : 'gpt-4o-mini';

    const rationale = score > REASONING_ESCALATION_THRESHOLD
      ? `Task complexity score (${score}) exceeds ${REASONING_ESCALATION_THRESHOLD * 100}% threshold due to ${triggers.filter(t => t.startsWith('high:')).join(', ') || 'deep multi-layered reasoning requirements'}. Escalating to cloud frontier.`
      : `Task complexity score (${score}) is within local GPU capability envelope (<= ${REASONING_ESCALATION_THRESHOLD * 100}%). Routing to local GPU at $0 token cost.`;

    return {
      score,
      complexity,
      triggers,
      rationale,
      codeDensity,
      estimatedPromptTokens: estPromptTokens,
      estimatedCompletionTokens: estCompletionTokens,
      recommendedLocalModel,
      recommendedCloudModel,
      taskCategory: category
    };
  }

  private calculateCodeDensity(text: string): number {
    const codeSymbols = /[{}[\]();=<>+\-*/!&|%$#@`]/g;
    const matches = text.match(codeSymbols);
    if (!matches || text.length === 0) return 0;
    return Math.min(1, Math.round((matches.length / text.length) * 100) / 100);
  }

  private determineCategory(
    text: string,
    triggers: string[]
  ): 'code_gen' | 'refactor' | 'unit_test' | 'documentation' | 'debugging' | 'deep_reasoning' | 'general' {
    if (triggers.some(t => t.startsWith('high:'))) return 'deep_reasoning';
    if (/\b(test|jest|pytest|assert|spec)\b/i.test(text)) return 'unit_test';
    if (/\b(doc|comment|readme|jsdoc)\b/i.test(text)) return 'documentation';
    if (/\b(bug|fix|error|exception|debug|traceback)\b/i.test(text)) return 'debugging';
    if (/\b(refactor|cleanup|simplify|restructure)\b/i.test(text)) return 'refactor';
    if (/\b(function|class|code|implement|create|build|api|endpoint)\b/i.test(text)) return 'code_gen';
    return 'general';
  }

  private recommendLocalModel(
    category: string,
    complexity: TaskComplexity
  ): string {
    switch (category) {
      case 'code_gen':
      case 'refactor':
      case 'debugging':
      case 'unit_test':
        return complexity === TaskComplexity.COMPLEX ? 'qwen2.5-coder:14b' : 'qwen2.5-coder:7b';
      case 'deep_reasoning':
        return 'deepseek-r1:14b';
      default:
        return 'llama3.3:70b';
    }
  }
}

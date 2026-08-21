/**
 * Heuristic Task Classifier
 * Analyzes prompt semantics, code structure, token estimates, and reasoning demands
 */
import { TaskClassification } from './types.js';
export declare class TaskClassifier {
    private lowComplexityPatterns;
    private highReasoningPatterns;
    classify(prompt: string, context?: {
        fileCount?: number;
        historyLength?: number;
    }): TaskClassification;
    private calculateCodeDensity;
    private determineCategory;
    private recommendLocalModel;
}
//# sourceMappingURL=classifier.d.ts.map
"use strict";
/**
 * Router Types & Routing Decision Contracts
 * Copyright (c) 2026 Nymrel / JalenBuilds LLC
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.REASONING_ESCALATION_THRESHOLD = exports.TaskComplexity = void 0;
var TaskComplexity;
(function (TaskComplexity) {
    TaskComplexity["TRIVIAL"] = "TRIVIAL";
    TaskComplexity["ROUTINE"] = "ROUTINE";
    TaskComplexity["MODERATE"] = "MODERATE";
    TaskComplexity["COMPLEX"] = "COMPLEX";
    TaskComplexity["FRONTIER_REASONING"] = "FRONTIER_REASONING"; // > 0.85 (Escalate to Cloud Frontier)
})(TaskComplexity || (exports.TaskComplexity = TaskComplexity = {}));
exports.REASONING_ESCALATION_THRESHOLD = 0.85; // 85% Complexity Threshold
//# sourceMappingURL=types.js.map
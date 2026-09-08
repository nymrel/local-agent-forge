"""
Dynamic Model Router and Heuristic Task Classifier for Python
"""

import re
from enum import Enum
from dataclasses import dataclass
from typing import List, Optional
from .adapters import AdapterRegistry
from .economics import TokenLedger, CLOUD_BASELINES, calculate_cost


class TaskComplexity(str, Enum):
    TRIVIAL = "TRIVIAL"
    ROUTINE = "ROUTINE"
    MODERATE = "MODERATE"
    COMPLEX = "COMPLEX"
    FRONTIER_REASONING = "FRONTIER_REASONING"


REASONING_ESCALATION_THRESHOLD = 0.85


@dataclass
class TaskClassification:
    score: float
    complexity: TaskComplexity
    triggers: List[str]
    rationale: str
    code_density: float
    estimated_prompt_tokens: int
    estimated_completion_tokens: int
    recommended_local_model: str
    recommended_cloud_model: str
    task_category: str


@dataclass
class RoutingDecision:
    route: str  # 'LOCAL' or 'CLOUD'
    target_model: str
    adapter_type: str
    endpoint: str
    complexity_score: float
    reasoning_threshold: float
    task_complexity: TaskComplexity
    task_category: str
    rationale: str
    triggers: List[str]
    cloud_escalated: bool
    estimated_prompt_tokens: int
    estimated_completion_tokens: int
    estimated_dollars_saved: float
    escalation_reason: Optional[str] = None


class TaskClassifier:
    def __init__(self):
        self.low_complexity = [
            (re.compile(r"\b(format|prettier|beautify|lint|indent)\b", re.I), -0.25, "formatting"),
            (re.compile(r"\b(docstring|jsdoc|comment|document this|add comments)\b", re.I), -0.20, "documentation"),
            (re.compile(r"\b(unit test|test case|mock|pytest|jest|assert)\b", re.I), -0.10, "unit_testing"),
            (re.compile(r"\b(regex|regular expression|pattern match)\b", re.I), -0.15, "regex_pattern"),
            (re.compile(r"\b(json|yaml|csv|xml|convert to json|parse json)\b", re.I), -0.20, "data_serialization"),
            (re.compile(r"\b(crud|boilerplate|skeleton)\b", re.I), -0.15, "crud_boilerplate"),
            (re.compile(r"\b(rename|refactor variable|extract variable)\b", re.I), -0.20, "simple_rename"),
            (re.compile(r"\b(translate|grammar|typo|spell check)\b", re.I), -0.25, "translation_text"),
            (re.compile(r"\b(css|tailwind|html markup|style this)\b", re.I), -0.15, "styling_markup"),
        ]

        self.high_reasoning = [
            (re.compile(r"\b(formal verification|theorem prove|z3|coq|lean 4|isabelle)\b", re.I), 0.50, "formal_verification"),
            (re.compile(r"\b(novel cryptographic protocol|zero[- ]knowledge proof|zksnark|elliptic curve)\b", re.I), 0.50, "novel_cryptography"),
            (re.compile(r"\b(distributed consensus|raft algorithm|paxos|byzantine fault)\b", re.I), 0.45, "distributed_consensus"),
            (re.compile(r"\b(mathematical proof|rigorous proof|combinatorics proof|topology)\b", re.I), 0.40, "math_proof"),
            (re.compile(r"\b(multi[- ]repository architectural overhaul|monorepo split|enterprise system migration)\b", re.I), 0.40, "enterprise_migration"),
            (re.compile(r"\b(kernel driver|low[- ]level memory safety proof|race condition teardown)\b", re.I), 0.40, "low_level_security"),
        ]

    def classify(self, prompt: str) -> TaskClassification:
        text = prompt.strip()
        triggers = []
        base_score = 0.40

        for pattern, weight, name in self.low_complexity:
            if pattern.search(text):
                base_score += weight
                triggers.append(f"low:{name}")

        for pattern, weight, name in self.high_reasoning:
            if pattern.search(text):
                base_score += weight
                triggers.append(f"high:{name}")

        char_count = len(text)
        has_high_reasoning = any(t.startswith("high:") for t in triggers)

        if char_count > 4000:
            base_score += 0.10
            triggers.append("length:extended_context")
        elif char_count < 150 and not has_high_reasoning:
            base_score -= 0.05
            triggers.append("length:compact")

        score = max(0.05, min(0.99, round(base_score, 2)))

        if score <= 0.20:
            complexity = TaskComplexity.TRIVIAL
        elif score <= 0.50:
            complexity = TaskComplexity.ROUTINE
        elif score <= 0.70:
            complexity = TaskComplexity.MODERATE
        elif score <= REASONING_ESCALATION_THRESHOLD:
            complexity = TaskComplexity.COMPLEX
        else:
            complexity = TaskComplexity.FRONTIER_REASONING

        category = "deep_reasoning" if any(t.startswith("high:") for t in triggers) else "code_gen"
        rec_local = "deepseek-r1:14b" if category == "deep_reasoning" else "qwen2.5-coder:7b"
        rec_cloud = "claude-3-5-sonnet" if score > REASONING_ESCALATION_THRESHOLD else "gpt-4o-mini"

        rationale = (
            f"Complexity score ({score}) exceeds {REASONING_ESCALATION_THRESHOLD*100}% threshold. Escalating to cloud."
            if score > REASONING_ESCALATION_THRESHOLD
            else f"Complexity score ({score}) is within local GPU envelope (<= {REASONING_ESCALATION_THRESHOLD*100}%). Routing local at $0."
        )

        return TaskClassification(
            score=score,
            complexity=complexity,
            triggers=triggers,
            rationale=rationale,
            code_density=0.2,
            estimated_prompt_tokens=max(1, len(text) // 4),
            estimated_completion_tokens=400,
            recommended_local_model=rec_local,
            recommended_cloud_model=rec_cloud,
            task_category=category,
        )


class LocalAgentRouter:
    def __init__(self, adapters: Optional[AdapterRegistry] = None, ledger: Optional[TokenLedger] = None):
        self.adapters = adapters or AdapterRegistry()
        self.ledger = ledger or TokenLedger()
        self.classifier = TaskClassifier()

    def evaluate(self, prompt: str) -> RoutingDecision:
        classification = self.classifier.classify(prompt)
        health = self.adapters.probe_all()

        active_adapter = None
        target_model = classification.recommended_local_model

        if health["ollama"].connected:
            active_adapter = "ollama"
            endpoint = health["ollama"].endpoint
            if health["ollama"].available_models:
                target_model = health["ollama"].available_models[0]
        elif health["vllm"].connected:
            active_adapter = "vllm"
            endpoint = health["vllm"].endpoint
            if health["vllm"].available_models:
                target_model = health["vllm"].available_models[0]
        elif health["lmstudio"].connected:
            active_adapter = "lmstudio"
            endpoint = health["lmstudio"].endpoint
            if health["lmstudio"].available_models:
                target_model = health["lmstudio"].available_models[0]

        est_p = classification.estimated_prompt_tokens
        est_c = classification.estimated_completion_tokens
        baseline_pricing = CLOUD_BASELINES.get(self.ledger.baseline_key, CLOUD_BASELINES["claude-3-5-sonnet"])
        est_savings = calculate_cost(est_p, est_c, baseline_pricing)

        if classification.score > REASONING_ESCALATION_THRESHOLD:
            return RoutingDecision(
                route="CLOUD",
                target_model=classification.recommended_cloud_model,
                adapter_type="cloud_frontier",
                endpoint="https://api.anthropic.com/v1",
                complexity_score=classification.score,
                reasoning_threshold=REASONING_ESCALATION_THRESHOLD,
                task_complexity=classification.complexity,
                task_category=classification.task_category,
                rationale=classification.rationale,
                triggers=classification.triggers,
                cloud_escalated=True,
                escalation_reason=f"Reasoning complexity score ({classification.score}) > {REASONING_ESCALATION_THRESHOLD*100}% threshold",
                estimated_prompt_tokens=est_p,
                estimated_completion_tokens=est_c,
                estimated_dollars_saved=0.0,
            )

        if active_adapter:
            return RoutingDecision(
                route="LOCAL",
                target_model=target_model,
                adapter_type=active_adapter,
                endpoint=endpoint,
                complexity_score=classification.score,
                reasoning_threshold=REASONING_ESCALATION_THRESHOLD,
                task_complexity=classification.complexity,
                task_category=classification.task_category,
                rationale=classification.rationale,
                triggers=classification.triggers,
                cloud_escalated=False,
                estimated_prompt_tokens=est_p,
                estimated_completion_tokens=est_c,
                estimated_dollars_saved=est_savings,
            )

        return RoutingDecision(
            route="CLOUD",
            target_model="claude-3-5-sonnet",
            adapter_type="cloud_frontier",
            endpoint="https://api.anthropic.com/v1",
            complexity_score=classification.score,
            reasoning_threshold=REASONING_ESCALATION_THRESHOLD,
            task_complexity=classification.complexity,
            task_category=classification.task_category,
            rationale="Local servers offline; falling back to cloud frontier.",
            triggers=classification.triggers + ["fallback:no_local_servers_online"],
            cloud_escalated=True,
            escalation_reason="No local inference engines reachable on localhost",
            estimated_prompt_tokens=est_p,
            estimated_completion_tokens=est_c,
            estimated_dollars_saved=0.0,
        )

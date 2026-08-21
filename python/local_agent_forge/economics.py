"""
Token Economics and Financial Savings Ledger for Python
"""

import time
import math
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any


@dataclass
class ModelPricing:
    id: str
    name: str
    provider: str
    input_price_per_m: float
    output_price_per_m: float
    description: str


CLOUD_BASELINES: Dict[str, ModelPricing] = {
    "claude-3-5-sonnet": ModelPricing(
        id="claude-3-5-sonnet",
        name="Claude 3.5 Sonnet",
        provider="anthropic",
        input_price_per_m=3.00,
        output_price_per_m=15.00,
        description="Frontier coding and reasoning model baseline",
    ),
    "claude-3-opus": ModelPricing(
        id="claude-3-opus",
        name="Claude 3 Opus / 3.7",
        provider="anthropic",
        input_price_per_m=15.00,
        output_price_per_m=75.00,
        description="High-tier reasoning baseline",
    ),
    "gpt-4o": ModelPricing(
        id="gpt-4o",
        name="GPT-4o",
        provider="openai",
        input_price_per_m=2.50,
        output_price_per_m=10.00,
        description="OpenAI flagship multimodal reasoning model",
    ),
    "gpt-4o-mini": ModelPricing(
        id="gpt-4o-mini",
        name="GPT-4o mini",
        provider="openai",
        input_price_per_m=0.15,
        output_price_per_m=0.60,
        description="Fast lightweight cloud utility model",
    ),
    "gpt-5-sol": ModelPricing(
        id="gpt-5-sol",
        name="GPT-5.6 Sol",
        provider="openai",
        input_price_per_m=5.00,
        output_price_per_m=20.00,
        description="Next-gen reasoning baseline",
    ),
    "local-gpu": ModelPricing(
        id="local-gpu",
        name="Local GPU ($0)",
        provider="local",
        input_price_per_m=0.00,
        output_price_per_m=0.00,
        description="On-device local compute ($0 marginal token cost)",
    ),
}

DEFAULT_BASELINE_MODEL = "claude-3-5-sonnet"


def calculate_cost(prompt_tokens: int, completion_tokens: int, pricing: ModelPricing) -> float:
    input_cost = (prompt_tokens / 1_000_000.0) * pricing.input_price_per_m
    output_cost = (completion_tokens / 1_000_000.0) * pricing.output_price_per_m
    return round(input_cost + output_cost, 6)


@dataclass
class LedgerTransaction:
    id: str
    timestamp: float
    task_type: str
    model: str
    is_local: bool
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    duration_ms: float
    tokens_per_second: float
    baseline_model: str
    actual_cost: float
    baseline_cost: float
    saved_dollars: float


class TokenLedger:
    def __init__(self, baseline_model: str = DEFAULT_BASELINE_MODEL):
        self.baseline_key = baseline_model
        self.transactions: List[LedgerTransaction] = []

    def set_baseline(self, baseline_model: str):
        if baseline_model in CLOUD_BASELINES:
            self.baseline_key = baseline_model

    def record(
        self,
        model: str,
        is_local: bool,
        prompt_tokens: int,
        completion_tokens: int,
        duration_ms: float,
        task_type: str = "code_generation",
        tokens_per_second: Optional[float] = None,
        baseline_override: Optional[str] = None,
    ) -> LedgerTransaction:
        b_key = baseline_override or self.baseline_key
        baseline_pricing = CLOUD_BASELINES.get(b_key, CLOUD_BASELINES[DEFAULT_BASELINE_MODEL])
        local_pricing = CLOUD_BASELINES["local-gpu"]

        actual_cost = 0.0 if is_local else calculate_cost(prompt_tokens, completion_tokens, baseline_pricing)
        baseline_cost = calculate_cost(prompt_tokens, completion_tokens, baseline_pricing)
        saved_dollars = max(0.0, round(baseline_cost - actual_cost, 6))

        tps = tokens_per_second or (completion_tokens / (max(1.0, duration_ms) / 1000.0))

        tx = LedgerTransaction(
            id=f"tx_{int(time.time()*1000)}",
            timestamp=time.time(),
            task_type=task_type,
            model=model,
            is_local=is_local,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            duration_ms=duration_ms,
            tokens_per_second=round(tps, 1),
            baseline_model=baseline_pricing.name,
            actual_cost=actual_cost,
            baseline_cost=baseline_cost,
            saved_dollars=saved_dollars,
        )
        self.transactions.append(tx)
        return tx

    def get_summary(self) -> Dict[str, Any]:
        total = len(self.transactions)
        if total == 0:
            return {
                "total_requests": 0,
                "local_requests": 0,
                "cloud_requests": 0,
                "local_compute_ratio_pct": 100.0,
                "total_prompt_tokens": 0,
                "total_completion_tokens": 0,
                "total_tokens": 0,
                "total_actual_cost": 0.0,
                "total_baseline_cost": 0.0,
                "total_savings_dollars": 0.0,
                "avg_latency_ms": 0.0,
                "avg_tps": 0.0,
            }

        local_reqs = sum(1 for tx in self.transactions if tx.is_local)
        total_p_tokens = sum(tx.prompt_tokens for tx in self.transactions)
        total_c_tokens = sum(tx.completion_tokens for tx in self.transactions)
        total_act = sum(tx.actual_cost for tx in self.transactions)
        total_base = sum(tx.baseline_cost for tx in self.transactions)
        total_save = sum(tx.saved_dollars for tx in self.transactions)
        avg_lat = sum(tx.duration_ms for tx in self.transactions) / total
        avg_tps = sum(tx.tokens_per_second for tx in self.transactions) / total

        return {
            "total_requests": total,
            "local_requests": local_reqs,
            "cloud_requests": total - local_reqs,
            "local_compute_ratio_pct": round((local_reqs / total) * 100.0, 1),
            "total_prompt_tokens": total_p_tokens,
            "total_completion_tokens": total_c_tokens,
            "total_tokens": total_p_tokens + total_c_tokens,
            "total_actual_cost": round(total_act, 4),
            "total_baseline_cost": round(total_base, 4),
            "total_savings_dollars": round(total_save, 4),
            "avg_latency_ms": round(avg_lat, 1),
            "avg_tps": round(avg_tps, 1),
        }

    def format_ascii_dashboard(self) -> str:
        s = self.get_summary()
        baseline = CLOUD_BASELINES.get(self.baseline_key, CLOUD_BASELINES[DEFAULT_BASELINE_MODEL])

        return f"""
================================================================================
                    LOCAL AGENT FORGE - TOKEN ECONOMICS LEDGER (PY)             
================================================================================
  Baseline Benchmark       : {baseline.name} (${baseline.input_price_per_m}/${baseline.output_price_per_m} per 1M)
  Total Requests Handled   : {s['total_requests']:,}
  Local GPU Dispatched     : {s['local_requests']:,} ({s['local_compute_ratio_pct']}%) -> $0 Compute
  Cloud Escalated          : {s['cloud_requests']:,}
--------------------------------------------------------------------------------
  Total Tokens Processed   : {s['total_tokens']:,} tokens
    - Prompt Tokens        : {s['total_prompt_tokens']:,}
    - Completion Tokens    : {s['total_completion_tokens']:,}
--------------------------------------------------------------------------------
  Actual Compute Spent     : ${s['total_actual_cost']:.4f}
  Hypothetical Cloud Cost  : ${s['total_baseline_cost']:.4f}
  NET DOLLARS SAVED        : ${s['total_savings_dollars']:.4f}
--------------------------------------------------------------------------------
  Avg Latency              : {s['avg_latency_ms']} ms
  Avg GPU Throughput       : {s['avg_tps']} tokens/sec
================================================================================
""".strip()

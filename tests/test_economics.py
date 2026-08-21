"""
Unit tests for Python token economics ledger
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../python")))

from local_agent_forge.economics import TokenLedger, CLOUD_BASELINES, calculate_cost


class TestEconomics(unittest.TestCase):
    def test_calculate_cost(self):
        sonnet = CLOUD_BASELINES["claude-3-5-sonnet"]
        cost = calculate_cost(10000, 2000, sonnet)
        self.assertEqual(cost, 0.06)

        local = CLOUD_BASELINES["local-gpu"]
        self.assertEqual(calculate_cost(10000, 2000, local), 0.0)

    def test_ledger_record_and_summary(self):
        ledger = TokenLedger("claude-3-5-sonnet")
        tx = ledger.record(
            model="qwen2.5-coder:7b",
            is_local=True,
            prompt_tokens=5000,
            completion_tokens=1000,
            duration_ms=400.0,
        )

        self.assertTrue(tx.is_local)
        self.assertEqual(tx.actual_cost, 0.0)
        self.assertEqual(tx.baseline_cost, 0.03)
        self.assertEqual(tx.saved_dollars, 0.03)

        summary = ledger.get_summary()
        self.assertEqual(summary["total_requests"], 1)
        self.assertEqual(summary["local_requests"], 1)
        self.assertEqual(summary["total_tokens"], 6000)
        self.assertGreater(summary["total_savings_dollars"], 0.0)

        dashboard = ledger.format_ascii_dashboard()
        self.assertIn("LOCAL AGENT FORGE", dashboard)
        self.assertIn("NET DOLLARS SAVED", dashboard)


if __name__ == "__main__":
    unittest.main()

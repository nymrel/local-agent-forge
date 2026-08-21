"""
Unit tests for Python dynamic router and heuristic classification
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../python")))

from local_agent_forge.router import (
    TaskClassifier,
    LocalAgentRouter,
    TaskComplexity,
    REASONING_ESCALATION_THRESHOLD,
)


class TestRouter(unittest.TestCase):
    def setUp(self):
        self.classifier = TaskClassifier()
        self.router = LocalAgentRouter()

    def test_low_complexity_classification(self):
        res = self.classifier.classify("Format this JSON structure and fix indentation")
        self.assertLess(res.score, 0.50)
        self.assertLessEqual(res.score, REASONING_ESCALATION_THRESHOLD)

    def test_routine_unit_testing(self):
        res = self.classifier.classify("Write pytest unit tests and docstrings for database connector")
        self.assertLessEqual(res.score, REASONING_ESCALATION_THRESHOLD)

    def test_high_reasoning_escalation(self):
        res = self.classifier.classify("Formal verification proof for distributed consensus algorithm using Lean 4")
        self.assertGreater(res.score, REASONING_ESCALATION_THRESHOLD)
        self.assertEqual(res.complexity, TaskComplexity.FRONTIER_REASONING)
        self.assertEqual(res.recommended_cloud_model, "claude-3-5-sonnet")

    def test_router_escalation_decision(self):
        prompt = "Formal verification proof for novel cryptographic zero-knowledge protocol"
        decision = self.router.evaluate(prompt)
        self.assertEqual(decision.route, "CLOUD")
        self.assertTrue(decision.cloud_escalated)
        self.assertGreater(decision.complexity_score, 0.85)


if __name__ == "__main__":
    unittest.main()

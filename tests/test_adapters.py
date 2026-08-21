"""
Unit tests for Python adapters and health probing
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../python")))

from local_agent_forge.adapters import (
    OllamaAdapter,
    VLLMAdapter,
    LMStudioAdapter,
    ComfyUIAdapter,
    WhisperAdapter,
    AdapterRegistry,
)


class TestAdapters(unittest.TestCase):
    def test_default_endpoints(self):
        ollama = OllamaAdapter()
        self.assertEqual(ollama.endpoint, "http://127.0.0.1:11434")

        vllm = VLLMAdapter()
        self.assertEqual(vllm.endpoint, "http://127.0.0.1:8000")

        lm = LMStudioAdapter()
        self.assertEqual(lm.endpoint, "http://127.0.0.1:1234")

        comfy = ComfyUIAdapter()
        self.assertEqual(comfy.endpoint, "http://127.0.0.1:8188")

        whisper = WhisperAdapter()
        self.assertEqual(whisper.endpoint, "http://127.0.0.1:8080")

    def test_probe_all_graceful_offline(self):
        registry = AdapterRegistry()
        health = registry.probe_all()

        self.assertIn("ollama", health)
        self.assertIn("vllm", health)
        self.assertIn("lmstudio", health)
        self.assertIn("comfyui", health)
        self.assertIn("whisper", health)

        for name, h in health.items():
            self.assertIsInstance(h.connected, bool)
            self.assertIsInstance(h.latency_ms, (int, float))


if __name__ == "__main__":
    unittest.main()

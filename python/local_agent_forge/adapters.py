"""
Local AI Inference Adapters for Python
Supports Ollama, vLLM, LM Studio, ComfyUI, and Whisper
"""

import json
import time
import urllib.request
import urllib.error
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Union


@dataclass
class AdapterHealth:
    connected: bool
    adapter_type: str
    endpoint: str
    latency_ms: float
    available_models: List[str] = field(default_factory=list)
    version: Optional[str] = None
    error: Optional[str] = None
    vram_usage: Optional[Dict[str, int]] = None


@dataclass
class CompletionResult:
    text: str
    model: str
    adapter: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    duration_ms: float
    tokens_per_second: float


class OllamaAdapter:
    def __init__(self, endpoint: str = "http://127.0.0.1:11434", default_model: str = "qwen2.5-coder:7b", timeout: float = 30.0):
        self.endpoint = endpoint.rstrip("/")
        self.default_model = default_model
        self.timeout = timeout
        self.adapter_type = "ollama"

    def check_health(self) -> AdapterHealth:
        start = time.time()
        try:
            req = urllib.request.Request(f"{self.endpoint}/api/tags", headers={"User-Agent": "local-forge"})
            with urllib.request.urlopen(req, timeout=3.0) as response:
                latency_ms = (time.time() - start) * 1000.0
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    models = [m.get("name") for m in data.get("models", [])]
                    return AdapterHealth(
                        connected=True,
                        adapter_type=self.adapter_type,
                        endpoint=self.endpoint,
                        latency_ms=round(latency_ms, 2),
                        available_models=models,
                        version="Ollama Server Active",
                    )
        except Exception as e:
            return AdapterHealth(
                connected=False,
                adapter_type=self.adapter_type,
                endpoint=self.endpoint,
                latency_ms=round((time.time() - start) * 1000.0, 2),
                error=str(e),
            )
        return AdapterHealth(connected=False, adapter_type=self.adapter_type, endpoint=self.endpoint, latency_ms=0)

    def generate(self, prompt: str, model: Optional[str] = None, system_prompt: Optional[str] = None, temperature: float = 0.2, max_tokens: int = 2048) -> CompletionResult:
        target_model = model or self.default_model
        payload = {
            "model": target_model,
            "prompt": prompt,
            "system": system_prompt or "",
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            }
        }
        start = time.time()
        req = urllib.request.Request(
            f"{self.endpoint}/api/generate",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=self.timeout) as response:
            data = json.loads(response.read().decode("utf-8"))
            duration_ms = (time.time() - start) * 1000.0
            text = data.get("response", "")
            prompt_tokens = data.get("prompt_eval_count") or max(1, len(prompt) // 4)
            completion_tokens = data.get("eval_count") or max(1, len(text) // 4)
            tps = (completion_tokens / (duration_ms / 1000.0)) if duration_ms > 0 else 0.0

            return CompletionResult(
                text=text,
                model=target_model,
                adapter=self.adapter_type,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=prompt_tokens + completion_tokens,
                duration_ms=round(duration_ms, 2),
                tokens_per_second=round(tps, 2)
            )


class VLLMAdapter:
    def __init__(self, endpoint: str = "http://127.0.0.1:8000", default_model: str = "meta-llama/Llama-3.3-70B-Instruct", api_key: str = "EMPTY", timeout: float = 30.0):
        self.endpoint = endpoint.rstrip("/")
        self.default_model = default_model
        self.api_key = api_key
        self.timeout = timeout
        self.adapter_type = "vllm"

    def check_health(self) -> AdapterHealth:
        start = time.time()
        try:
            req = urllib.request.Request(
                f"{self.endpoint}/v1/models",
                headers={"Authorization": f"Bearer {self.api_key}", "User-Agent": "local-forge"}
            )
            with urllib.request.urlopen(req, timeout=3.0) as response:
                latency_ms = (time.time() - start) * 1000.0
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    models = [m.get("id") for m in data.get("data", [])]
                    return AdapterHealth(
                        connected=True,
                        adapter_type=self.adapter_type,
                        endpoint=self.endpoint,
                        latency_ms=round(latency_ms, 2),
                        available_models=models,
                        version="vLLM OpenAI Server",
                    )
        except Exception as e:
            return AdapterHealth(
                connected=False,
                adapter_type=self.adapter_type,
                endpoint=self.endpoint,
                latency_ms=round((time.time() - start) * 1000.0, 2),
                error=str(e),
            )
        return AdapterHealth(connected=False, adapter_type=self.adapter_type, endpoint=self.endpoint, latency_ms=0)

    def generate(self, prompt: str, model: Optional[str] = None, temperature: float = 0.2, max_tokens: int = 2048) -> CompletionResult:
        target_model = model or self.default_model
        payload = {
            "model": target_model,
            "prompt": prompt,
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        start = time.time()
        req = urllib.request.Request(
            f"{self.endpoint}/v1/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.api_key}"}
        )
        with urllib.request.urlopen(req, timeout=self.timeout) as response:
            data = json.loads(response.read().decode("utf-8"))
            duration_ms = (time.time() - start) * 1000.0
            choices = data.get("choices", [])
            text = choices[0].get("text", "") if choices else ""
            usage = data.get("usage", {})
            prompt_tokens = usage.get("prompt_tokens") or max(1, len(prompt) // 4)
            completion_tokens = usage.get("completion_tokens") or max(1, len(text) // 4)
            tps = (completion_tokens / (duration_ms / 1000.0)) if duration_ms > 0 else 0.0

            return CompletionResult(
                text=text,
                model=target_model,
                adapter=self.adapter_type,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=prompt_tokens + completion_tokens,
                duration_ms=round(duration_ms, 2),
                tokens_per_second=round(tps, 2)
            )


class LMStudioAdapter:
    def __init__(self, endpoint: str = "http://127.0.0.1:1234", default_model: str = "local-model", timeout: float = 30.0):
        self.endpoint = endpoint.rstrip("/")
        self.default_model = default_model
        self.timeout = timeout
        self.adapter_type = "lmstudio"

    def check_health(self) -> AdapterHealth:
        start = time.time()
        try:
            req = urllib.request.Request(f"{self.endpoint}/v1/models", headers={"User-Agent": "local-forge"})
            with urllib.request.urlopen(req, timeout=3.0) as response:
                latency_ms = (time.time() - start) * 1000.0
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    models = [m.get("id") for m in data.get("data", [])]
                    return AdapterHealth(
                        connected=True,
                        adapter_type=self.adapter_type,
                        endpoint=self.endpoint,
                        latency_ms=round(latency_ms, 2),
                        available_models=models,
                        version="LM Studio Server",
                    )
        except Exception as e:
            return AdapterHealth(
                connected=False,
                adapter_type=self.adapter_type,
                endpoint=self.endpoint,
                latency_ms=round((time.time() - start) * 1000.0, 2),
                error=str(e),
            )
        return AdapterHealth(connected=False, adapter_type=self.adapter_type, endpoint=self.endpoint, latency_ms=0)


class ComfyUIAdapter:
    def __init__(self, endpoint: str = "http://127.0.0.1:8188"):
        self.endpoint = endpoint.rstrip("/")
        self.adapter_type = "comfyui"

    def check_health(self) -> AdapterHealth:
        start = time.time()
        try:
            req = urllib.request.Request(f"{self.endpoint}/system_stats", headers={"User-Agent": "local-forge"})
            with urllib.request.urlopen(req, timeout=3.0) as response:
                latency_ms = (time.time() - start) * 1000.0
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    devices = data.get("devices", [])
                    models = [d.get("name") for d in devices] if devices else ["comfyui-graph-engine"]
                    return AdapterHealth(
                        connected=True,
                        adapter_type=self.adapter_type,
                        endpoint=self.endpoint,
                        latency_ms=round(latency_ms, 2),
                        available_models=models,
                        version="ComfyUI Graph Server",
                    )
        except Exception as e:
            return AdapterHealth(
                connected=False,
                adapter_type=self.adapter_type,
                endpoint=self.endpoint,
                latency_ms=round((time.time() - start) * 1000.0, 2),
                error=str(e),
            )
        return AdapterHealth(connected=False, adapter_type=self.adapter_type, endpoint=self.endpoint, latency_ms=0)


class WhisperAdapter:
    def __init__(self, endpoint: str = "http://127.0.0.1:8080"):
        self.endpoint = endpoint.rstrip("/")
        self.adapter_type = "whisper"

    def check_health(self) -> AdapterHealth:
        start = time.time()
        try:
            req = urllib.request.Request(f"{self.endpoint}/health", headers={"User-Agent": "local-forge"})
            with urllib.request.urlopen(req, timeout=3.0) as response:
                latency_ms = (time.time() - start) * 1000.0
                if response.status == 200:
                    return AdapterHealth(
                        connected=True,
                        adapter_type=self.adapter_type,
                        endpoint=self.endpoint,
                        latency_ms=round(latency_ms, 2),
                        available_models=["whisper-base", "whisper-medium", "whisper-large-v3"],
                        version="Whisper Audio Server",
                    )
        except Exception as e:
            return AdapterHealth(
                connected=False,
                adapter_type=self.adapter_type,
                endpoint=self.endpoint,
                latency_ms=round((time.time() - start) * 1000.0, 2),
                error=str(e),
            )
        return AdapterHealth(connected=False, adapter_type=self.adapter_type, endpoint=self.endpoint, latency_ms=0)


class AdapterRegistry:
    def __init__(self):
        self.ollama = OllamaAdapter()
        self.vllm = VLLMAdapter()
        self.lmstudio = LMStudioAdapter()
        self.comfyui = ComfyUIAdapter()
        self.whisper = WhisperAdapter()

    def probe_all(self) -> Dict[str, AdapterHealth]:
        return {
            "ollama": self.ollama.check_health(),
            "vllm": self.vllm.check_health(),
            "lmstudio": self.lmstudio.check_health(),
            "comfyui": self.comfyui.check_health(),
            "whisper": self.whisper.check_health(),
        }

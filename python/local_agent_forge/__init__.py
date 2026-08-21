"""
local-agent-forge
Zero-cloud local GPU orchestrator, dynamic model router, and MCP server.
Copyright (c) 2026 Nymrel / JalenBuilds LLC
"""

from .adapters import (
    OllamaAdapter,
    VLLMAdapter,
    LMStudioAdapter,
    ComfyUIAdapter,
    WhisperAdapter,
    AdapterRegistry,
    AdapterHealth,
)
from .economics import TokenLedger, CLOUD_BASELINES, calculate_cost
from .router import (
    LocalAgentRouter,
    TaskClassifier,
    TaskComplexity,
    RoutingDecision,
    REASONING_ESCALATION_THRESHOLD,
)
from .mcp_server import MCPServer

__version__ = "1.0.0"
__all__ = [
    "OllamaAdapter",
    "VLLMAdapter",
    "LMStudioAdapter",
    "ComfyUIAdapter",
    "WhisperAdapter",
    "AdapterRegistry",
    "AdapterHealth",
    "TokenLedger",
    "CLOUD_BASELINES",
    "calculate_cost",
    "LocalAgentRouter",
    "TaskClassifier",
    "TaskComplexity",
    "RoutingDecision",
    "REASONING_ESCALATION_THRESHOLD",
    "MCPServer",
]

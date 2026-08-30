"""
Python CLI Interface for local-agent-forge
"""

import argparse
from .adapters import AdapterRegistry
from .router import LocalAgentRouter
from .economics import TokenLedger
from .mcp_server import MCPServer


def main():
    parser = argparse.ArgumentParser(
        description="local-agent-forge: pre-release local inference adapters and deterministic heuristic routing"
    )
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # route command
    route_parser = subparsers.add_parser("route", help="Evaluate the deterministic routing heuristic")
    route_parser.add_argument("prompt", type=str, help="Prompt text to analyze")

    # health command
    subparsers.add_parser("health", help="Probe local GPU adapters")

    # stats command
    subparsers.add_parser("stats", help="Display measured usage and illustrative cost comparisons")

    # mcp command
    subparsers.add_parser("mcp", help="Start Model Context Protocol (MCP) stdio server")

    # bench command
    subparsers.add_parser("bench", help="Benchmark local inference engines")

    args = parser.parse_args()

    if args.command == "route":
        router = LocalAgentRouter()
        decision = router.evaluate(args.prompt)
        print("\n======================================================================")
        print("                     DYNAMIC ROUTING DECISION (PY)                    ")
        print("======================================================================")
        print(f"  Route Target       : [ {decision.route} ]")
        print(f"  Target Model       : {decision.target_model}")
        print(f"  Inference Engine   : {decision.adapter_type} ({decision.endpoint})")
        print(f"  Complexity Score   : {decision.complexity_score*100:.1f}% (Threshold: {decision.reasoning_threshold*100:.0f}%)")
        print(f"  Task Category      : {decision.task_category}")
        print(f"  Cloud Escalated    : {'YES' if decision.cloud_escalated else 'NO ($0 Local GPU)'}")
        print(f"  Est. Dollar Savings: ${decision.estimated_dollars_saved:.5f} vs Claude 3.5 Sonnet")
        print(f"  Rationale          : {decision.rationale}")
        print("======================================================================\n")

    elif args.command in ("health", "status"):
        adapters = AdapterRegistry()
        print("\n🔍 Probing Local AI Inference Servers on localhost...\n")
        health = adapters.probe_all()
        for name, h in health.items():
            status_str = "🟢 ONLINE " if h.connected else "🔴 OFFLINE"
            print(f"{status_str} | {name.upper():<10} | Latency: {h.latency_ms}ms | Models: {', '.join(h.available_models[:3]) if h.available_models else 'None'}")
        print()

    elif args.command == "stats":
        ledger = TokenLedger()
        print("\n" + ledger.format_ascii_dashboard() + "\n")

    elif args.command == "mcp":
        server = MCPServer()
        server.start_stdio()

    elif args.command == "bench":
        print("\n⚡ Benchmarking Local GPU Inference Latency & Throughput (Python)...\n")
        adapters = AdapterRegistry()
        health = adapters.probe_all()
        for name, h in health.items():
            if h.connected:
                print(f"  ✅ {name}: Online ({h.latency_ms}ms ping)")
            else:
                print(f"  ⏸️  {name}: Offline")
        print("\nBenchmark complete.\n")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()

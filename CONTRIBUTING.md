# Contributing to local-agent-forge

Thank you for your interest in contributing to `local-agent-forge`! We welcome contributions to expand local GPU model adapters, refine task classification heuristics, enhance the Model Context Protocol (MCP) server, and improve token economics calculations.

## Development Workflow

### Prerequisites
- Node.js >= 18.0.0 (Node 20+ or 22+ recommended)
- Python >= 3.9
- Optional: Local model servers (Ollama, vLLM, LM Studio, ComfyUI, Whisper)

### Setup
```bash
# Clone the repository
git clone https://github.com/nymrel/local-agent-forge.git
cd local-agent-forge

# Install Node dependencies
npm install

# Build TypeScript
npm run build

# Run Node test suite
npm test

# Run Python test suite
python -m unittest discover -s tests
```

### Guidelines
1. **Zero External Runtime Dependencies:** Keep the core TypeScript runtime lightweight and performant using native Node.js APIs (Fetch, Streams, Crypto).
2. **Dual-Language Parity:** Core features implemented in the TypeScript engine should maintain semantic and algorithmic parity with the Python engine (`python/local_agent_forge/`).
3. **85% Reasoning Escalation Heuristic:** Changes to routing heuristics must preserve the core principle: routine tasks run locally at $0 cost; cloud escalation is strictly reserved for high-complexity reasoning (>85% threshold) or unavailable local backends.
4. **Test Coverage:** All new adapters, heuristics, ledger features, and MCP tools must include automated test coverage in both TypeScript (`test/`) and Python (`tests/`).

## Code of Conduct

All contributors and maintainers are expected to adhere to professional and respectful collaboration standards.

## Questions & Contact

For questions, open a GitHub Discussion or reach out to `contact@nymrel.com`.

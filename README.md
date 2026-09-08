# Local Agent Forge

Local Agent Forge is a pre-release, source-available toolkit for probing local inference servers, classifying prompts with a deterministic heuristic, exposing experimental MCP tools, and recording runtime cost comparisons.

> [!IMPORTANT]
> This repository is not a published or production-approved release. As checked on 2026-08-30, neither `@nymrel/local-forge` on npm nor `local-agent-forge` on PyPI exists. Use the source checkout for evaluation. Do not treat the package names, version, examples, or workflow definitions as evidence of a registry release, configured provider account, deployed service, available local model, customer activation, privacy certification, cost reduction, or revenue.

## What is implemented

- TypeScript adapters for Ollama, vLLM, LM Studio, ComfyUI, and Whisper-compatible HTTP servers.
- A Python adapter surface for the same five endpoint families.
- Deterministic prompt classification and routing-decision objects.
- A local CLI, an experimental JSON-RPC/MCP server, and a loopback-only HTTP proxy.
- Runtime token and cost-comparison ledgers.
- Node and Python unit contracts plus deterministic npm and Python distribution validators.

The adapters default to loopback endpoints. A caller can supply a remote HTTP(S) endpoint, so local execution and data residency are never inferred from the adapter name. Custom endpoints are validated as credential-free HTTP(S) base URLs before requests are constructed.

## Current boundaries

- The `0.85` routing threshold is a hand-authored heuristic, not a benchmarked accuracy guarantee or a service-level objective.
- A `CLOUD` routing decision is advisory metadata. It does not configure credentials, authorize spend, or execute a cloud-provider request.
- Model identifiers in the current router are defaults and compatibility labels, not proof that a model is installed, current, licensed, or reachable.
- Cost tables are illustrative comparison inputs. They may become stale and omit hardware, electricity, operations, provider discounts, and other real costs. Validate pricing and measured usage before relying on a comparison.
- The MCP implementation exercises a bounded protocol surface and reports protocol version `2024-11-05`; it is not an independent compatibility certification.
- The test suites prove the checked contracts, not full behavioral parity, exhaustive security, or a coverage percentage.

## Supported development floor

| Runtime | Policy |
| --- | --- |
| Node.js | `>=22.19 <27` |
| npm | `>=11.5 <12` (repository pin: `11.19.1`) |
| Python | `>=3.11` (CI policy: 3.11 through 3.14) |
| TypeScript | Repository compiler pin: `5.9.3` |

## Evaluate from source

### Node.js

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run check
node .\bin\local-forge.js help
```

Useful source-checkout commands:

```powershell
node .\bin\local-forge.js health
node .\bin\local-forge.js route "Summarize this function"
node .\bin\local-forge.js start --port 4000
node .\bin\local-forge.js mcp
```

The proxy listens on `127.0.0.1` by default. Stop it when evaluation is complete.

### Python

```powershell
python -m unittest discover -s tests -p test_*.py
python -m build --outdir python-dist
python scripts\check_python_package.py python-dist
python -m pip install --force-reinstall .\python-dist\*.whl
local-forge-py --help
```

These are local source-build instructions. They are not registry installation instructions.

## Security model

- The HTTP proxy binds to IPv4 loopback only.
- Default adapter endpoints use `127.0.0.1`.
- Custom adapter endpoints must be absolute `http:` or `https:` URLs without embedded credentials, query strings, or fragments.
- URL validation is a syntax boundary, not a trust decision or a complete SSRF defense. Treat every configured endpoint as a data recipient and apply host, network, and egress policy appropriate to the deployment.
- Local inference servers can have their own authentication, logging, persistence, plugin, model, and network behavior. Audit them separately.
- MCP clients can invoke tools with sensitive prompts. Review client permissions and tool exposure before enabling the server.

See [SECURITY.md](SECURITY.md) for reporting and supported-boundary details.

## Package and release policy

`npm run check:package` proves the npm archive allowlist. `python scripts/check_python_package.py python-dist` proves the wheel and source-archive contracts. Publication remains manual, existing-tag-only, main-ancestry-gated, checksum-producing, attested, and OIDC-only in the workflow definition.

Those controls do not prove that npm or PyPI trusted publishing, GitHub environments, repository Actions, ownership, or release approval are configured. [RELEASE_READINESS.md](RELEASE_READINESS.md) is the release gate.

## License

MIT. Copyright 2026 Nymrel / JalenBuilds LLC.

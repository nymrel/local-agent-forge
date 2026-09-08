# Contributing

Local Agent Forge is pre-release. Keep changes small, evidence-backed, and explicit about the boundary they prove.

## Development policy

- Use Node `>=22.19 <27`, npm 11, and Python 3.11 or newer.
- Install JavaScript dependencies with `npm ci --ignore-scripts --no-audit --no-fund`.
- Do not commit credentials, local model data, generated package archives, virtual environments, or provider configuration.
- Keep default listeners and endpoints on loopback. Any broader network exposure needs a threat model, authentication design, and explicit review.
- Treat model names, prices, savings, privacy, availability, and routing quality as measured or configurable data—not timeless facts.
- Do not add a runtime dependency or broaden a published-file allowlist without updating both ecosystem validators and security review.
- Do not publish packages, create tags, or change provider environments from a feature pull request.

## Required local gate

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run check
python -m ruff check python scripts tests
python -m bandit -q -r python\local_agent_forge -ll -ii
npm run audit:ci
```

For distribution work, also build and inspect both ecosystems:

```powershell
npm run check:package
python -m build --outdir python-dist
python scripts\check_python_package.py python-dist
```

## Pull requests

Describe the exact behavior changed, tests added, security or compatibility implications, and any evidence still unavailable. A green local gate is source evidence only; hosted CI, registry configuration, tag integration, deployment, and customer outcomes remain separate gates.

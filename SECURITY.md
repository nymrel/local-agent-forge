# Security policy

## Supported boundary

Local Agent Forge is pre-release and unpublished. Security fixes target the latest `main` source and active review candidate; no registry version is currently supported.

## Report a vulnerability

Send a private report to `contact@nymrel.com` with:

- the affected commit and runtime;
- a minimal reproduction;
- expected and observed behavior;
- impact and any known preconditions; and
- whether the report contains secrets or personal data.

Do not include live credentials, customer data, private model content, or destructive proof. Do not open a public issue for an unpatched vulnerability.

## Security assumptions

- The proxy is intended to listen on `127.0.0.1`; broader exposure is unsupported without an independent authentication and network design.
- The proxy does not opt into cross-origin browser access, requires the `Host` header to match its loopback listener, accepts POST bodies only as `application/json`, rejects invalid JSON, and caps request bodies at 1 MiB. It is still unauthenticated and must not be exposed beyond loopback.
- Default adapters target loopback, but configured endpoints may be remote. HTTP(S) syntax validation does not make a host trustworthy and is not a complete SSRF control.
- Endpoint URLs cannot contain credentials, query strings, or fragments. Supply API credentials through the adapter's explicit credential field where supported, never in a URL.
- Local inference engines and MCP clients are separate trust domains with their own logging, persistence, plugins, permissions, and network behavior.
- Prompt data can be sensitive. Operators are responsible for endpoint allowlisting, egress controls, model provenance, filesystem permissions, and log retention.
- Cost comparisons, routing decisions, health probes, and model labels are advisory data—not authorization to call a provider or proof of privacy, availability, or savings.

## Disclosure

We will acknowledge a reproducible report, investigate it, and coordinate a fix before public disclosure when feasible. Publication and deployment are separate operator-controlled gates.

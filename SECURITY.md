# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

The Nymrel engineering team takes the security of our zero-cloud local AI ecosystem seriously. If you discover a security vulnerability in `local-agent-forge`, please report it responsibly:

1. **Email:** Send details to `contact@jalenbuilds.com` with the subject `[SECURITY] local-agent-forge vulnerability`.
2. **Details:** Include a clear description of the issue, reproduction steps, affected adapter/component, and environment details.
3. **Response Time:** We acknowledge reports within 24 hours and aim to release a patch or advisory within 72 hours.
4. **Public Disclosure:** Please do not open public GitHub issues for undisclosed security vulnerabilities until a patch is released.

## Security Architecture

`local-agent-forge` is built on a strict **Zero-Cloud Local Privacy** architecture:
- Local endpoints (Ollama, vLLM, LM Studio, ComfyUI, Whisper) communicate over localhost loopback sockets (`127.0.0.1`).
- No prompt data, tokens, or weights are logged to external servers unless explicit cloud escalation endpoints are configured and authorized.
- The Model Context Protocol (MCP) server operates over standard I/O (stdio) or isolated local pipes.

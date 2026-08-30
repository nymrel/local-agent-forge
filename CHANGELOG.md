# Changelog

All notable source changes are recorded here. This file does not imply that a package, tag, release, or deployment exists.

## Unreleased

### Added

- Shared TypeScript and Python validation for credential-free HTTP(S) adapter base URLs.
- Regression coverage for normalized, malformed, credentialed, and unsupported endpoint inputs.
- Deterministic npm, wheel, and source-distribution validators.
- Cross-runtime, cross-platform, security, and package workflow contracts with immutable action identities.
- Existing-tag-only, manual OIDC publication workflow with checksums and build provenance.

### Changed

- Bound the local proxy to `127.0.0.1` explicitly.
- Removed wildcard browser CORS, added loopback `Host` and JSON content-type enforcement, added no-store and resource-isolation headers, bounded request bodies to 1 MiB, and separated safe client errors from internal failures.
- Aligned the executable launcher with the repository's current CommonJS compiler output.
- Declared the Node, npm, Python, TypeScript, and package-manager policy explicitly.
- Consolidated Python packaging under a pinned Hatchling build backend.
- Replaced unsupported installation, stability, privacy, model-availability, coverage, savings, and automatic-publication claims with evidence-bounded documentation.

### Security

- Rejected non-HTTP(S), credential-bearing, query-bearing, fragment-bearing, relative, and control-character endpoint values before adapter requests are constructed.

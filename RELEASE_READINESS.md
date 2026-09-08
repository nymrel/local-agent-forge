# Release readiness

Status: **HOLD — source candidate only**

This repository is not authorized for npm or PyPI publication. As checked on 2026-08-30, `@nymrel/local-forge` and `local-agent-forge` both return registry-not-found responses. There is no tag or GitHub release proving an integrated package version.

## Candidate gates

| Gate | Required evidence | Current posture |
| --- | --- | --- |
| Source | Exact commit, clean scoped diff, Node/Python tests, typecheck, package contracts, and security scans | Must be attached to the candidate review |
| npm | One inspected tarball, executable/import smoke, ownership, OIDC trusted publisher, protected `npm` environment | HOLD |
| PyPI | One inspected wheel and sdist, installed-wheel/CLI smoke, ownership, OIDC trusted publisher, protected `pypi` environment | HOLD |
| Integration | Existing semantic-version tag exactly matching both package versions and reachable from `origin/main` | HOLD |
| Hosted CI | Accepted GitHub Actions execution for the exact candidate tree | HOLD until provider execution succeeds |
| Operations | Approved endpoint/network policy, model provenance, data handling, logging, rollback, and support owner | HOLD |
| Claims | Measured routing quality, real model availability, current price inputs, actual costs, privacy posture, and user outcomes | UNPROVEN |

## Publication contract

The workflow is intentionally inert unless a human dispatches it with:

1. an already-existing semantic-version tag;
2. `confirmation=publish`;
3. a tag commit contained in `origin/main`;
4. matching npm and Python package versions;
5. complete source, dependency, archive, checksum, and attestation gates; and
6. separately configured npm and PyPI trusted-publishing environments.

The workflow does not create tags, use long-lived registry tokens, skip existing versions, or treat local proof as release approval.

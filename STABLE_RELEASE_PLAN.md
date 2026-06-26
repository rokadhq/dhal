# Dhal 1.0.0 Stable Release Plan

Dhal `1.0.0` is the first production-supported release line. Promotion from `1.0.0-rc.0` must be based on production confidence, supportability, and an unchanged v1 contract—not only a version change.

## Stable release principles

- Preserve the machine-readable v1 public export, CLI, and configuration contracts.
- Fix release-candidate defects without introducing new stable surface area.
- Keep AI-assisted autosetup explicitly experimental.
- Require deterministic package builds, provenance, clean consumer installation, and reproducible release checks.
- Document operational failure behavior, security boundaries, upgrade policy, and support lifecycle.

## Gate 1 — Contract freeze

- `schemaVersion: "1"` remains unchanged.
- Stable exports from `@rokadhq/dhal/v1-contract` remain unchanged.
- Stable CLI command names remain unchanged.
- No RC-only compatibility exception may remain undocumented.
- Stable release checks require version `1.0.0` and channel `latest`.

## Gate 2 — Production behavior

- Express 4/5, Fastify 4/5, and raw `node:http` integration tests pass.
- Redis 7 and Valkey 8 multi-instance tests pass.
- Internal failures honor documented fail-open/fail-closed behavior.
- Health-check and explicitly configured bypasses remain deterministic.
- Monitor, block, and strict modes produce stable, auditable decisions.
- False-positive replay fixtures cover all stable rule categories.

## Gate 3 — Performance and resilience

- Average and p95 inspection latency remain within release budgets.
- Throughput remains above the minimum supported budget.
- Heap growth remains within the release budget.
- Optional telemetry, reputation providers, and external stores never crash request handling by default.
- Timeout and backend-unavailability behavior is covered by tests.

## Gate 4 — Supply-chain integrity

- npm Trusted Publishing with provenance succeeds.
- Every package export resolves in ESM, CommonJS, and TypeScript consumers.
- `npm pack` contents are inspected and contain no secrets or development-only artifacts.
- Production dependency audit is clean or has an explicitly documented exception.
- SBOM and package integrity metadata are generated for the release.

## Gate 5 — Operations and support

- Security policy lists the supported stable line.
- Vulnerability reporting instructions are private and actionable.
- Support lifecycle and deprecation policy are published.
- Upgrade guidance from `1.0.0-rc.0` is documented.
- Production deployment, rollback, monitoring, and incident-response guidance is published.
- README is updated before the stable release.

## Promotion rule

The package version must remain `1.0.0-rc.0` until every stable gate is enforced and green on the actual release branch. The final promotion commit will update:

- `package.json` and `package-lock.json` to `1.0.0`;
- compatibility channel to `latest`;
- stability labels from release candidate to stable;
- changelog and release documentation;
- publication commands and stable release checks.

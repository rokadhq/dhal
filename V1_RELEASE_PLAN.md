# Dhal v1 Release Plan

This document records the completed path to stable `1.0.0` and the ongoing v1 maintenance requirements.

## Release principle

Dhal v1 is a contract and reliability release. New detection features are secondary until the public API, configuration schema, CLI, package exports, runtime defaults, and upgrade path are demonstrably stable.

## Phase 1 — Public contract inventory

- Publish a machine-readable v1 contract through `@rokadhq/dhal/v1-contract`.
- Classify every public package export as stable or experimental.
- Lock the stable CLI command inventory.
- Bind v1 to `dhal.json` schema version `1`.
- Keep AI autosetup explicitly experimental.

## Phase 2 — Package integrity

- Verify every `exports`, `main`, `module`, `types`, and CLI target after each build.
- Verify ESM, CommonJS, and type declaration entrypoints.
- Install and import the packed tarball in a clean fixture project.
- Ensure npm and GitHub Packages publish the same package surface.

## Phase 3 — Runtime and compatibility validation

- Validate Express 4/5, Fastify 4/5, and raw `node:http` adapters.
- Validate Redis/Valkey rate limiting and security-signal storage with multiple application instances.
- Validate OpenTelemetry and signed webhook integrations.
- Establish performance and memory regression budgets.
- Complete false-positive replay coverage for stable rule packs.

## Phase 4 — Release candidate

- Set package version to `1.0.0-rc.0`.
- Change compatibility metadata from beta-stabilizing to release-candidate/stable.
- Run the complete v1 release gate in CI.
- Publish under the npm `rc` tag.
- Collect production-trial feedback without changing stable contracts.

## Phase 5 — Stable v1

- Resolve all release-candidate blockers.
- Update README, installation guides, migration guides, API stability policy, and support policy.
- Publish `1.0.0` under the npm `latest` tag.
- Require deprecation and migration guidance for future breaking changes.

## Current milestone

The current milestone is stable `1.0.0`. The public contract, package consumers, framework matrix, distributed stores, telemetry, supply-chain assets, and performance budgets are enforced by the v1 release gates.

# Changelog

## 0.13.0-beta.1 — V1 contract hardening

### Added

- Added `schemaVersion: "1"` as the v1-bound `dhal.json` contract.
- Added configuration migration checks and `dhal migrate --check`.
- Added public migration APIs through `@rokadhq/dhal/migrations`.
- Added API stability reporting through `dhal stability`.
- Added public stability APIs through `@rokadhq/dhal/stability`.
- Added Express and node:http v1-contract examples.
- Added `V1_CONTRACT.md`.

### Changed

- Updated diagnostics and support reports with schema-version metadata.
- Updated the compatibility matrix for the v1-bound contract.
- Regenerated package output and configuration schema.

## 0.12.0-beta.0 - V1-readiness beta

- Moved Dhal into a beta-track release focused on v1 readiness.
- Added `dhal readiness` / `dhal v1-readiness` to score config posture for development or production targets.
- Added public `runDhalReadiness` API and `@rokadhq/dhal/readiness` export path.
- Added `dhal compat` to print supported Node runtimes, framework adapters, integrations, package managers, and stability status.
- Added public compatibility matrix API through `getDhalCompatibilityMatrix` and `@rokadhq/dhal/compatibility`.
- Added `BETA.md`, `V1_READINESS.md`, `API_STABILITY.md`, and `UPGRADING.md`.
- Updated GitHub Actions publishing workflows to use npm Trusted Publishing for npmjs and `GITHUB_TOKEN` for GitHub Packages.
- Added automatic prerelease dist-tag resolution: `alpha`, `beta`, `rc`, `next`, and `latest`.
- Extended support reports with version/channel/readiness metadata.

## 0.11.0-alpha.0 - Alpha-public hardening

- Added `runtime` config for internal-error behavior, inspection budget metadata, and health/preflight bypasses.
- Added availability-first default `runtime.onInternalError: "allow"` with optional fail-closed behavior for hardened APIs.
- Added `observability.redaction` config for masked/hashed event data.
- Added `dhal report` for redacted support/debug reports.
- Added public `runDhalSupportReport` API and `@rokadhq/dhal/report` export path.
- Extended `dhal doctor` and `dhal ci` with runtime and privacy posture checks.
- Added alpha-public usage notes and additional regression tests.

## 0.10.0

- Added `dhal presets` CLI for listing, inspecting, and applying reviewable config presets.
- Added built-in presets: `starter`, `api-production`, `auth-hardened`, `strict-json-api`, `behind-proxy`, and `observability`.
- Added public preset API exports: `listDhalPresets`, `getDhalPreset`, `applyDhalPreset`, and `DHAL_PRESETS`.
- Added `@rokadhq/dhal/presets` export path.
- Updated README with production-onboarding guidance and preset examples.
- Kept package identity scoped as `@rokadhq/dhal`, CLI as `dhal`, and config as `dhal.json`.

## 0.9.0 - Adoption and operations tooling

- Switched package identity to the scoped npm package `@rokadhq/dhal` while keeping the product name Dhal, CLI command `dhal`, and config file `dhal.json`.
- Added `dhal doctor` for local production-readiness diagnostics covering Node runtime, config presence/validity, mode posture, proxy setup, rate-limit store, IP reputation env, webhook signing, CI findings, and enabled rule count.
- Added `dhal rules` to list built-in rule catalog entries with effective enablement and severity under the current config.
- Added public exports for `runDhalDoctor`, `getDhalRuleCatalog`, `findDhalRule`, and `DHAL_RULE_CATALOG`.
- Added rule-catalog metadata for categories, confidence, default severity, config paths, and false-positive notes.
- Added GitHub Actions workflows for npm publishing with `NPM_TOKEN` and optional GitHub Packages publication.
- Added `.gitignore` tuned for the package repository.



## 0.8.2 - Local publishing provenance fix

- Removed forced `publishConfig.provenance` from `package.json` so local/manual npm publishing works from developer machines.
- Added explicit `publish:local` and `publish:ci` scripts.
- Added GitHub Actions publishing workflow template for provenance-based CI publishing.
- Clarified that npm provenance requires a supported CI/OIDC provider and should not be used from a normal local shell.

## 0.8.1 - Publish-readiness fix

- Removed the generated package lockfile from the source bundle because it contained environment-specific internal registry URLs.
- Added a source-only `.npmrc` pointing to the public npm registry.
- Made Node and Web runtime type libraries explicit in `tsconfig.json` for cleaner local typechecking.
- Kept published package contents restricted through the `files` allowlist.

## 0.8.0 - npm publish readiness

- Added npm publish metadata: keywords, author, `publishConfig`, side effects flag, and package manager metadata.
- Added `LICENSE`, `SECURITY.md`, `CHANGELOG.md`, and `PUBLISHING.md`.
- Added `verify:publish`, `pack:dry`, `pack:release`, and `prepublishOnly` scripts.
- Exported `./package.json` and `./dhal.schema.json`.
- Updated OpenTelemetry and webhook package version markers to `0.8.0`.
- Rebuilt package output and validated tarball contents with `npm pack --dry-run`.

## 0.7.0 - AI autosetup and rule quality

- Added AI-assisted autosetup using the optional `ai` SDK.
- Added rule packs, API positive security controls, header anomaly detection, content-type/body mismatch checks, CIDR support, confidence scoring, and replay fixtures.

## 0.6.0 - Enterprise policy controls

- Added severity levels, suppressions, sampling, audit explanations, migration, and CI checks.

## 0.5.0 - Production hardening

- Added Redis/Valkey signal store, HMAC-signed webhooks, JSON schema export, tests, benchmark script, and false-positive bot controls.

## 0.4.0 - Behavior detection

- Added bot scoring, credential-stuffing signals, honeypot checks, webhooks, and response outcome recording.

## 0.3.0 - Route profiles

- Added route-specific profiles, route-level mode overrides, identity-aware rate limits, and config explanation.

## 0.2.0 - Distributed and observable controls

- Added Redis rate limit store, AbuseIPDB-compatible reputation provider, Fastify adapter, OpenTelemetry adapter, and CLI workflows.

## 0.1.0 - Initial scaffold

- Added core engine, Express/raw HTTP adapters, memory rate limiter, basic signatures, config loader, and monitor/block modes.

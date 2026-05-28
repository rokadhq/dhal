# Changelog


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

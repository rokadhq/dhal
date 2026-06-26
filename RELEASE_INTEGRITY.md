# Dhal release integrity

Stable Dhal releases are built and published from GitHub Actions using npm Trusted Publishing.

## Release gates

Before any stable release, the repository must pass:

```bash
npm ci
npm run verify:v1
npm run release:check:stable
npm pack --dry-run
```

The v1 release gate validates:

- Node.js 20, 22, and 24;
- Express 4 and 5;
- Fastify 4 and 5;
- raw `node:http`;
- Redis 7 and Valkey 8 multi-instance behavior;
- ESM, CommonJS, and TypeScript consumers;
- packed-tarball installation and imports;
- configuration schema and migration contracts;
- production dependency audit;
- latency, throughput, p95, and heap-growth budgets;
- production documentation and support-policy presence;
- SBOM, package checksum, and release-manifest generation.

## Trusted publication

The npm publication workflow uses OIDC through npm Trusted Publishing. Stable versions publish under the `latest` dist-tag; release candidates publish under `rc`.

The workflow must build from the release tag and run `prepublishOnly`, which executes the complete v1 gate. Long-lived npm access tokens are not required for normal releases.

## Release assets

The release-assets workflow generates and attaches:

- the exact npm package tarball;
- a CycloneDX JSON SBOM;
- `SHA256SUMS`;
- `dhal-release-manifest.json` containing version, filenames, byte sizes, and SHA-256 digests.

Consumers can verify the downloaded package:

```bash
sha256sum -c SHA256SUMS
```

The package version in the manifest must match the Git tag, GitHub Release, npm version, package lock, compatibility metadata, and configuration schema release metadata.

## Consumer verification

Production consumers should:

- pin an exact Dhal version;
- retain the release manifest and SBOM with deployment evidence;
- verify the package checksum before internal mirroring;
- review `dhal.schema.json` changes during upgrades;
- run `dhal ci`, `dhal doctor`, and `dhal readiness --production` in deployment pipelines;
- execute false-positive replay fixtures before changing enforcement modes.

## Webhook integrity

Enable HMAC signing whenever security events cross the application boundary.

Receivers must verify:

- the timestamp header;
- the event ID;
- the `v1=` HMAC signature;
- timestamp freshness;
- event-ID replay protection.

Only return a 2xx status after accepting the event. Dhal counts non-2xx responses as failed deliveries.

## Source control

Release tags should point to the exact reviewed commit on `main`. The stable release PR must be green, non-draft, and free of unresolved release-blocking review comments before tagging.

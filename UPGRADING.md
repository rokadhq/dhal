# Upgrading Dhal

## From v0.13 beta to v1.0.0-rc.0

Install the release-candidate tag explicitly:

```bash
npm install @rokadhq/dhal@rc
```

Dhal v1 requires Node.js 20 or newer.

## Configuration migration

The v1 configuration contract remains `schemaVersion: "1"`. Existing unversioned configurations can be normalized with:

```bash
npx dhal migrate dhal.json --check
npx dhal migrate dhal.json --write
```

Unknown schema versions are rejected rather than silently downgraded.

## Public contract

Inspect the stable and experimental package surfaces:

```bash
npx dhal stability
npx dhal compat
npx dhal release-check --target rc --require-build
```

Programmatic contract access:

```ts
import {
  DHAL_V1_PUBLIC_EXPORTS,
  DHAL_V1_CLI_COMMANDS,
  getDhalV1Contract
} from "@rokadhq/dhal/v1-contract";
```

AI-assisted autosetup remains experimental. The core engine, configuration schema, CLI inventory, framework adapters, diagnostics, migrations, distributed stores, and signed webhook integration are part of the stable v1 contract.

## Runtime checks after upgrading

```bash
npx dhal test-config
npx dhal doctor
npx dhal readiness --production
npx dhal replay fixtures.replay.json
npx dhal report --output dhal.report.json
```

Start in monitor mode, review false positives and support reports, then promote selected route profiles to `block` or `strict`.

## Notable v1 RC changes

- Minimum Node.js runtime raised from 18.18 to 20.
- Normal Fastify plugin registration now protects root routes.
- Package telemetry reports the actual installed Dhal version.
- Package exports are verified in ESM, CommonJS, and TypeScript consumer projects.
- Redis 7 and Valkey 8 multi-instance behavior is covered by the release gate.

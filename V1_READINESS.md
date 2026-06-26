# Dhal v1 readiness

Dhal `1.0.0` is the first stable production release.

V1 readiness is defined by operational confidence, not only feature completeness. The enforced release gate covers:

- the machine-readable public API and CLI contract;
- configuration schema version 1 and migrations;
- ESM, CommonJS, and TypeScript declaration consumers;
- Express 4 and 5, Fastify 4 and 5, and raw `node:http`;
- Redis 7 and Valkey 8 multi-instance state;
- signed webhook and optional OpenTelemetry behavior;
- false-positive replay and request simulation;
- package export integrity and clean tarball installation;
- latency, throughput, and heap-growth budgets;
- Node.js 20, 22, and 24.

## Application readiness

Before enabling enforcement in an application, run:

```bash
npx dhal test-config
npx dhal migrate --check
npx dhal doctor
npx dhal readiness --production
npx dhal compat
npx dhal stability
npx dhal replay fixtures.replay.json
npx dhal report --output dhal.report.json
```

A production-readiness score below the configured minimum should block enforcement until findings are fixed or intentionally documented.

## Package release readiness

Maintainers should run:

```bash
npm run verify:v1
npm run release:check
npm pack --dry-run
```

Every v1.x release must pass the same release matrix and stable release target.

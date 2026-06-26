# Dhal

**App-native web application firewall and request-security middleware for Node.js.**

Dhal runs inside the application request path and provides deterministic, route-aware controls for Express, Fastify, and raw `node:http` applications.

It includes:

- IP allow/block lists with IPv4 and IPv6 CIDR matching;
- distributed rate limiting through Redis or Valkey;
- SQL injection, XSS, path traversal, SSRF, RCE, SSTI, GraphQL, and probe signatures;
- bot and automation detection with false-positive controls;
- credential-stuffing signals and shared failure counters;
- honeypot and canary routes;
- JSON API positive-security controls;
- route-level modes, rules, limits, responses, and suppressions;
- OpenTelemetry and signed webhook integrations;
- configuration diagnostics, readiness scoring, replay tests, and CI policy checks;
- stable ESM, CommonJS, TypeScript, CLI, and `dhal.json` contracts.

Dhal complements CDN, edge, network, and infrastructure security controls. It does not replace volumetric DDoS protection, authentication, authorization, or application input validation.

## Requirements

- Node.js 20 or newer
- npm 10 or another modern package manager
- Redis or Valkey for shared counters in horizontally scaled deployments

Dhal validates Node.js 20, 22, and 24, Express 4 and 5, Fastify 4 and 5, Redis 7, and Valkey 8 in its release matrix.

## Install

```bash
npm install @rokadhq/dhal
```

The package name is `@rokadhq/dhal`, the CLI is `dhal`, and the configuration file is `dhal.json`.

## Express

```ts
import express from "express";
import { dhal } from "@rokadhq/dhal/express";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(dhal({ configPath: "dhal.json" }));

app.post("/api/login", (_req, res) => {
  res.status(401).json({ error: "invalid credentials" });
});

app.listen(3000);
```

The Express adapter records response outcomes after the request completes, allowing credential-stuffing controls to learn from repeated authentication failures.

## Fastify

```ts
import Fastify from "fastify";
import { dhalFastify } from "@rokadhq/dhal/fastify";

const app = Fastify();

await app.register(dhalFastify({ configPath: "dhal.json" }));

app.get("/health", async () => ({ ok: true }));

await app.listen({ port: 3000 });
```

Normal plugin registration protects routes registered on the root Fastify instance.

## Raw `node:http`

```ts
import http from "node:http";
import { createNodeHttpDhal } from "@rokadhq/dhal/node-http";

const protection = createNodeHttpDhal({ configPath: "dhal.json" });

const server = http.createServer(async (req, res) => {
  const decision = await protection.inspect(req, res);
  if (decision.action === "block") return;

  res.statusCode = 200;
  res.end("ok");
});

server.listen(3000);
```

## Start safely

Create a starter configuration:

```bash
npx dhal init
```

A minimal production-onboarding configuration begins in monitor mode:

```json
{
  "schemaVersion": "1",
  "mode": "monitor",
  "trustProxy": false,
  "runtime": {
    "onInternalError": "allow",
    "internalErrorStatusCode": 500,
    "maxInspectionMs": 25,
    "bypass": {
      "enabled": true,
      "paths": ["/health", "/healthz", "/ready", "/readyz"],
      "methods": ["OPTIONS"]
    }
  },
  "rateLimit": {
    "enabled": true,
    "store": "memory",
    "keyBy": ["ip", "route"],
    "default": {
      "windowSeconds": 60,
      "max": 120
    },
    "routes": {}
  }
}
```

Recommended rollout:

1. deploy globally in `monitor` mode;
2. replay known-good requests and review `wouldBlock` events;
3. enable `block` on selected high-risk routes;
4. validate latency, false positives, and backend availability;
5. expand enforcement gradually.

Run before enabling enforcement:

```bash
npx dhal test-config
npx dhal migrate --check
npx dhal doctor
npx dhal readiness --production
npx dhal replay fixtures.replay.json
```

## Modes

```text
off      disables inspection
monitor  records what Dhal would block while allowing the request
block    actively blocks matching requests
strict   blocks when internal security evaluation fails
```

Route profiles may override the global mode.

```json
{
  "schemaVersion": "1",
  "mode": "monitor",
  "routes": {
    "/api/login": {
      "mode": "block",
      "tags": ["authentication"],
      "rateLimit": {
        "enabled": true,
        "windowSeconds": 60,
        "max": 20,
        "keyBy": ["ip", "route"]
      },
      "rules": {
        "credentialStuffing": {
          "enabled": true,
          "windowSeconds": 300,
          "maxFailures": 4,
          "keyBy": ["ip", "route", "userAgent"]
        }
      }
    }
  }
}
```

## Multi-instance deployments

Use Redis or Valkey when multiple application instances protect the same routes.

```ts
import Redis from "ioredis";
import {
  RedisRateLimitStore,
  RedisSignalStore,
  createDhal
} from "@rokadhq/dhal";

const redis = new Redis(process.env.REDIS_URL!);

const protection = createDhal({
  configPath: "dhal.json",
  rateLimitStore: new RedisRateLimitStore(redis, {
    prefix: "production:dhal:rate-limit"
  }),
  signalStore: new RedisSignalStore(redis, {
    prefix: "production:dhal:signals"
  })
});
```

Stable v1 refuses to start an enforcing deployment that declares Redis-backed rate limiting without receiving a distributed rate-limit store. It also refuses to start an enforcing blocking-reputation configuration without an available provider.

This prevents silent downgrade to weaker per-instance or unavailable controls.

## Graceful shutdown

Managed telemetry should be drained before process termination.

```ts
import { createDhal } from "@rokadhq/dhal";

const protection = createDhal({ configPath: "dhal.json" });

async function shutdown(signal: string) {
  console.log(`Received ${signal}; draining Dhal.`);
  await protection.close(5_000);
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
```

Available lifecycle methods:

- `flush(timeoutMs?)` drains current managed telemetry;
- `close(timeoutMs?)` stops new inspections, drains telemetry, and removes event listeners;
- `getRuntimeSnapshot()` returns operational counters and telemetry health.

```ts
const snapshot = protection.getRuntimeSnapshot();

console.log({
  inspected: snapshot.inspected,
  blocked: snapshot.blocked,
  wouldBlock: snapshot.wouldBlock,
  internalErrors: snapshot.internalErrors,
  eventListenerErrors: snapshot.eventListenerErrors,
  pendingTelemetry: snapshot.telemetry?.pending,
  droppedTelemetry: snapshot.telemetry?.dropped
});
```

Application event-listener and synchronous telemetry failures are isolated from request decisions.

## Observability and privacy

Dhal masks or hashes sensitive observability fields by default.

```json
{
  "observability": {
    "redaction": {
      "enabled": true,
      "ip": "mask",
      "identity": "hash",
      "userAgent": "full"
    }
  }
}
```

Signed webhook telemetry:

```json
{
  "observability": {
    "webhooks": {
      "enabled": true,
      "urls": ["https://security.example.com/dhal/events"],
      "timeoutMs": 750,
      "emitAllowedRequests": false,
      "signing": {
        "enabled": true,
        "secretEnv": "DHAL_WEBHOOK_SECRET",
        "signatureHeader": "x-dhal-signature",
        "timestampHeader": "x-dhal-timestamp",
        "idHeader": "x-dhal-event-id"
      }
    }
  }
}
```

Webhook delivery is bounded to protect application memory. Non-2xx responses count as failed deliveries. Pending deliveries can be drained through `flush()` or `close()`.

## CLI

```bash
npx dhal init
npx dhal test-config
npx dhal migrate --check
npx dhal doctor
npx dhal readiness --production
npx dhal compat
npx dhal stability
npx dhal rules
npx dhal presets
npx dhal replay fixtures.replay.json
npx dhal simulate fixtures.simulation.json
npx dhal report --output dhal.report.json
npx dhal release-check --target stable --require-build
```

## Presets

Reviewable configuration presets include:

- `starter`
- `api-production`
- `auth-hardened`
- `strict-json-api`
- `behind-proxy`
- `observability`

```bash
npx dhal presets show api-production
npx dhal presets apply api-production --output dhal.production.json
```

Presets are configuration overlays, not hidden runtime behavior. Review the generated file before deployment.

## False-positive controls

Use monitor mode, route-scoped rules, bot signal thresholds, narrow suppressions, and replay fixtures.

```json
{
  "policy": {
    "suppressions": [
      {
        "id": "approved-validation-scanner",
        "enabled": true,
        "ruleId": "honeypot.triggered",
        "path": "/.well-known/security-canary",
        "reason": "approved internal validation scanner",
        "expiresAt": "2027-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

Suppressions remain visible in audit metadata. Prefer narrow matchers and expiry dates.

## Stable v1 contract

The stable package, CLI, and configuration inventories are machine-readable:

```ts
import {
  DHAL_V1_PUBLIC_EXPORTS,
  DHAL_V1_CLI_COMMANDS,
  getDhalV1Contract,
  validateDhalV1Contract
} from "@rokadhq/dhal/v1-contract";
```

Within v1.x:

- stable exports will not be removed or renamed;
- stable CLI commands remain available;
- schema version `1` remains backward compatible;
- deprecated APIs receive migration guidance before major-version removal;
- experimental APIs may evolve while explicitly marked experimental.

AI-assisted autosetup remains experimental.

## Release integrity

Every stable release is validated across:

- Node.js 20, 22, and 24;
- Express 4 and 5;
- Fastify 4 and 5;
- raw `node:http`;
- Redis 7 and Valkey 8;
- ESM, CommonJS, and TypeScript package consumers;
- packed-tarball installation;
- latency, throughput, and heap-growth budgets;
- SBOM and SHA-256 release-asset generation.

GitHub releases include a package tarball, CycloneDX SBOM, `SHA256SUMS`, and a release manifest.

## Security boundary

Dhal runs inside the Node.js application process. It cannot prevent bandwidth exhaustion, TLS-handshake exhaustion, kernel/socket exhaustion, or infrastructure failure before application execution.

Use it as part of defense in depth with:

- CDN and edge controls;
- DDoS protection;
- trusted reverse proxies;
- network policies and firewalls;
- secrets management;
- authentication and authorization;
- application validation;
- centralized monitoring and incident response.

## Documentation

- `PRODUCTION_DEPLOYMENT.md`
- `SECURITY.md`
- `SUPPORT_POLICY.md`
- `API_STABILITY.md`
- `UPGRADING.md`
- `PUBLISHING.md`
- `RELEASE_INTEGRITY.md`
- `V1_READINESS.md`

## Support

Use GitHub Issues for reproducible defects and GitHub Discussions for integration questions. Report vulnerabilities privately through GitHub Security Advisories.

See `SUPPORT_POLICY.md` for supported release lines, deprecation commitments, and response targets.

## License

MIT

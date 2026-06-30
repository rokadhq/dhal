# Dhal

**Application-native web application firewall and request-security middleware for Node.js.**

[Product page](https://rokad.co/en/open-source/dhal) · [Documentation](https://rokad.co/en/docs/dhal) · [npm](https://www.npmjs.com/package/@rokadhq/dhal)

Dhal runs inside the application request path, where routes, identities, request bodies, response outcomes, and deployment context are available. It provides deterministic, route-aware controls for Express, Fastify, NestJS, Koa, Hono on Node.js, and raw `node:http` applications.

Dhal complements CDN, edge, network, authentication, authorization, validation, and infrastructure controls. It does not replace volumetric DDoS protection or application-specific authorization.

## What Dhal includes

- IP allowlists, blocklists, IPv4/IPv6 CIDR matching, and optional reputation checks;
- distributed rate limiting and shared security signals through Redis or Valkey;
- SQL injection, XSS, path traversal, SSRF, RCE, SSTI, GraphQL, and probe signatures;
- bot and automation scoring with explicit false-positive controls;
- credential-stuffing detection based on repeated authentication outcomes;
- honeypot headers, query parameters, and routes;
- positive-security controls for JSON APIs, content types, headers, and payload size;
- route-level modes, rules, limits, responses, tags, and suppressions;
- OpenTelemetry, structured events, signed webhooks, and privacy-aware redaction;
- guided onboarding, conservative configuration repair, framework presets, and OpenAPI policy generation;
- stable ESM, CommonJS, TypeScript, CLI, and `dhal.json` v1 contracts.

## What is new in v1.1

Dhal v1.1 expands the supported framework surface and reduces the work required to adopt Dhal safely.

### Framework support

- NestJS HTTP applications using Express or Fastify;
- Koa middleware applications;
- Hono applications running on Node.js;
- dedicated package entrypoints for NestJS, Koa, and Hono.

### Guided onboarding

```bash
npx dhal add
```

`dhal add` detects the project framework and package manager, then previews:

- a monitor-mode `dhal.json`;
- a framework-specific preset;
- a reviewable integration module;
- the correct installation command;
- exact registration instructions.

The default invocation is read-only. Write the proposed files only after review:

```bash
npx dhal add --write
```

### Conservative repair

```bash
npx dhal doctor --fix --dry-run
npx dhal doctor --fix
```

`doctor --fix` can create a missing monitor-mode starter configuration or migrate a compatible pre-`schemaVersion` configuration. It creates a backup by default and does not automatically enable blocking, trusted proxy headers, Redis, telemetry, webhooks, or external reputation services.

### OpenAPI inspection and policy generation

```bash
npx dhal openapi inspect openapi.json
npx dhal openapi generate openapi.yaml
```

Dhal can inspect OpenAPI JSON and common OpenAPI YAML structures, classify security-relevant operations, and generate reviewable route profiles.

Generated routes:

- remain in `monitor` mode;
- preserve existing owner-managed route profiles;
- convert parameters such as `/users/{id}` to `/users/*`;
- report grouped methods and policy assumptions for review.

Write a reviewed proposal into `dhal.json`:

```bash
npx dhal openapi generate openapi.yaml --config dhal.json --write
```

## Requirements

- Node.js 20 or newer;
- npm 10 or another modern package manager;
- Redis or Valkey for shared counters in horizontally scaled deployments.

The release matrix validates Node.js 20, 22, and 24, Express 4 and 5, Fastify 4 and 5, Redis 7, Valkey 8, ESM, CommonJS, TypeScript consumers, packed installation, and release performance budgets.

## Install

```bash
npm install @rokadhq/dhal
```

The package is `@rokadhq/dhal`, the CLI command is `dhal`, and the default configuration file is `dhal.json`.

## Recommended first installation

From the application root:

```bash
npx dhal add
```

After reviewing the generated plan:

```bash
npx dhal add --write
npx dhal test-config
npx dhal doctor
npx dhal readiness --production
```

For raw Node.js applications:

```bash
npx dhal add --framework node-http --write
```

Dhal never patches existing application source automatically. Existing generated files are not overwritten unless `--force` is supplied.

## Framework integrations

### Express

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

Place body parsers before Dhal when body-aware rules should inspect parsed payloads. The adapter records final response outcomes so credential-stuffing controls can learn from repeated authentication failures.

Use `dhalFromEngine(engine)` when the application owns engine lifecycle, stores, or telemetry.

### Fastify

```ts
import Fastify from "fastify";
import { dhalFastify } from "@rokadhq/dhal/fastify";

const app = Fastify();

await app.register(dhalFastify({ configPath: "dhal.json" }));

app.get("/health", async () => ({ ok: true }));

await app.listen({ port: 3000 });
```

The Fastify adapter inspects requests in `preHandler` and records response outcomes in `onResponse`. Use `dhalFastifyFromEngine(engine)` with an existing engine.

### NestJS

```ts
import { NestFactory } from "@nestjs/core";
import { installDhalNest } from "@rokadhq/dhal/nest";
import { AppModule } from "./app.module.js";

const app = await NestFactory.create(AppModule);

await installDhalNest(app, { configPath: "dhal.json" });
await app.listen(3000);
```

Install Dhal after creating the Nest application and before `app.listen()`. The adapter detects whether Nest uses Express or Fastify and installs the corresponding stable adapter.

Use `installDhalNestFromEngine(app, engine)` when reusing an existing Dhal engine.

### Koa

```ts
import Koa from "koa";
import { dhalKoa } from "@rokadhq/dhal/koa";

const app = new Koa();

app.use(dhalKoa({ configPath: "dhal.json" }));

app.use((context) => {
  context.body = { ok: true };
});

app.listen(3000);
```

Register Dhal before application routes. The adapter stops the middleware chain for blocked requests and records the final downstream response status.

Use `dhalKoaFromEngine(engine)` for explicit lifecycle control.

### Hono on Node.js

```ts
import { Hono } from "hono";
import { dhalHono } from "@rokadhq/dhal/hono";

const app = new Hono();

app.use("*", dhalHono({ configPath: "dhal.json" }));
app.get("/health", (context) => context.json({ ok: true }));
```

The Hono adapter consumes standard Web `Request` and `Response` objects. The supported v1.1 target is Hono on the Node.js runtime; edge-runtime compatibility is not part of the current support commitment.

Use `dhalHonoFromEngine(engine)` with an existing engine.

### Raw `node:http`

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

The raw adapter normalizes method, path, headers, IP, identity headers, and content length without consuming the request stream.

## Start safely

Create a generic starter configuration manually when guided onboarding is not required:

```bash
npx dhal init
```

The default configuration begins in `monitor` mode:

```json
{
  "schemaVersion": "1",
  "mode": "monitor",
  "trustProxy": false,
  "runtime": {
    "onInternalError": "allow",
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
    }
  }
}
```

Recommended rollout:

1. deploy globally in `monitor` mode;
2. replay known-good and malicious requests;
3. review `wouldBlock` events and false positives;
4. enable `block` only on selected high-risk routes;
5. expand enforcement gradually.

Run before enabling enforcement:

```bash
npx dhal test-config
npx dhal migrate --check
npx dhal doctor
npx dhal doctor --fix --dry-run
npx dhal readiness --production
npx dhal replay fixtures.replay.json
```

## Modes

```text
off      disables inspection
monitor  records what Dhal would block while allowing the request
block    actively blocks matching requests
strict   also blocks when internal security evaluation fails
```

A block decision in `monitor` mode becomes an allowed response with `wouldBlock: true`. Receiving HTTP 200 during monitor-mode testing does not mean Dhal failed to detect the request.

Route profiles may override the global mode:

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

## Bot detection semantics

Bot detection is score-based by default. A suspicious user-agent is a signal, not always an immediate deny decision.

For example, `python-requests` is included in the default suspicious user-agent list, but the default policy requires enough combined score and at least two signals before blocking. This avoids globally blocking legitimate scripts, SDKs, internal jobs, and monitoring tools.

For a route where one suspicious user-agent signal should be sufficient:

```json
{
  "routes": {
    "/internal/*": {
      "mode": "block",
      "rules": {
        "bot": {
          "enabled": true,
          "scoreThreshold": 45,
          "falsePositiveControls": {
            "minSignals": 1
          }
        }
      }
    }
  }
}
```

Apply stricter thresholds narrowly and validate them with replay fixtures before production enforcement.

## Identity semantics

Configured identity headers tell Dhal where trusted identity values may be found. Their absence is not an authentication failure and does not block a request by default.

This is intentional because public, login, signup, and machine-facing routes may not have `userId`, `tenantId`, or `apiKeyId` values. Missing identity components are treated as `anonymous` when used in rate-limit keys.

Identity headers are not proof of authentication. Populate identity from trusted application context or a trusted proxy that strips client-supplied identity headers before injecting its own values.

Dhal does not replace authentication or authorization. Enforce required identity in the application or API gateway and use Dhal identity values to improve rate limiting, signals, suppressions, and observability.

## Framework presets

List all operational and framework presets:

```bash
npx dhal presets list
```

Framework monitor baselines:

```text
express-api
fastify-api
nestjs-api
koa-api
hono-node-api
node-http-api
```

Operational presets:

```text
starter
api-production
auth-hardened
strict-json-api
behind-proxy
observability
```

Inspect or apply a preset:

```bash
npx dhal presets show nestjs-api
npx dhal presets apply hono-node-api --output dhal.hono.json
```

Presets are explicit configuration overlays. Review and validate generated output before deployment.

## OpenAPI policy generation

Inspect without writing:

```bash
npx dhal openapi inspect openapi.json
```

Preview generated policy:

```bash
npx dhal openapi generate openapi.yaml
```

Write into the configured file with a backup:

```bash
npx dhal openapi generate openapi.yaml --config dhal.json --write
```

Write a separate proposal:

```bash
npx dhal openapi generate openapi.json --output dhal.openapi.json
```

JSON descriptions are parsed structurally. YAML uses a conservative scanner and does not expand arbitrary anchors, merge keys, or external references. Convert complex YAML descriptions to JSON before generation when complete interpretation is required.

Generated policy is a reviewable security proposal, not an authorization model.

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

Dhal refuses to start an enforcing deployment that declares Redis-backed rate limiting without receiving a distributed rate-limit store. It also refuses to start an enforcing blocking-reputation configuration without an available provider.

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

Lifecycle methods:

- `flush(timeoutMs?)` drains current managed telemetry;
- `close(timeoutMs?)` stops new inspections, drains telemetry, and removes event listeners;
- `getRuntimeSnapshot()` returns operational counters and telemetry health.

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

Webhook delivery is bounded to protect application memory. Pending deliveries can be drained through `flush()` or `close()`.

## CLI reference

```bash
npx dhal add
npx dhal init
npx dhal test-config
npx dhal explain-config
npx dhal schema
npx dhal migrate --check
npx dhal doctor
npx dhal doctor --fix --dry-run
npx dhal openapi inspect openapi.json
npx dhal openapi generate openapi.yaml
npx dhal ci
npx dhal readiness --production
npx dhal compat
npx dhal stability
npx dhal rules
npx dhal presets list
npx dhal replay fixtures.replay.json
npx dhal simulate fixtures.simulation.json
npx dhal report --output dhal.report.json
npx dhal release-check --target stable --require-build
```

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

- stable exports are not removed or renamed without a major release;
- stable CLI commands remain available;
- `schemaVersion: "1"` remains backward compatible;
- deprecated APIs receive migration guidance before removal;
- explicitly experimental APIs may evolve within v1.x.

AI-assisted autosetup remains experimental.

## Release integrity

Stable releases are validated across:

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

Use Dhal as part of defense in depth with:

- CDN and edge controls;
- DDoS protection;
- trusted reverse proxies;
- network policies and firewalls;
- secrets management;
- authentication and authorization;
- application validation;
- centralized monitoring and incident response.

## Documentation

- [Dhal documentation](https://rokad.co/en/docs/dhal)
- `ONBOARDING.md`
- `OPENAPI.md`
- `NESTJS.md`
- `KOA_HONO.md`
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

## About Rokad

Dhal is developed and maintained by [Rokad](https://rokad.co/), a technology company focused on software, artificial intelligence, digital infrastructure, and open-source developer tools.

## License

MIT

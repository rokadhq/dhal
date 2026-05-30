# Dhal

Dhal is an app-native WAF, bot-defense, policy-control, and request security middleware for Node.js applications.

It sits inside the application request path and provides deterministic controls such as IP allow/block lists, CIDR matching, rate limiting, route-aware policies, attack signatures, IP reputation checks, bot detection, credential-stuffing signals, honeypot canaries, webhooks, OpenTelemetry hooks, CI checks, false-positive replay, and AI-assisted autosetup.

Dhal complements CDN/edge/network WAFs. It does not replace upstream DDoS or bandwidth-exhaustion protection.

## v0.11 alpha-public focus

Dhal v0.11 alpha-public hardens the package for real public usage. It adds runtime failure policy controls, health-check/preflight bypasses, privacy-first observability redaction, support-report generation, and stronger diagnostics for production installs.

The package remains pre-1.0. Treat the public API as usable but not frozen. Production users should pin versions, start in `monitor`, use `dhal replay` for false-positive regression tests, and move specific routes to `block` only after review.

## v0.10 focus

Dhal v0.10 is the production-onboarding release. It adds reviewable config presets through `dhal presets`, public preset APIs, and safer upgrade paths from monitor mode to route-level blocking. The goal is to help teams move from “installed” to “production-shaped policy” without hiding behavior behind magic defaults.

## v0.9 focus

Dhal v0.9 standardized the scoped package identity `@rokadhq/dhal`, added `dhal doctor` for production-readiness diagnostics, exposed a built-in rule catalog through `dhal rules`, and added public API exports for rule/catalog and doctor tooling.

Dhal remains product-named **Dhal**. The npm package is `@rokadhq/dhal`, the CLI command is `dhal`, and the config file is `dhal.json`.

## v0.7 feature baseline

Dhal v0.7 added rule-quality and setup automation:

- rule packs: `generic-web`, `api`, `auth`, `wordpress`, `strict-api`
- confidence metadata on signature/header/API decisions
- SSRF, RCE, GraphQL introspection, SSTI, and WordPress probe signatures
- positive security model for JSON APIs
- header anomaly detection
- JSON Content-Type/body mismatch checks
- IPv4 and IPv6 CIDR allow/block support
- false-positive replay harness through `dhal replay`
- AI-assisted autosetup through `dhal autosetup`, powered by the optional Vercel AI SDK `ai` package


## Publish readiness

This package includes a publish checklist and release scripts:

```bash
npm run verify:publish
npm run pack:dry
npm publish --tag next --provenance
```

See `PUBLISHING.md` before the first npm publish.

## Install

```bash
npm install @rokadhq/dhal
```

Optional AI autosetup dependencies:

```bash
npm install ai @ai-sdk/openai
```

Or use Vercel AI Gateway with the `ai` package only, depending on your AI SDK setup.

## Express

```ts
import express from "express";
import { dhal } from "@rokadhq/dhal/express";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(dhal());

app.post("/api/login", (req, res) => {
  res.status(401).json({ error: "bad credentials" });
});

app.listen(3000);
```

The Express adapter records response status codes after the request finishes. That allows credential-stuffing protection to learn from repeated 401/403 login failures and block later attempts.

## Fastify

```ts
import Fastify from "fastify";
import { dhalFastify } from "@rokadhq/dhal/fastify";

const app = Fastify();

await app.register(dhalFastify());

app.get("/", async () => ({ ok: true }));

await app.listen({ port: 3000 });
```

## Raw node:http

```ts
import http from "node:http";
import { createNodeHttpDhal } from "@rokadhq/dhal/node-http";

const dhal = createNodeHttpDhal();

const server = http.createServer(async (req, res) => {
  const decision = await dhal.inspect(req, res);
  if (decision.action === "block") return;

  res.end("ok");
});

server.listen(3000);
```

## CLI

Create a starter config:

```bash
npx dhal init
```

Validate config:

```bash
npx dhal test-config
```

Run production-readiness diagnostics:

```bash
npx dhal doctor
```

List the effective rule catalog:

```bash
npx dhal rules
```

Generate a redacted support report for debugging installs:

```bash
npx dhal report --output dhal.report.json
```

List production-ready config presets:

```bash
npx dhal presets
```

Inspect a preset before applying it:

```bash
npx dhal presets show api-production
```

Write a preset-merged config to a review file:

```bash
npx dhal presets apply api-production --output dhal.production.json
```

Apply a preset directly to `dhal.json`:

```bash
npx dhal presets apply auth-hardened --write
```
## Runtime safety controls

Dhal defaults to availability-first behavior for alpha/public usage:

```json
{
  "runtime": {
    "onInternalError": "allow",
    "internalErrorStatusCode": 500,
    "maxInspectionMs": 25,
    "bypass": {
      "enabled": true,
      "paths": ["/health", "/healthz", "/ready", "/readyz", "/live", "/livez"],
      "methods": ["OPTIONS"]
    }
  }
}
```

For hardened internal APIs, you can set `runtime.onInternalError` to `block`, but test that with `dhal simulate`, `dhal replay`, and `dhal doctor` before rollout.

## Privacy-first observability

Security logs and events are useful, but they can contain sensitive operational data. Dhal now redacts observability payloads by default:

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

This affects Dhal security events, logs, telemetry payloads, and support reports. The request path and route are preserved for debugging; IP and identity keys are masked or hashed depending on config.

## Config presets

Presets are named, reviewable config overlays. They do not replace `dhal.json`; they help create a safer starting policy for common deployment shapes.

Available presets:

- `starter` — monitor-mode baseline for first installs
- `api-production` — JSON API baseline with Redis/Valkey, trusted proxy assumptions, OTel-ready settings, and enforcing route profiles
- `auth-hardened` — login/auth route hardening and credential-stuffing controls
- `strict-json-api` — positive-security model for APIs that should only accept JSON request bodies
- `behind-proxy` — deployment baseline for CDN/reverse-proxy/ingress setups
- `observability` — OpenTelemetry and signed-webhook-ready telemetry settings

Programmatic usage:

```ts
import { applyDhalPreset, getDhalPreset, listDhalPresets } from "@rokadhq/dhal";

const presets = listDhalPresets();
const apiPreset = getDhalPreset("api-production");
const config = applyDhalPreset({}, apiPreset.name);
```

## AI-assisted autosetup

Autosetup scans your Node project, detects framework hints and routes, builds a deterministic security proposal, and can optionally ask an AI SDK model to refine the config.

Dry-run, deterministic only:

```bash
npx dhal autosetup . --no-ai --json
```

AI-assisted proposal using AI Gateway/global provider model strings:

```bash
AI_GATEWAY_API_KEY=... npx dhal autosetup . \
  --provider gateway \
  --model openai/gpt-4.1-mini \
  --json
```

OpenAI provider package:

```bash
OPENAI_API_KEY=... npx dhal autosetup . \
  --provider openai \
  --model gpt-4.1-mini \
  --json
```

Write the merged config:

```bash
npx dhal autosetup . --no-ai --write
```

Write to a separate review file:

```bash
npx dhal autosetup . --no-ai --write --output dhal.proposed.json
```

Custom provider module:

```bash
npx dhal autosetup . \
  --provider custom \
  --provider-module ./security-ai-provider.js \
  --provider-export createModel \
  --model company/security-model-v1
```

Autosetup does not inline secrets. API keys should stay in provider-specific environment variables.

## Rule packs

```json
{
  "rules": {
    "packs": ["generic-web", "api", "auth"],
    "api": {
      "enabled": true,
      "requireJsonContentType": true,
      "allowedContentTypes": ["application/json", "application/problem+json"],
      "methodsWithBody": ["POST", "PUT", "PATCH"],
      "maxJsonDepth": 20,
      "maxJsonKeys": 500
    },
    "headers": {
      "enabled": true,
      "requireHostHeader": true,
      "maxHeaderCount": 96,
      "maxHeaderBytes": 16384,
      "suspiciousHeaders": ["x-original-url", "x-rewrite-url"],
      "blockConflictingForwardingHeaders": false
    },
    "contentType": {
      "enabled": true,
      "blockMissingOnBodyMethods": false,
      "blockJsonMismatch": true,
      "allowedJsonMimeTypes": ["application/json", "application/problem+json"]
    }
  }
}
```

Each matching decision can include `meta.confidence`, giving downstream SIEM/agent workflows more context for triage.

## Modes

```txt
off      disables inspection
monitor  logs what Dhal would block, but allows the request
block    actively blocks matching requests
strict   blocks on internal evaluation errors
```

Route profiles may override the global mode. A common production setup is global `monitor` with selected high-risk routes set to `block`.

## Route-aware profiles

```json
{
  "mode": "monitor",
  "routes": {
    "/api/login": {
      "mode": "block",
      "tags": ["auth", "credential-stuffing"],
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
    },
    "/api/private/*": {
      "mode": "block",
      "rateLimit": {
        "enabled": true,
        "windowSeconds": 60,
        "max": 30,
        "keyBy": ["tenantId", "apiKeyId", "route"]
      }
    }
  }
}
```

## Policy controls

### Severity mapping

```json
{
  "policy": {
    "severity": {
      "default": "low",
      "categories": {
        "honeypot": "critical",
        "credential_stuffing": "high",
        "signature": "high",
        "rate_limit": "medium"
      },
      "rules": {
        "signature.path_traversal": "critical",
        "honeypot.triggered": "critical"
      }
    }
  }
}
```

### Rule suppressions

Suppressions are explicit, auditable exceptions. Prefer narrow matchers and `expiresAt`.

```json
{
  "policy": {
    "suppressions": [
      {
        "id": "known-validation-scanner",
        "enabled": true,
        "ruleId": "honeypot.triggered",
        "path": "/.well-known/test-canary",
        "reason": "temporary validation scanner",
        "expiresAt": "2999-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

A suppressed block becomes `action: "allow"` with `wouldBlock: true`, `meta.suppressed: true`, and audit metadata.

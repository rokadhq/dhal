# Dhal

Dhal is an app-native WAF, bot-defense, policy-control, and request security middleware for Node.js applications.

It sits inside the application request path and provides deterministic controls such as IP allow/block lists, CIDR matching, rate limiting, route-aware policies, attack signatures, IP reputation checks, bot detection, credential-stuffing signals, honeypot canaries, webhooks, OpenTelemetry hooks, CI checks, false-positive replay, and AI-assisted autosetup.

Dhal complements CDN/edge/network WAFs. It does not replace upstream DDoS or bandwidth-exhaustion protection.

## v0.8 focus

Dhal v0.8 is the npm-publish-ready release. It keeps the v0.7 rule-quality and setup automation features, and adds package metadata, publish checks, release docs, security policy, license file, and provenance-ready npm configuration.

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
import { dhal } from "dhal/express";

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
import { dhalFastify } from "dhal/fastify";

const app = Fastify();

await app.register(dhalFastify());

app.get("/", async () => ({ ok: true }));

await app.listen({ port: 3000 });
```

## Raw node:http

```ts
import http from "node:http";
import { createNodeHttpDhal } from "dhal/node-http";

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

Run CI posture checks:

```bash
npx dhal ci
npx dhal ci --json
```

Export JSON schema:

```bash
npx dhal schema dhal.schema.json
```

Migrate an older config to the current merged schema:

```bash
npx dhal migrate dhal.json dhal.migrated.json
```

Explain global and route-level controls:

```bash
npx dhal explain-config
```

Simulate requests, including optional `responseStatus` fields that feed credential-stuffing signals:

```bash
npx dhal simulate fixtures.simulation.json
npx dhal simulate fixtures.simulation.json --json
```

Replay false-positive fixtures:

```bash
npx dhal replay fixtures.replay.json
npx dhal replay fixtures.replay.json --fail-on-block
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

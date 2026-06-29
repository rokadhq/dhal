# Dhal with Koa and Hono

Dhal v1.1 adds framework-native middleware for Koa and Hono while reusing the same stable Dhal engine, configuration, stores, telemetry, and route-policy model.

## Koa

Register Dhal before application routes and other middleware that should only run after request inspection.

```ts
import Koa from "koa";
import Router from "@koa/router";
import { dhalKoa } from "@rokadhq/dhal";

const app = new Koa();
const router = new Router();

app.use(dhalKoa({ configPath: "dhal.json" }));

router.get("/health", (context) => {
  context.body = { ok: true };
});

app.use(router.routes());
app.listen(3000);
```

The Koa adapter:

- inspects the request before downstream middleware;
- stops the middleware chain when Dhal blocks;
- sets `x-dhal-action` and `x-dhal-rule` response headers;
- records the final downstream response status for credential-stuffing signals;
- reads optional identity values from `context.state.userId`, `tenantId`, `apiKeyId`, or `context.state.user.id`.

Use an existing engine when custom stores or telemetry are required:

```ts
import { createDhal, dhalKoaFromEngine } from "@rokadhq/dhal";

const engine = createDhal({
  configPath: "dhal.json",
  rateLimitStore,
  signalStore,
  telemetry
});

app.use(dhalKoaFromEngine(engine));
```

## Hono on Node.js

Register Dhal before protected routes.

```ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { dhalHono } from "@rokadhq/dhal";

const app = new Hono();

app.use("*", dhalHono({ configPath: "dhal.json" }));

app.get("/health", (context) => context.json({ ok: true }));

serve({ fetch: app.fetch, port: 3000 });
```

The Hono adapter consumes standard Web `Request` and `Response` objects. It is intended for Hono applications running on the supported Node.js runtime. Platform-specific edge runtimes are not included in the v1.1 compatibility commitment unless they provide the required Node.js APIs used by the Dhal engine.

Identity values may be exposed through `context.var.userId`, `tenantId`, `apiKeyId`, or `context.var.user.id`.

Use an existing engine when required:

```ts
import { createDhal, dhalHonoFromEngine } from "@rokadhq/dhal";

const engine = createDhal({ configPath: "dhal.json", telemetry });
app.use("*", dhalHonoFromEngine(engine));
```

## Rollout guidance

For both frameworks:

1. start globally in `monitor` mode;
2. inspect `wouldBlock` events and replay known-good requests;
3. promote selected high-confidence route profiles to `block`;
4. use Redis or Valkey for shared counters in horizontally scaled or serverless deployments;
5. close the engine during graceful shutdown so managed telemetry is drained.

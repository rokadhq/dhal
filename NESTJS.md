# Dhal with NestJS

Dhal v1.1 adds a bootstrap integration for NestJS HTTP applications using either the default Express platform or `@nestjs/platform-fastify`.

The integration reuses Dhal's existing, tested Express and Fastify adapters. It does not add a runtime dependency on NestJS and it does not change the Nest request lifecycle.

## Basic setup

Install Dhal normally:

```bash
npm install @rokadhq/dhal
```

Create or validate `dhal.json`, then install Dhal after creating the Nest application and before calling `app.listen()`.

```ts
import { NestFactory } from "@nestjs/core";
import { installDhalNest } from "@rokadhq/dhal";
import { AppModule } from "./app.module.js";

const app = await NestFactory.create(AppModule);

const dhal = await installDhalNest(app, {
  configPath: "dhal.json"
});

app.enableShutdownHooks();
await app.listen(3000);
```

Dhal detects whether the Nest application uses Express or Fastify and installs the matching adapter.

## Fastify platform

No Dhal-specific platform option is normally required.

```ts
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { NestFactory } from "@nestjs/core";
import { installDhalNest } from "@rokadhq/dhal";
import { AppModule } from "./app.module.js";

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter()
);

await installDhalNest(app, { configPath: "dhal.json" });
await app.listen(3000, "0.0.0.0");
```

The platform may be specified explicitly when a custom Nest HTTP adapter obscures its type:

```ts
await installDhalNest(app, {
  platform: "fastify",
  configPath: "dhal.json"
});
```

## Existing engine

Use `installDhalNestFromEngine()` when Dhal is configured with shared stores, custom reputation providers, or composed telemetry.

```ts
import {
  RedisRateLimitStore,
  RedisSignalStore,
  createDhal,
  installDhalNestFromEngine
} from "@rokadhq/dhal";

const engine = createDhal({
  configPath: "dhal.json",
  rateLimitStore: new RedisRateLimitStore(redis),
  signalStore: new RedisSignalStore(redis)
});

const installation = await installDhalNestFromEngine(app, engine);
```

## Shutdown

The returned installation exposes the engine and a convenience `close()` method.

```ts
process.once("SIGTERM", () => {
  void dhal.close(5_000).finally(() => process.exit(0));
});
```

Applications that already manage the engine lifecycle may call `engine.flush()` and `engine.close()` directly.

## Operational notes

- Install Dhal before `app.listen()` so middleware and Fastify hooks are registered before the application starts accepting traffic.
- Start with global `monitor` mode and promote selected route profiles to `block` only after reviewing `wouldBlock` events.
- Nest applications inherit the same proxy, distributed-store, telemetry, and graceful-shutdown requirements as direct Express or Fastify applications.
- The bootstrap adapter supports Nest HTTP applications. Nest microservice transports without an HTTP adapter are outside this integration.

import { createDhal, type DhalEngine } from "../engine.js";
import type { DhalOptions } from "../types.js";
import { dhalFromEngine } from "./express.js";
import { dhalFastifyFromEngine } from "./fastify.js";

export type DhalNestPlatform = "express" | "fastify";

export type DhalNestHttpAdapter = {
  getType?: (() => string) | undefined;
  getInstance?: (() => unknown) | undefined;
};

export type DhalNestApplication = {
  getHttpAdapter: () => DhalNestHttpAdapter;
  use?: ((...args: unknown[]) => unknown) | undefined;
};

export type DhalNestInstallOptions = DhalOptions & {
  platform?: DhalNestPlatform | undefined;
};

export type DhalNestInstallFromEngineOptions = {
  platform?: DhalNestPlatform | undefined;
};

export type DhalNestInstallation = {
  engine: DhalEngine;
  platform: DhalNestPlatform;
  close: (timeoutMs?: number) => Promise<void>;
};

/**
 * Installs Dhal into a NestJS HTTP application before `app.listen()`.
 *
 * The adapter intentionally depends only on Nest's public application shape,
 * so importing `@rokadhq/dhal/nest` does not add a runtime dependency on Nest.
 */
export async function installDhalNest(
  application: DhalNestApplication,
  options: DhalNestInstallOptions = {}
): Promise<DhalNestInstallation> {
  const { platform, ...dhalOptions } = options;
  const engine = createDhal(dhalOptions);

  try {
    return await installDhalNestFromEngine(application, engine, { platform });
  } catch (error) {
    await engine.close();
    throw error;
  }
}

/**
 * Installs an existing Dhal engine into a NestJS HTTP application.
 * Use this when the engine is shared with custom stores, telemetry, or
 * application lifecycle management.
 */
export async function installDhalNestFromEngine(
  application: DhalNestApplication,
  engine: DhalEngine,
  options: DhalNestInstallFromEngineOptions = {}
): Promise<DhalNestInstallation> {
  if (!application || typeof application.getHttpAdapter !== "function") {
    throw new TypeError("A NestJS application with getHttpAdapter() is required.");
  }

  const httpAdapter = application.getHttpAdapter();
  const platform = options.platform ?? detectNestPlatform(httpAdapter);

  if (platform === "express") {
    installExpressMiddleware(application, httpAdapter, engine);
  } else {
    await installFastifyPlugin(httpAdapter, engine);
  }

  return {
    engine,
    platform,
    close: (timeoutMs?: number) => engine.close(timeoutMs)
  };
}

function detectNestPlatform(adapter: DhalNestHttpAdapter): DhalNestPlatform {
  const adapterType = adapter.getType?.().trim().toLowerCase();

  if (adapterType === "express" || adapterType?.includes("express")) return "express";
  if (adapterType === "fastify" || adapterType?.includes("fastify")) return "fastify";

  const instance = adapter.getInstance?.() as Record<string, unknown> | undefined;
  if (instance && typeof instance.register === "function") return "fastify";
  if (instance && typeof instance.use === "function") return "express";

  throw new Error(
    `Unsupported NestJS HTTP adapter${adapterType ? `: ${adapterType}` : ""}. ` +
    "Dhal supports NestJS applications using Express or Fastify."
  );
}

function installExpressMiddleware(
  application: DhalNestApplication,
  adapter: DhalNestHttpAdapter,
  engine: DhalEngine
): void {
  const middleware = dhalFromEngine(engine);

  if (typeof application.use === "function") {
    application.use(middleware);
    return;
  }

  const instance = adapter.getInstance?.() as { use?: ((...args: unknown[]) => unknown) | undefined } | undefined;
  if (typeof instance?.use === "function") {
    instance.use(middleware);
    return;
  }

  throw new Error("NestJS Express adapter does not expose application.use() or adapter.getInstance().use().");
}

async function installFastifyPlugin(adapter: DhalNestHttpAdapter, engine: DhalEngine): Promise<void> {
  const instance = adapter.getInstance?.() as {
    register?: ((plugin: unknown) => unknown | Promise<unknown>) | undefined;
  } | undefined;

  if (typeof instance?.register !== "function") {
    throw new Error("NestJS Fastify adapter does not expose adapter.getInstance().register().");
  }

  await instance.register(dhalFastifyFromEngine(engine));
}

import { createDhal, type DhalEngine } from "../engine.js";
import type { DhalHeaders, DhalOptions, DhalRequest } from "../types.js";
import { extractClientIp } from "../utils/ip.js";
import { extractIdentity } from "../utils/identity.js";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

const normalizedRequestSymbol = Symbol("dhal.normalizedRequest");
const skipOverrideSymbol = Symbol.for("skip-override");
const displayNameSymbol = Symbol.for("fastify.display-name");

type DhalFastifyRequest = FastifyRequest & {
  rawBody?: string | Buffer | undefined;
  user?: { id?: string | undefined } | undefined;
  userId?: string | undefined;
  tenantId?: string | undefined;
  apiKeyId?: string | undefined;
  [normalizedRequestSymbol]?: DhalRequest | undefined;
  routeOptions?: { url?: string | undefined } | undefined;
  routerPath?: string | undefined;
};

export function dhalFastify(options?: DhalOptions): FastifyPluginAsync {
  const engine = createDhal(options);
  return dhalFastifyFromEngine(engine);
}

export function dhalFastifyFromEngine(engine: DhalEngine): FastifyPluginAsync {
  const plugin: FastifyPluginAsync = async function dhalFastifyPlugin(fastify): Promise<void> {
    fastify.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
      const typedRequest = request as DhalFastifyRequest;
      const normalized = normalizeFastifyRequest(typedRequest, engine);
      typedRequest[normalizedRequestSymbol] = normalized;
      const decision = await engine.inspect(normalized);

      if (decision.action === "block") {
        if (!reply.sent) {
          reply
            .code(decision.statusCode)
            .header("x-dhal-action", "block")
            .header("x-dhal-rule", decision.ruleId ?? "unknown")
            .send({
              error: responseMessage(decision) ?? engine.config.response.message,
              reason: decision.reason,
              ruleId: decision.ruleId
            });
        }
      }
    });

    fastify.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
      const normalized = (request as DhalFastifyRequest)[normalizedRequestSymbol];
      if (normalized) {
        await engine.recordOutcome(normalized, { statusCode: reply.statusCode });
      }
    });
  };

  // Match fastify-plugin's non-encapsulated behavior without adding a runtime dependency.
  // This makes `await app.register(dhalFastify())` protect routes registered on the root app.
  Object.defineProperty(plugin, skipOverrideSymbol, { value: true });
  Object.defineProperty(plugin, displayNameSymbol, { value: "dhal" });
  return plugin;
}

function normalizeFastifyRequest(req: DhalFastifyRequest, engine: DhalEngine): DhalRequest {
  const headers = lowerCaseHeaders(req.headers as DhalHeaders);
  const path = safePathname(req.url);

  const identity = extractIdentity(headers, engine.config, {
    userId: req.userId ?? req.user?.id,
    tenantId: req.tenantId,
    apiKeyId: req.apiKeyId
  });

  return {
    method: req.method,
    url: req.url,
    path,
    headers,
    ip: extractClientIp({
      socketIp: req.raw.socket.remoteAddress ?? req.ip,
      headers,
      trustProxy: engine.config.trustProxy
    }),
    route: req.routeOptions?.url ?? req.routerPath ?? path,
    body: req.body,
    rawBody: req.rawBody,
    ...identity
  };
}

function safePathname(url: string): string {
  try {
    return new URL(url, "http://dhal.local").pathname;
  } catch {
    return url.split("?")[0] || "/";
  }
}

function lowerCaseHeaders(headers: DhalHeaders): DhalHeaders {
  const out: DhalHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key.toLowerCase()] = value;
  }
  return out;
}

function responseMessage(decision: { meta?: Record<string, unknown> | undefined }): string | undefined {
  return typeof decision.meta?.responseMessage === "string" ? decision.meta.responseMessage : undefined;
}

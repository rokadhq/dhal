import {
  createDhal,
  extractClientIp,
  extractIdentity
} from "../chunk-DHI46RN2.js";
import "../chunk-BGMTMZGL.js";
import "../chunk-X7PS5EQX.js";
import "../chunk-IRZXZAQ4.js";
import "../chunk-JCY2QFLP.js";
import "../chunk-35HYGEBK.js";

// src/adapters/fastify.ts
var normalizedRequestSymbol = /* @__PURE__ */ Symbol("dhal.normalizedRequest");
function dhalFastify(options) {
  const engine = createDhal(options);
  return dhalFastifyFromEngine(engine);
}
function dhalFastifyFromEngine(engine) {
  return async function dhalFastifyPlugin(fastify) {
    fastify.addHook("preHandler", async (request, reply) => {
      const typedRequest = request;
      const normalized = normalizeFastifyRequest(typedRequest, engine);
      typedRequest[normalizedRequestSymbol] = normalized;
      const decision = await engine.inspect(normalized);
      if (decision.action === "block") {
        if (!reply.sent) {
          reply.code(decision.statusCode).header("x-dhal-action", "block").header("x-dhal-rule", decision.ruleId ?? "unknown").send({
            error: responseMessage(decision) ?? engine.config.response.message,
            reason: decision.reason,
            ruleId: decision.ruleId
          });
        }
      }
    });
    fastify.addHook("onResponse", async (request, reply) => {
      const normalized = request[normalizedRequestSymbol];
      if (normalized) {
        await engine.recordOutcome(normalized, { statusCode: reply.statusCode });
      }
    });
  };
}
function normalizeFastifyRequest(req, engine) {
  const headers = lowerCaseHeaders(req.headers);
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
function safePathname(url) {
  try {
    return new URL(url, "http://dhal.local").pathname;
  } catch {
    return url.split("?")[0] || "/";
  }
}
function lowerCaseHeaders(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key.toLowerCase()] = value;
  }
  return out;
}
function responseMessage(decision) {
  return typeof decision.meta?.responseMessage === "string" ? decision.meta.responseMessage : void 0;
}
export {
  dhalFastify,
  dhalFastifyFromEngine
};

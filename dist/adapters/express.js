import {
  createDhal,
  extractClientIp,
  extractIdentity
} from "../chunk-BDTAGEUX.js";
import "../chunk-IRZXZAQ4.js";
import "../chunk-5I5HJW4S.js";
import "../chunk-NIFKXCUN.js";
import "../chunk-X7PS5EQX.js";
import "../chunk-PQZMP3BG.js";
import "../chunk-I43VAMHW.js";

// src/adapters/express.ts
function dhal(options) {
  const engine = createDhal(options);
  return dhalFromEngine(engine);
}
function dhalFromEngine(engine) {
  return async function dhalMiddleware(req, res, next) {
    try {
      const normalized = normalizeExpressRequest(req, engine);
      res.once("finish", () => {
        void engine.recordOutcome(normalized, { statusCode: res.statusCode });
      });
      const decision = await engine.inspect(normalized);
      if (decision.action === "block") {
        if (!res.headersSent) {
          res.setHeader("x-dhal-action", "block");
          res.setHeader("x-dhal-rule", decision.ruleId ?? "unknown");
          res.status(decision.statusCode).json({
            error: responseMessage(decision) ?? engine.config.response.message,
            reason: decision.reason,
            ruleId: decision.ruleId
          });
        }
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
function normalizeExpressRequest(req, engine) {
  const url = req.originalUrl ?? req.url;
  const path = req.path ?? safePathname(url);
  const headers = lowerCaseHeaders(req.headers);
  const identity = extractIdentity(headers, engine.config, {
    userId: req.userId ?? req.user?.id,
    tenantId: req.tenantId,
    apiKeyId: req.apiKeyId
  });
  return {
    method: req.method,
    url,
    path,
    headers,
    ip: extractClientIp({
      socketIp: req.socket?.remoteAddress ?? req.ip,
      headers,
      trustProxy: engine.config.trustProxy
    }),
    route: typeof req.route?.path === "string" ? req.route.path : path,
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
  dhal,
  dhalFromEngine
};

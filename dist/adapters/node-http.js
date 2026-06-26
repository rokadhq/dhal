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

// src/adapters/node-http.ts
function createNodeHttpDhal(options) {
  const engine = createDhal(options);
  return {
    engine,
    async inspect(req, res) {
      const normalized = normalizeNodeRequest(req, engine);
      res.once("finish", () => {
        void engine.recordOutcome(normalized, { statusCode: res.statusCode });
      });
      const decision = await engine.inspect(normalized);
      if (decision.action === "block") {
        res.statusCode = decision.statusCode;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.setHeader("x-dhal-action", "block");
        res.setHeader("x-dhal-rule", decision.ruleId ?? "unknown");
        res.end(JSON.stringify({
          error: responseMessage(decision) ?? engine.config.response.message,
          reason: decision.reason,
          ruleId: decision.ruleId
        }));
      }
      return decision;
    }
  };
}
function normalizeNodeRequest(req, engine) {
  const url = req.url ?? "/";
  const headers = lowerCaseHeaders(req.headers);
  const identity = extractIdentity(headers, engine.config);
  return {
    method: req.method ?? "GET",
    url,
    path: safePathname(url),
    headers,
    ip: extractClientIp({
      socketIp: req.socket.remoteAddress,
      headers,
      trustProxy: engine.config.trustProxy
    }),
    contentLength: readContentLength(headers),
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
function readContentLength(headers) {
  const value = headers["content-length"];
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return void 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : void 0;
}
function responseMessage(decision) {
  return typeof decision.meta?.responseMessage === "string" ? decision.meta.responseMessage : void 0;
}
export {
  createNodeHttpDhal
};

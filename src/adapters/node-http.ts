import type { IncomingMessage, ServerResponse } from "node:http";
import { createDhal, type DhalEngine } from "../engine.js";
import type { DhalDecision, DhalHeaders, DhalOptions, DhalRequest } from "../types.js";
import { extractClientIp } from "../utils/ip.js";
import { extractIdentity } from "../utils/identity.js";

export function createNodeHttpDhal(options?: DhalOptions): {
  engine: DhalEngine;
  inspect(req: IncomingMessage, res: ServerResponse): Promise<DhalDecision>;
} {
  const engine = createDhal(options);

  return {
    engine,
    async inspect(req: IncomingMessage, res: ServerResponse): Promise<DhalDecision> {
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

function normalizeNodeRequest(req: IncomingMessage, engine: DhalEngine): DhalRequest {
  const url = req.url ?? "/";
  const headers = lowerCaseHeaders(req.headers as DhalHeaders);

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

function readContentLength(headers: DhalHeaders): number | undefined {
  const value = headers["content-length"];
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function responseMessage(decision: { meta?: Record<string, unknown> | undefined }): string | undefined {
  return typeof decision.meta?.responseMessage === "string" ? decision.meta.responseMessage : undefined;
}

import { createDhal, type DhalEngine } from "../engine.js";
import type { DhalOptions, DhalRequest } from "../types.js";
import { extractClientIp } from "../utils/ip.js";
import { extractIdentity } from "../utils/identity.js";
import type { NextFunction, Request, RequestHandler, Response } from "express";

type DhalExpressRequest = Request & {
  rawBody?: string | Buffer | undefined;
  user?: { id?: string | undefined } | undefined;
  userId?: string | undefined;
  tenantId?: string | undefined;
  apiKeyId?: string | undefined;
};

export function dhal(options?: DhalOptions): RequestHandler {
  const engine = createDhal(options);
  return dhalFromEngine(engine);
}

export function dhalFromEngine(engine: DhalEngine): RequestHandler {
  return async function dhalMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const normalized = normalizeExpressRequest(req as DhalExpressRequest, engine);
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

function normalizeExpressRequest(req: DhalExpressRequest, engine: DhalEngine): DhalRequest {
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

function safePathname(url: string): string {
  try {
    return new URL(url, "http://dhal.local").pathname;
  } catch {
    return url.split("?")[0] || "/";
  }
}

function lowerCaseHeaders(headers: Request["headers"]): Record<string, string | string[] | undefined> {
  const out: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key.toLowerCase()] = value;
  }
  return out;
}

function responseMessage(decision: { meta?: Record<string, unknown> | undefined }): string | undefined {
  return typeof decision.meta?.responseMessage === "string" ? decision.meta.responseMessage : undefined;
}

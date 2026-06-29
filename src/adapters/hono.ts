import { createDhal, type DhalEngine } from "../engine.js";
import type { DhalHeaders, DhalOptions, DhalRequest } from "../types.js";
import { extractClientIp } from "../utils/ip.js";
import { extractIdentity } from "../utils/identity.js";

export type DhalHonoNext = () => Promise<unknown>;

export type DhalHonoRequest = {
  raw: Request;
  method?: string | undefined;
  url?: string | undefined;
  path?: string | undefined;
  routePath?: string | undefined;
};

export type DhalHonoContext = {
  req: DhalHonoRequest;
  res?: Response | undefined;
  var?: {
    user?: { id?: string | undefined } | undefined;
    userId?: string | undefined;
    tenantId?: string | undefined;
    apiKeyId?: string | undefined;
  } | undefined;
  json?: ((body: unknown, status?: number, headers?: Record<string, string>) => Response | Promise<Response>) | undefined;
};

export type DhalHonoMiddleware = (
  context: DhalHonoContext,
  next: DhalHonoNext
) => Promise<Response | void>;

export function dhalHono(options?: DhalOptions): DhalHonoMiddleware {
  return dhalHonoFromEngine(createDhal(options));
}

export function dhalHonoFromEngine(engine: DhalEngine): DhalHonoMiddleware {
  return async function dhalHonoMiddleware(context, next): Promise<Response | void> {
    const normalized = normalizeHonoRequest(context, engine);
    const decision = await engine.inspect(normalized);

    if (decision.action === "block") {
      const body = {
        error: responseMessage(decision) ?? engine.config.response.message,
        reason: decision.reason,
        ruleId: decision.ruleId
      };
      const headers = {
        "content-type": "application/json; charset=UTF-8",
        "x-dhal-action": "block",
        "x-dhal-rule": decision.ruleId ?? "unknown"
      };
      const response = context.json
        ? await context.json(body, decision.statusCode, headers)
        : new Response(JSON.stringify(body), { status: decision.statusCode, headers });
      await engine.recordOutcome(normalized, { statusCode: decision.statusCode });
      return response;
    }

    try {
      await next();
    } finally {
      await engine.recordOutcome(normalized, { statusCode: context.res?.status ?? 200 });
    }
  };
}

function normalizeHonoRequest(context: DhalHonoContext, engine: DhalEngine): DhalRequest {
  const raw = context.req.raw;
  const url = context.req.url ?? raw.url;
  const path = context.req.path ?? safePathname(url);
  const headers = headersFromRequest(raw.headers);
  const vars = context.var ?? {};
  const identity = extractIdentity(headers, engine.config, {
    userId: vars.userId ?? vars.user?.id,
    tenantId: vars.tenantId,
    apiKeyId: vars.apiKeyId
  });

  return {
    method: context.req.method ?? raw.method,
    url,
    path,
    headers,
    ip: extractClientIp({
      headers,
      trustProxy: engine.config.trustProxy
    }),
    route: context.req.routePath ?? path,
    ...identity
  };
}

function headersFromRequest(headers: Headers): DhalHeaders {
  const out: DhalHeaders = {};
  headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    const existing = out[normalized];
    out[normalized] = existing === undefined ? value : Array.isArray(existing) ? [...existing, value] : [existing, value];
  });
  return out;
}

function safePathname(url: string): string {
  try {
    return new URL(url, "http://dhal.local").pathname;
  } catch {
    return url.split("?")[0] || "/";
  }
}

function responseMessage(decision: { meta?: Record<string, unknown> | undefined }): string | undefined {
  return typeof decision.meta?.responseMessage === "string" ? decision.meta.responseMessage : undefined;
}

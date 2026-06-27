import { createDhal, type DhalEngine } from "../engine.js";
import type { DhalHeaders, DhalOptions, DhalRequest } from "../types.js";
import { extractClientIp } from "../utils/ip.js";
import { extractIdentity } from "../utils/identity.js";

export type DhalKoaNext = () => Promise<unknown>;

export type DhalKoaContext = {
  method: string;
  url: string;
  originalUrl?: string | undefined;
  path?: string | undefined;
  headers?: DhalHeaders | undefined;
  ip?: string | undefined;
  status: number;
  body?: unknown;
  state?: {
    user?: { id?: string | undefined } | undefined;
    userId?: string | undefined;
    tenantId?: string | undefined;
    apiKeyId?: string | undefined;
  } | undefined;
  request?: {
    headers?: DhalHeaders | undefined;
    body?: unknown;
    rawBody?: string | Buffer | undefined;
    ip?: string | undefined;
    socket?: { remoteAddress?: string | undefined } | undefined;
  } | undefined;
  req?: { socket?: { remoteAddress?: string | undefined } | undefined } | undefined;
  set?: ((name: string, value: string) => unknown) | undefined;
  _matchedRoute?: string | undefined;
};

export type DhalKoaMiddleware = (
  context: DhalKoaContext,
  next: DhalKoaNext
) => Promise<void>;

export function dhalKoa(options?: DhalOptions): DhalKoaMiddleware {
  return dhalKoaFromEngine(createDhal(options));
}

export function dhalKoaFromEngine(engine: DhalEngine): DhalKoaMiddleware {
  return async function dhalKoaMiddleware(context, next): Promise<void> {
    const normalized = normalizeKoaRequest(context, engine);
    const decision = await engine.inspect(normalized);

    if (decision.action === "block") {
      context.status = decision.statusCode;
      context.set?.("x-dhal-action", "block");
      context.set?.("x-dhal-rule", decision.ruleId ?? "unknown");
      context.body = {
        error: responseMessage(decision) ?? engine.config.response.message,
        reason: decision.reason,
        ruleId: decision.ruleId
      };
      await engine.recordOutcome(normalized, { statusCode: context.status });
      return;
    }

    try {
      await next();
    } finally {
      await engine.recordOutcome(normalized, { statusCode: context.status || 200 });
    }
  };
}

function normalizeKoaRequest(context: DhalKoaContext, engine: DhalEngine): DhalRequest {
  const url = context.originalUrl ?? context.url;
  const path = context.path ?? safePathname(url);
  const headers = lowerCaseHeaders(context.headers ?? context.request?.headers ?? {});
  const state = context.state ?? {};
  const identity = extractIdentity(headers, engine.config, {
    userId: state.userId ?? state.user?.id,
    tenantId: state.tenantId,
    apiKeyId: state.apiKeyId
  });

  return {
    method: context.method,
    url,
    path,
    headers,
    ip: extractClientIp({
      socketIp: context.request?.socket?.remoteAddress ?? context.req?.socket?.remoteAddress ?? context.request?.ip ?? context.ip,
      headers,
      trustProxy: engine.config.trustProxy
    }),
    route: context._matchedRoute ?? path,
    body: context.request?.body,
    rawBody: context.request?.rawBody,
    ...identity
  };
}

function lowerCaseHeaders(headers: DhalHeaders): DhalHeaders {
  const out: DhalHeaders = {};
  for (const [key, value] of Object.entries(headers)) out[key.toLowerCase()] = value;
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

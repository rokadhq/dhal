import type { DhalConfig, DhalHeaders } from "../types.js";
import { getHeader } from "./ip.js";

export type ExtractedIdentity = {
  userId?: string | undefined;
  tenantId?: string | undefined;
  apiKeyId?: string | undefined;
};

export function extractIdentity(headers: DhalHeaders, config: DhalConfig, existing: ExtractedIdentity = {}): ExtractedIdentity {
  return {
    userId: existing.userId ?? firstConfiguredHeader(headers, config.identity.headers.userId),
    tenantId: existing.tenantId ?? firstConfiguredHeader(headers, config.identity.headers.tenantId),
    apiKeyId: existing.apiKeyId ?? firstConfiguredHeader(headers, config.identity.headers.apiKeyId)
  };
}

function firstConfiguredHeader(headers: DhalHeaders, names: string[]): string | undefined {
  for (const name of names) {
    const value = getHeader(headers, name);
    if (value && value.trim().length > 0) return value.trim();
  }

  return undefined;
}

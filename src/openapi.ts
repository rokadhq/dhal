import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { deepMerge, defaultConfig } from "./config.js";
import type { DhalConfig, DhalRouteProfile, PartialDeep } from "./types.js";

export type DhalOpenApiFormat = "json" | "yaml";
export type DhalOpenApiSecurity = "required" | "none" | "unknown";
export type DhalOpenApiSignal = "authentication" | "upload" | "webhook" | "expensive" | "public" | "json-body";

export type DhalOpenApiOperation = {
  method: string;
  path: string;
  operationId?: string | undefined;
  summary?: string | undefined;
  tags: string[];
  security: DhalOpenApiSecurity;
  requestContentTypes: string[];
  signals: DhalOpenApiSignal[];
};

export type DhalOpenApiInspection = {
  ok: boolean;
  format: DhalOpenApiFormat;
  version?: string | undefined;
  title?: string | undefined;
  operations: DhalOpenApiOperation[];
  warnings: string[];
};

export type DhalOpenApiPolicyChange = {
  route: string;
  action: "add" | "preserve-existing";
  operations: string[];
  signals: DhalOpenApiSignal[];
};

export type DhalOpenApiPolicyOptions = {
  existingConfig?: PartialDeep<DhalConfig> | undefined;
  defaultRateLimitMax?: number | undefined;
};

export type DhalOpenApiPolicyResult = {
  ok: boolean;
  inspection: DhalOpenApiInspection;
  routeProfiles: Record<string, DhalRouteProfile>;
  config: DhalConfig;
  changes: DhalOpenApiPolicyChange[];
  warnings: string[];
};

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "head", "options", "trace"]);

export function inspectOpenApi(input: string | Record<string, unknown>): DhalOpenApiInspection {
  if (typeof input !== "string") return inspectOpenApiObject(input, "json");

  try {
    const parsed = JSON.parse(input) as unknown;
    if (!isRecord(parsed)) throw new Error("OpenAPI JSON root must be an object.");
    return inspectOpenApiObject(parsed, "json");
  } catch (jsonError) {
    if (looksLikeJson(input)) {
      throw new Error(`Could not parse OpenAPI JSON: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
    }
    return inspectOpenApiYaml(input);
  }
}

export function inspectOpenApiFile(path: string): DhalOpenApiInspection {
  const resolved = resolve(path);
  return inspectOpenApi(readFileSync(resolved, "utf8"));
}

export function generateDhalPolicyFromOpenApi(
  input: string | Record<string, unknown>,
  options: DhalOpenApiPolicyOptions = {}
): DhalOpenApiPolicyResult {
  const inspection = inspectOpenApi(input);
  const grouped = groupOperations(inspection.operations);
  const routeProfiles: Record<string, DhalRouteProfile> = {};
  const changes: DhalOpenApiPolicyChange[] = [];
  const warnings = [...inspection.warnings];
  const existingConfig = options.existingConfig ?? {};
  const existingRoutes = isRecord(existingConfig.routes) ? existingConfig.routes : {};

  for (const [route, operations] of grouped) {
    const signals = unique(operations.flatMap((operation) => operation.signals));
    const methods = unique(operations.map((operation) => operation.method.toUpperCase()));

    if (Object.prototype.hasOwnProperty.call(existingRoutes, route)) {
      changes.push({ route, action: "preserve-existing", operations: methods, signals });
      continue;
    }

    routeProfiles[route] = buildRouteProfile(operations, options.defaultRateLimitMax ?? 120);
    changes.push({ route, action: "add", operations: methods, signals });

    if (operations.length > 1) {
      warnings.push(`OpenAPI operations ${methods.join(", ")} share ${route}; Dhal applies one path-level profile to all methods.`);
    }
  }

  const base = deepMerge(defaultConfig, existingConfig) as DhalConfig;
  const config: DhalConfig = {
    ...base,
    mode: existingConfig.mode ?? "monitor",
    routes: {
      ...routeProfiles,
      ...base.routes
    }
  };

  for (const profile of Object.values(routeProfiles)) profile.mode = "monitor";

  return {
    ok: inspection.ok,
    inspection,
    routeProfiles,
    config,
    changes,
    warnings: unique(warnings)
  };
}

export function generateDhalPolicyFromOpenApiFile(
  path: string,
  options: DhalOpenApiPolicyOptions = {}
): DhalOpenApiPolicyResult {
  return generateDhalPolicyFromOpenApi(readFileSync(resolve(path), "utf8"), options);
}

export function openApiPathToDhalRoute(path: string): string {
  return path.replace(/\{[^/{}]+\}/g, "*");
}

function inspectOpenApiObject(document: Record<string, unknown>, format: DhalOpenApiFormat): DhalOpenApiInspection {
  const version = stringValue(document.openapi);
  const info = recordValue(document.info);
  const title = stringValue(info?.title);
  const paths = recordValue(document.paths);
  const rootSecurity = securityValue(document.security);
  const operations: DhalOpenApiOperation[] = [];
  const warnings: string[] = [];

  if (!version) warnings.push("The document does not declare an OpenAPI version.");
  else if (!version.startsWith("3.")) warnings.push(`OpenAPI ${version} is not a tested OpenAPI 3.x document.`);
  if (!paths) warnings.push("The document does not contain a paths object.");

  for (const [path, pathValue] of Object.entries(paths ?? {})) {
    const pathItem = recordValue(pathValue);
    if (!pathItem) continue;

    for (const [method, operationValue] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method.toLowerCase())) continue;
      const operation = recordValue(operationValue);
      if (!operation) continue;

      const tags = stringArray(operation.tags);
      const requestContentTypes = requestContentTypeKeys(operation.requestBody);
      const security = operation.security === undefined ? rootSecurity : securityValue(operation.security);
      const operationId = stringValue(operation.operationId);
      const summary = stringValue(operation.summary);
      operations.push({
        method: method.toUpperCase(),
        path,
        ...(operationId ? { operationId } : {}),
        ...(summary ? { summary } : {}),
        tags,
        security,
        requestContentTypes,
        signals: classifyOperation({ path, operationId, summary, tags, security, requestContentTypes })
      });
    }
  }

  return {
    ok: operations.length > 0,
    format,
    ...(version ? { version } : {}),
    ...(title ? { title } : {}),
    operations,
    warnings
  };
}

function inspectOpenApiYaml(source: string): DhalOpenApiInspection {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const operations: DhalOpenApiOperation[] = [];
  const warnings = [
    "YAML inspection uses a conservative OpenAPI path scanner; YAML anchors, merge keys, and external references are not expanded."
  ];
  let version: string | undefined;
  let title: string | undefined;
  let inInfo = false;
  let inPaths = false;
  let currentPath: string | undefined;
  let current: MutableYamlOperation | undefined;
  let tagIndent: number | undefined;
  let securityIndent: number | undefined;

  const finishCurrent = () => {
    if (!current) return;
    const operationId = current.operationId;
    const summary = current.summary;
    operations.push({
      method: current.method,
      path: current.path,
      ...(operationId ? { operationId } : {}),
      ...(summary ? { summary } : {}),
      tags: unique(current.tags),
      security: current.security,
      requestContentTypes: unique(current.requestContentTypes),
      signals: classifyOperation({
        path: current.path,
        operationId,
        summary,
        tags: current.tags,
        security: current.security,
        requestContentTypes: current.requestContentTypes
      })
    });
    current = undefined;
    tagIndent = undefined;
    securityIndent = undefined;
  };

  for (const originalLine of lines) {
    const line = stripYamlComment(originalLine);
    if (!line.trim()) continue;
    const indent = leadingSpaces(line);
    const trimmed = line.trim();

    if (indent === 0 && trimmed.startsWith("openapi:")) version = yamlScalar(trimmed.slice("openapi:".length));
    if (indent === 0 && trimmed === "info:") {
      inInfo = true;
      continue;
    }
    if (indent === 0 && trimmed === "paths:") {
      finishCurrent();
      inInfo = false;
      inPaths = true;
      continue;
    }
    if (indent === 0 && !trimmed.startsWith("openapi:") && trimmed !== "info:" && trimmed !== "paths:") {
      if (inPaths) finishCurrent();
      inInfo = false;
      inPaths = false;
    }
    if (inInfo && indent >= 2 && trimmed.startsWith("title:")) title = yamlScalar(trimmed.slice("title:".length));
    if (!inPaths) continue;

    const pathKey = yamlMappingKey(trimmed);
    if (indent === 2 && pathKey?.startsWith("/")) {
      finishCurrent();
      currentPath = pathKey;
      continue;
    }

    const methodKey = yamlMappingKey(trimmed)?.toLowerCase();
    if (indent === 4 && currentPath && methodKey && HTTP_METHODS.has(methodKey)) {
      finishCurrent();
      current = {
        method: methodKey.toUpperCase(),
        path: currentPath,
        tags: [],
        security: "unknown",
        requestContentTypes: []
      };
      continue;
    }

    if (!current || indent < 6) continue;

    if (tagIndent !== undefined) {
      if (indent > tagIndent && trimmed.startsWith("- ")) {
        current.tags.push(yamlScalar(trimmed.slice(2)));
        continue;
      }
      if (indent <= tagIndent) tagIndent = undefined;
    }

    if (securityIndent !== undefined) {
      if (indent > securityIndent && trimmed.startsWith("-")) current.security = "required";
      if (indent <= securityIndent) securityIndent = undefined;
    }

    if (trimmed.startsWith("operationId:")) current.operationId = yamlScalar(trimmed.slice("operationId:".length));
    else if (trimmed.startsWith("summary:")) current.summary = yamlScalar(trimmed.slice("summary:".length));
    else if (trimmed.startsWith("tags:")) {
      const value = trimmed.slice("tags:".length).trim();
      if (value.startsWith("[") && value.endsWith("]")) {
        current.tags.push(...value.slice(1, -1).split(",").map(yamlScalar).filter(Boolean));
      } else {
        tagIndent = indent;
      }
    } else if (trimmed.startsWith("security:")) {
      const value = trimmed.slice("security:".length).trim();
      if (value === "[]") current.security = "none";
      else securityIndent = indent;
    } else {
      const key = yamlMappingKey(trimmed);
      if (key && isContentType(key)) current.requestContentTypes.push(key);
    }
  }

  finishCurrent();
  if (!version) warnings.push("The YAML document does not declare an OpenAPI version.");
  else if (!version.startsWith("3.")) warnings.push(`OpenAPI ${version} is not a tested OpenAPI 3.x document.`);
  if (operations.length === 0) warnings.push("No OpenAPI operations were discovered under paths.");

  return {
    ok: operations.length > 0,
    format: "yaml",
    ...(version ? { version } : {}),
    ...(title ? { title } : {}),
    operations,
    warnings
  };
}

type MutableYamlOperation = {
  method: string;
  path: string;
  operationId?: string | undefined;
  summary?: string | undefined;
  tags: string[];
  security: DhalOpenApiSecurity;
  requestContentTypes: string[];
};

function groupOperations(operations: DhalOpenApiOperation[]): Map<string, DhalOpenApiOperation[]> {
  const grouped = new Map<string, DhalOpenApiOperation[]>();
  for (const operation of operations) {
    const route = openApiPathToDhalRoute(operation.path);
    const current = grouped.get(route) ?? [];
    current.push(operation);
    grouped.set(route, current);
  }
  return grouped;
}

function buildRouteProfile(operations: DhalOpenApiOperation[], defaultRateLimitMax: number): DhalRouteProfile {
  const signals = unique(operations.flatMap((operation) => operation.signals));
  const methods = unique(operations.map((operation) => operation.method.toLowerCase()));
  let max = defaultRateLimitMax;
  if (signals.includes("authentication")) max = Math.min(max, 15);
  if (signals.includes("upload")) max = Math.min(max, 30);
  if (signals.includes("expensive")) max = Math.min(max, 20);

  const rules: NonNullable<DhalRouteProfile["rules"]> = {};
  if (signals.includes("authentication")) {
    rules.credentialStuffing = {
      enabled: true,
      windowSeconds: 300,
      maxFailures: 5,
      keyBy: ["ip", "route", "userAgent"]
    };
    rules.bot = { enabled: true };
  }
  if (signals.includes("json-body")) {
    rules.api = { enabled: true, requireJsonContentType: true };
    rules.contentType = { enabled: true, blockMissingOnBodyMethods: true, blockJsonMismatch: true };
  }
  if (signals.includes("upload")) {
    rules.api = { ...(rules.api ?? {}), enabled: false };
    rules.contentType = { ...(rules.contentType ?? {}), enabled: true, blockMissingOnBodyMethods: false };
  }

  return {
    mode: "monitor",
    tags: unique(["openapi", ...methods.map((method) => `method:${method}`), ...signals]),
    rateLimit: {
      enabled: true,
      windowSeconds: 60,
      max,
      keyBy: ["ip", "route"]
    },
    ...(Object.keys(rules).length > 0 ? { rules } : {})
  };
}

function classifyOperation(input: {
  path: string;
  operationId?: string | undefined;
  summary?: string | undefined;
  tags: string[];
  security: DhalOpenApiSecurity;
  requestContentTypes: string[];
}): DhalOpenApiSignal[] {
  const text = [input.path, input.operationId ?? "", input.summary ?? "", ...input.tags].join(" ").toLowerCase();
  const signals: DhalOpenApiSignal[] = [];

  if (/(^|[\s/_-])(auth|login|signin|sign-in|token|password|session|otp|mfa)([\s/_-]|$)/.test(text)) signals.push("authentication");
  if (input.requestContentTypes.some((type) => type.toLowerCase().includes("multipart/form-data")) || /(^|[\s/_-])(upload|file|import)([\s/_-]|$)/.test(text)) signals.push("upload");
  if (/(^|[\s/_-])(webhook|callback)([\s/_-]|$)/.test(text)) signals.push("webhook");
  if (/(^|[\s/_-])(export|report|search|batch|generate|inference|analytics)([\s/_-]|$)/.test(text)) signals.push("expensive");
  if (input.security === "none") signals.push("public");
  if (input.requestContentTypes.some((type) => isJsonContentType(type))) signals.push("json-body");

  return unique(signals);
}

function requestContentTypeKeys(requestBodyValue: unknown): string[] {
  const requestBody = recordValue(requestBodyValue);
  const content = recordValue(requestBody?.content);
  return content ? Object.keys(content) : [];
}

function securityValue(value: unknown): DhalOpenApiSecurity {
  if (Array.isArray(value)) return value.length === 0 ? "none" : "required";
  return "unknown";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function looksLikeJson(value: string): boolean {
  const trimmed = value.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function stripYamlComment(line: string): string {
  let quote: string | undefined;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if ((char === "\"" || char === "'") && line[index - 1] !== "\\") {
      quote = quote === char ? undefined : quote ?? char;
    }
    if (char === "#" && !quote) return line.slice(0, index);
  }
  return line;
}

function leadingSpaces(line: string): number {
  return /^ */.exec(line)?.[0].length ?? 0;
}

function yamlMappingKey(trimmed: string): string | undefined {
  if (!trimmed.endsWith(":")) return undefined;
  return yamlScalar(trimmed.slice(0, -1));
}

function yamlScalar(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function isContentType(value: string): boolean {
  return /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+(?:;.*)?$/i.test(value);
}

function isJsonContentType(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized === "application/json" || normalized.endsWith("+json");
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

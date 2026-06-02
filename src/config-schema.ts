export function getDhalConfigJsonSchema(): Record<string, unknown> {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://dhal.dev/schemas/v0.12/dhal.schema.json",
    title: "Dhal configuration (v0.12 beta)",
    type: "object",
    additionalProperties: false,
    properties: {
      mode: { $ref: "#/$defs/mode" },
      trustProxy: { type: "boolean" },
      runtime: { $ref: "#/$defs/runtime" },
      identity: { type: "object" },
      ip: { type: "object" },
      rateLimit: { type: "object" },
      rules: { $ref: "#/$defs/rules" },
      routes: {
        type: "object",
        additionalProperties: { $ref: "#/$defs/routeProfile" }
      },
      policy: { $ref: "#/$defs/policy" },
      observability: { type: "object", properties: { redaction: { $ref: "#/$defs/redaction" } }, additionalProperties: true },
      response: { type: "object" }
    },
    $defs: {
      mode: { enum: ["off", "monitor", "block", "strict"] },
      severity: { enum: ["info", "low", "medium", "high", "critical"] },
      rulePack: { enum: ["generic-web", "api", "auth", "wordpress", "strict-api"] },
      runtime: {
        type: "object",
        additionalProperties: false,
        properties: {
          onInternalError: { enum: ["allow", "block"] },
          internalErrorStatusCode: { type: "integer", minimum: 500, maximum: 599 },
          maxInspectionMs: { type: "number", minimum: 0 },
          bypass: {
            type: "object",
            additionalProperties: false,
            properties: {
              enabled: { type: "boolean" },
              paths: { type: "array", items: { type: "string" } },
              methods: { type: "array", items: { type: "string" } }
            }
          }
        }
      },
      redaction: {
        type: "object",
        additionalProperties: false,
        properties: {
          enabled: { type: "boolean" },
          ip: { enum: ["none", "mask", "hash", "omit"] },
          identity: { enum: ["none", "mask", "hash", "omit"] },
          userAgent: { enum: ["full", "omit"] }
        }
      },
      rateLimit: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
          windowSeconds: { type: "integer", minimum: 1 },
          max: { type: "integer", minimum: 1 },
          keyBy: {
            type: "array",
            items: { enum: ["ip", "route", "userId", "tenantId", "apiKeyId"] }
          }
        },
        additionalProperties: false
      },
      rules: {
        type: "object",
        additionalProperties: true,
        properties: {
          packs: { type: "array", items: { $ref: "#/$defs/rulePack" } },
          sqli: { type: "boolean" },
          xss: { type: "boolean" },
          pathTraversal: { type: "boolean" },
          badUserAgents: { type: "boolean" },
          largePayload: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              maxBytes: { type: "integer", minimum: 1 }
            },
            additionalProperties: false
          },
          api: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              requireJsonContentType: { type: "boolean" },
              allowedContentTypes: { type: "array", items: { type: "string" } },
              methodsWithBody: { type: "array", items: { type: "string" } },
              maxJsonDepth: { type: "integer", minimum: 1 },
              maxJsonKeys: { type: "integer", minimum: 1 }
            },
            additionalProperties: false
          },
          headers: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              requireHostHeader: { type: "boolean" },
              maxHeaderCount: { type: "integer", minimum: 1 },
              maxHeaderBytes: { type: "integer", minimum: 1 },
              suspiciousHeaders: { type: "array", items: { type: "string" } },
              blockConflictingForwardingHeaders: { type: "boolean" }
            },
            additionalProperties: false
          },
          contentType: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              blockMissingOnBodyMethods: { type: "boolean" },
              blockJsonMismatch: { type: "boolean" },
              allowedJsonMimeTypes: { type: "array", items: { type: "string" } }
            },
            additionalProperties: false
          }
        }
      },
      routeProfile: {
        type: "object",
        additionalProperties: true,
        properties: {
          enabled: { type: "boolean" },
          mode: { $ref: "#/$defs/mode" },
          tags: { type: "array", items: { type: "string" } },
          rules: { $ref: "#/$defs/rules" },
          rateLimit: { $ref: "#/$defs/rateLimit" },
          ipReputation: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              minScore: { type: "integer", minimum: 0, maximum: 100 },
              mode: { enum: ["async", "blocking"] }
            },
            additionalProperties: false
          },
          response: {
            type: "object",
            properties: {
              blockStatusCode: { type: "integer", minimum: 400, maximum: 599 },
              message: { type: "string" }
            },
            additionalProperties: false
          }
        }
      },
      suppression: {
        type: "object",
        additionalProperties: false,
        required: ["id", "enabled", "reason"],
        properties: {
          id: { type: "string", minLength: 1 },
          enabled: { type: "boolean" },
          reason: { type: "string", minLength: 1 },
          ruleId: { type: "string" },
          ruleCategory: { type: "string" },
          route: { type: "string" },
          path: { type: "string" },
          ip: { type: "string" },
          userId: { type: "string" },
          tenantId: { type: "string" },
          apiKeyId: { type: "string" },
          expiresAt: { type: "string", format: "date-time" }
        }
      },
      policy: {
        type: "object",
        additionalProperties: false,
        properties: {
          severity: {
            type: "object",
            additionalProperties: false,
            properties: {
              default: { $ref: "#/$defs/severity" },
              categories: { type: "object", additionalProperties: { $ref: "#/$defs/severity" } },
              rules: { type: "object", additionalProperties: { $ref: "#/$defs/severity" } }
            }
          },
          suppressions: { type: "array", items: { $ref: "#/$defs/suppression" } },
          sampling: {
            type: "object",
            additionalProperties: false,
            properties: {
              enabled: { type: "boolean" },
              rate: { type: "number", minimum: 0, maximum: 1 },
              includeBlocked: { type: "boolean" },
              includeWouldBlock: { type: "boolean" },
              rules: { type: "object", additionalProperties: { type: "number", minimum: 0, maximum: 1 } },
              routes: { type: "object", additionalProperties: { type: "number", minimum: 0, maximum: 1 } }
            }
          },
          audit: {
            type: "object",
            additionalProperties: false,
            properties: {
              enabled: { type: "boolean" },
              includeSuppressed: { type: "boolean" }
            }
          },
          ci: {
            type: "object",
            additionalProperties: false,
            properties: {
              failOnModes: { type: "array", items: { $ref: "#/$defs/mode" } },
              requireWebhookSigning: { type: "boolean" },
              requireNonMonitorRouteForRules: { type: "array", items: { type: "string" } },
              disallowExpiredSuppressions: { type: "boolean" }
            }
          }
        }
      }
    }
  };
}

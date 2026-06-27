import { describe, expect, it } from "vitest";
import {
  generateDhalPolicyFromOpenApi,
  inspectOpenApi,
  openApiPathToDhalRoute
} from "../src/openapi.js";

describe("OpenAPI inspection", () => {
  it("inspects JSON operations and classifies security-relevant routes", () => {
    const inspection = inspectOpenApi(JSON.stringify({
      openapi: "3.1.0",
      info: { title: "Example API" },
      paths: {
        "/auth/login": {
          post: {
            operationId: "loginUser",
            tags: ["auth"],
            security: [],
            requestBody: {
              content: {
                "application/json": { schema: { type: "object" } }
              }
            }
          }
        },
        "/users/{id}": {
          get: {
            operationId: "getUser",
            security: [{ bearerAuth: [] }]
          }
        }
      }
    }));

    expect(inspection.ok).toBe(true);
    expect(inspection.format).toBe("json");
    expect(inspection.title).toBe("Example API");
    expect(inspection.operations).toHaveLength(2);
    expect(inspection.operations[0]?.signals).toEqual(expect.arrayContaining(["authentication", "public", "json-body"]));
    expect(inspection.operations[1]?.security).toBe("required");
  });

  it("scans common OpenAPI YAML path structures without an external parser", () => {
    const inspection = inspectOpenApi(`
openapi: 3.0.3
info:
  title: Upload API
paths:
  /files/{fileId}:
    post:
      operationId: uploadFile
      tags:
        - files
      security:
        - bearerAuth: []
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
  /webhooks/payment:
    post:
      summary: Payment webhook receiver
      security: []
`);

    expect(inspection.ok).toBe(true);
    expect(inspection.format).toBe("yaml");
    expect(inspection.operations).toHaveLength(2);
    expect(inspection.operations[0]?.signals).toContain("upload");
    expect(inspection.operations[1]?.signals).toEqual(expect.arrayContaining(["webhook", "public"]));
    expect(inspection.warnings.some((warning) => warning.includes("conservative"))).toBe(true);
  });
});

describe("OpenAPI policy generation", () => {
  const document = {
    openapi: "3.1.0",
    paths: {
      "/auth/login": {
        post: {
          operationId: "login",
          tags: ["authentication"],
          requestBody: { content: { "application/json": {} } }
        }
      },
      "/reports/{reportId}/export": {
        get: { operationId: "exportReport" }
      },
      "/uploads/{id}": {
        post: { requestBody: { content: { "multipart/form-data": {} } } }
      }
    }
  };

  it("generates monitor-only wildcard route profiles", () => {
    const result = generateDhalPolicyFromOpenApi(document);

    expect(result.ok).toBe(true);
    expect(result.routeProfiles["/auth/login"]?.mode).toBe("monitor");
    expect(result.routeProfiles["/auth/login"]?.rateLimit?.max).toBe(15);
    expect(result.routeProfiles["/auth/login"]?.rules?.credentialStuffing?.enabled).toBe(true);
    expect(result.routeProfiles["/reports/*/export"]?.rateLimit?.max).toBe(20);
    expect(result.routeProfiles["/uploads/*"]?.rules?.api?.enabled).toBe(false);
    expect(Object.values(result.routeProfiles).every((profile) => profile.mode === "monitor")).toBe(true);
  });

  it("preserves existing route profiles instead of replacing them", () => {
    const result = generateDhalPolicyFromOpenApi(document, {
      existingConfig: {
        mode: "block",
        routes: {
          "/auth/login": {
            mode: "block",
            tags: ["owner-managed"]
          }
        }
      }
    });

    expect(result.config.mode).toBe("block");
    expect(result.config.routes["/auth/login"]?.mode).toBe("block");
    expect(result.config.routes["/auth/login"]?.tags).toContain("owner-managed");
    expect(result.changes).toContainEqual(expect.objectContaining({ route: "/auth/login", action: "preserve-existing" }));
  });

  it("converts OpenAPI parameters to Dhal wildcard patterns", () => {
    expect(openApiPathToDhalRoute("/orgs/{orgId}/users/{userId}")).toBe("/orgs/*/users/*");
  });
});

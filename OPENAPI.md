# OpenAPI inspection and policy generation

Dhal v1.1 can inspect OpenAPI descriptions and generate reviewable route profiles without enabling enforcement automatically.

## Commands

Inspect a description:

```text
dhal openapi inspect openapi.json
```

Preview generated configuration:

```text
dhal openapi generate openapi.yaml
```

Write into the configured Dhal file:

```text
dhal openapi generate openapi.yaml --config dhal.json --write
```

Write to a separate file:

```text
dhal openapi generate openapi.json --output dhal.openapi.json
```

The default behavior is read-only. Updating an existing Dhal configuration creates a `.bak` copy unless `--no-backup` is supplied. A separate existing output is not overwritten unless `--force` is supplied.

## Inspection

JSON OpenAPI documents are parsed structurally. Common OpenAPI YAML documents are scanned conservatively for paths, HTTP operations, tags, security declarations, and request content types.

Inspection reports:

- operation method and path;
- operation ID, summary, and tags when present;
- whether operation-level security is required, explicitly absent, or unknown;
- request content types;
- inferred signals such as authentication, upload, webhook, expensive operation, public operation, and JSON body.

The YAML scanner does not resolve anchors, merge keys, external references, or arbitrary YAML features. Convert complex YAML descriptions to JSON when complete structural interpretation is required.

## Generated policy

OpenAPI parameters are converted to Dhal wildcard paths:

```text
/users/{userId}              -> /users/*
/orgs/{orgId}/users/{userId} -> /orgs/*/users/*
```

Every newly generated route uses `mode: "monitor"`. Existing route profiles are preserved and reported as `preserve-existing`.

The generator uses conservative signals:

- authentication routes receive credential-stuffing controls and a lower monitor-mode rate limit;
- multipart or upload routes disable JSON-only positive-security behavior;
- JSON request bodies enable JSON and content-type checks;
- webhook and callback routes are tagged for review;
- export, report, search, batch, generation, inference, and analytics routes receive a lower monitor-mode rate limit;
- operations with an explicitly empty security declaration are tagged as public.

These are policy proposals, not authorization decisions. Authentication, authorization, schema validation, and business rules remain application responsibilities.

## Path-level limitation

Dhal route profiles are path-based. When multiple HTTP methods share one OpenAPI path, the generator creates one route profile and emits a warning listing the grouped methods.

## Programmatic API

```ts
import {
  generateDhalPolicyFromOpenApi,
  inspectOpenApi,
  openApiPathToDhalRoute
} from "@rokadhq/dhal";

const inspection = inspectOpenApi(openApiDocument);
const generated = generateDhalPolicyFromOpenApi(openApiDocument, {
  existingConfig,
  defaultRateLimitMax: 120
});
```

After generation, validate the configuration, run diagnostics, and keep generated routes in monitor mode until replay fixtures and observed traffic confirm acceptable false-positive behavior.

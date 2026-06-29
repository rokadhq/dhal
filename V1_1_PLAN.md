# Dhal v1.1 — Adoption

Dhal v1.1 focuses on reducing the work required to adopt the stable v1 engine in existing Node.js applications. It is an additive release and must preserve the v1 package, CLI, and `schemaVersion: "1"` compatibility guarantees.

## Release outcomes

A developer should be able to discover their framework, generate a safe monitor-mode configuration, install the correct adapter, and derive route policy from an API description without learning Dhal internals first.

## Milestones

### 1. Framework integrations

- First-class NestJS bootstrap integration for both Express and Fastify HTTP adapters.
- Koa adapter.
- Hono adapter for the Node.js runtime.
- Deployment guidance for Next.js Node runtime and common serverless platforms.
- Integration tests must exercise the underlying request path and response-outcome recording.

### 2. Guided onboarding CLI

Add `dhal add` with deterministic project inspection.

Required behavior:

- detect the package manager and supported framework;
- propose the correct adapter and installation command;
- create a monitor-mode `dhal.json` without overwriting existing files;
- generate a reviewable integration file or exact patch instructions;
- support `--framework`, `--config`, `--write`, `--force`, and machine-readable output;
- make no source-code mutation unless `--write` is supplied.

Related CLI improvements:

- `dhal doctor --fix` for safe mechanical corrections;
- `dhal config diff` and `dhal config explain`;
- `dhal routes` for effective route-policy inspection.

### 3. OpenAPI policy generation

Add deterministic OpenAPI 3.x inspection and route-profile generation.

Required behavior:

- read JSON and YAML descriptions;
- normalize path and method operations;
- identify authentication, upload, webhook, and high-cost routes from explicit schema signals;
- generate monitor-mode route profiles by default;
- preserve existing user configuration and emit a structured diff;
- never enable blocking automatically;
- provide fixtures and stable output suitable for CI review.

### 4. Adoption presets and documentation

Add presets and examples for:

- NestJS API;
- Hono on Node.js;
- Next.js Node runtime;
- serverless API;
- GraphQL API;
- webhook receiver;
- internal service;
- public REST API.

## Compatibility constraints

- Node.js 20 remains the minimum runtime throughout v1.
- Existing Express, Fastify, and raw `node:http` behavior must not change.
- New package exports and CLI commands are additive.
- `schemaVersion: "1"` remains backward compatible.
- The release must remain within the existing performance and memory budgets.
- New adapters must support ESM, CommonJS, and TypeScript consumers.

## Release sequence

1. NestJS bootstrap adapter.
2. `dhal add` project detection and generated onboarding artifacts.
3. OpenAPI inspection and policy generation.
4. Koa and Hono adapters.
5. Presets, documentation, compatibility matrix, and release hardening.

## Definition of done

Dhal v1.1 is ready when:

- all existing v1 gates pass unchanged;
- every new adapter has real integration coverage;
- onboarding output is deterministic and idempotent;
- OpenAPI-generated policy is reviewable and never silently enforced;
- packed ESM, CommonJS, and TypeScript consumers can import every new public export;
- the changelog, compatibility matrix, API stability report, and documentation describe the final v1.1 surface.

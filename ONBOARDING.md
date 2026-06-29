# Dhal guided onboarding

Dhal v1.1 adds deterministic onboarding and conservative repair workflows for existing Node.js applications.

## `dhal add`

Run the command from the application root:

```bash
npx dhal add
```

The command inspects `package.json` and lockfiles, then reports:

- the detected framework;
- the detected package manager;
- the correct package installation command;
- a monitor-mode `dhal.json` proposal;
- a separate framework integration module;
- the exact registration step required by the application.

The default invocation is a preview and does not write files.

```bash
npx dhal add --write
```

Supported framework detection:

- Express;
- Fastify;
- NestJS;
- Koa;
- Hono on Node.js.

Raw `node:http` applications can be selected explicitly:

```bash
npx dhal add --framework node-http --write
```

Useful options:

```text
--framework <name>       override framework detection
--config <path>          config output path; default dhal.json
--integration <path>     integration module path; default dhal.integration.ts
--write                  create proposed files
--force                  overwrite existing proposed output files
```

`dhal add` never patches application source files automatically. The generated integration module is reviewable and the result explains where to register it.

## Framework presets

Framework presets are monitor-mode onboarding baselines:

```bash
npx dhal presets list
npx dhal presets show nestjs-api
npx dhal presets apply hono-node-api --write
```

Available framework presets:

```text
express-api
fastify-api
nestjs-api
koa-api
hono-node-api
node-http-api
```

They share the stable schemaVersion 1 contract, include health/preflight bypasses, and keep both global and authentication-route policy in monitor mode until reviewed.

## `doctor --fix`

Run conservative repairs:

```bash
npx dhal doctor --fix
```

The command may:

- create a missing monitor-mode starter config;
- add the supported schema version to a compatible older config;
- create `dhal.json.bak` before migrating an existing file.

It deliberately does not enable blocking, proxy trust, Redis, reputation services, OpenTelemetry, or webhooks.

Preview repairs without writing:

```bash
npx dhal doctor --fix --dry-run
```

Disable the migration backup only when another backup mechanism is already in place:

```bash
npx dhal doctor --fix --no-backup
```

After onboarding or repair, run:

```bash
npx dhal test-config
npx dhal doctor
npx dhal readiness --production
```

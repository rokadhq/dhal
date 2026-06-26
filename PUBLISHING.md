# Publishing Dhal

Dhal is published primarily to npm through GitHub Actions and npm Trusted Publishing.

## Release prerequisites

Before publishing any v1 build:

```bash
npm ci
npm run verify:v1
npm pack --dry-run
```

For the current release candidate, the unified release check must report `target: "rc"`, package version `1.0.0-rc.0`, and release channel `rc`.

## CI publishing with Trusted Publishing

The primary workflow is `.github/workflows/publish.yml`.

Required npm configuration:

1. Open the `@rokadhq/dhal` package settings on npm.
2. Configure the repository `rokadhq/dhal` as a Trusted Publisher.
3. Set the workflow filename to `publish.yml`.
4. Publish by creating a GitHub Release or manually dispatching the workflow.

The workflow uses OIDC through `id-token: write`, runs package verification, resolves the npm dist-tag from the semantic version, and publishes without a long-lived npm token.

Resolved tags:

| Version pattern | npm dist-tag |
| --- | --- |
| `*-alpha.*` | `alpha` |
| `*-beta.*` | `beta` |
| `*-rc.*` | `rc` |
| other `0.x` | `next` |
| stable `1.x+` | `latest` |

For `1.0.0-rc.0`, publishing produces:

```text
@rokadhq/dhal@1.0.0-rc.0
npm dist-tag: rc
```

## Manual local publishing

Local publishing should be limited to recovery scenarios. It does not provide npm Trusted Publishing provenance.

```bash
npm ci
npm run verify:v1
npm publish --tag rc --access public --provenance=false
```

Do not pass `--provenance` from a normal local terminal. Local shells do not provide the OIDC metadata required for trusted provenance.

## Stable v1 promotion

Stable `1.0.0` must:

- preserve the declared v1 public contract;
- change the package version to `1.0.0`;
- change the release channel to `latest`;
- pass `npm run release:check:stable` and the complete v1 matrix;
- publish under the `latest` npm dist-tag.

Do not move the `latest` tag to an RC build.

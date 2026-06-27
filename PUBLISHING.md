# Publishing Dhal

Dhal is published primarily to npm through GitHub Actions and npm Trusted Publishing.

## Release prerequisites

Before publishing any v1 build, install dependencies, run the complete v1 verification suite, and inspect the package dry run.

For stable v1, the unified release check must report `target: "stable"`, the version currently declared in both package metadata files, and release channel `latest`.

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

For stable `1.x`, publishing produces the current package version under the `latest` dist-tag. For example, version `1.0.1` produces `@rokadhq/dhal@1.0.1` with `latest` pointing to that version.

## Manual local publishing

Local publishing should be limited to recovery scenarios. It does not provide npm Trusted Publishing provenance. Follow the repository's verified local publishing script and do not request provenance from a normal local terminal because local shells do not provide the required OIDC metadata.

## Stable v1 promotion

Every stable `1.x` release must:

- preserve the declared v1 public contract;
- use a matching stable semantic version in `package.json` and `package-lock.json`;
- resolve the release channel to `latest`;
- pass the stable release check and the complete v1 matrix;
- publish under the `latest` npm dist-tag;
- generate release notes, assets, and status records from the resolved package version.

Do not move the `latest` tag to an RC build.

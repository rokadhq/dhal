# Publishing Dhal

## Manual local publishing

Use this path for the first public release or when publishing directly from your own machine.

```bash
rm -rf node_modules package-lock.json
npm config set registry https://registry.npmjs.org/
npm install
npm run verify:publish
npm publish --tag next --access public --provenance=false
```

Do **not** pass `--provenance` from a normal local terminal. npm provenance requires a supported CI/OIDC provider. Local shells do not expose the OIDC provider metadata npm needs, so npm reports:

```txt
Automatic provenance generation not supported for provider: null
```

## CI publishing with provenance

Use this path after the package is in a public GitHub repository and npm Trusted Publishing is configured for the package.

1. Push the repository to GitHub.
2. On npmjs.com, open the package settings.
3. Add a Trusted Publisher for the GitHub repository and workflow filename `publish.yml`.
4. Use `.github/workflows/publish.yml` from this repository.
5. Create a GitHub release or manually dispatch the workflow.

The CI workflow uses:

```bash
npm publish --tag next --access public --provenance
```

## Tags

For pre-1.0 releases, publish with `next` first:

```bash
npm publish --tag next --access public --provenance=false
```

After testing:

```bash
npm dist-tag add @rokadhq/dhal@0.8.2 latest
```

## Package-name check

```bash
npm view @rokadhq/dhal --registry=https://registry.npmjs.org/
```

If this returns `E404`, the name is available. If not, publish under a scope such as `@rokad/dhal`.

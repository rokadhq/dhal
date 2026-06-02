# V1 readiness

Dhal is moving toward a first `1.0.0` release. The v1 gate is not just feature completeness; it is operational confidence.

Required before v1:

- Public API/import path review.
- Config schema review.
- CLI naming review.
- Production-readiness diagnostics through `dhal readiness`.
- False-positive replay workflow.
- Signed webhook recommendation.
- Redis/Valkey recommendation for distributed rate limiting.
- Stable docs at `https://docs.dhal.rokad.co/`.

Run:

```bash
npx dhal readiness --production
npx dhal compat
npx dhal doctor
npx dhal rules
npx dhal report --output dhal.report.json
```

A production readiness score below the minimum should block a v1 promotion until the warnings are either fixed or intentionally documented.

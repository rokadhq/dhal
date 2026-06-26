# Dhal v1.0.0-rc.0 Validation

This branch is the release-candidate validation line for Dhal v1.

The RC gate covers:

- Node.js 20, 22, and 24 package consumers
- ESM, CommonJS, and TypeScript declaration imports
- Express 4 and 5
- Fastify 4 and 5
- raw `node:http`
- Redis 7 and Valkey 8 multi-instance state
- signed webhook and optional OpenTelemetry behavior
- configuration migration and schema contracts
- package export integrity
- latency, throughput, and heap-growth budgets

A stable `1.0.0` promotion must preserve the declared v1 contract and pass the same gate with the stable release target.

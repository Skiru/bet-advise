# ADR-002: API and Worker Runtime Separation

## Status
Accepted

## Context
A single monolithic process starting both API servers and background polling tasks (outbox polling, SQS queue consumers, scheduled ingestion jobs) is prone to resource starvation, CPU throttling, and degraded HTTP response times.

## Decision
We explicitly separate the execution runtimes into:
1. **API Node**: Starts only HTTP servers, global pipes, filters, guards, and REST controllers. It runs from `src/bootstrap/api.main.ts` and imports `ApiAppModule`.
2. **Worker Node**: Starts no HTTP listeners. It starts transactional outbox runners, SQS queue consumers, and scheduled analytics/ingestion loops. It runs from `src/bootstrap/worker.main.ts` and imports `WorkerAppModule`.

## Consequences
- Bounded concurrency settings separate for API and Worker.
- Independent scale-out/scale-in policies under AWS.
- Clear process boundaries with robust graceful shutdown handlers.

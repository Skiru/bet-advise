# ADR-013: Observability

## Status
Accepted

## Context
In a distributed event-driven system, diagnosing failures, identifying bottlenecks, and tracking down cross-tenant latency spikes requires uniform logs, traces, and metrics.

## Decision
We implement a zero-leakage, high-fidelity observability stack:
1. **JSON Logs**: Structured JSON stdout logs with timestamp, service, runtime, traceId, correlationId, and tenantId. High-risk inputs (passwords, tokens, database URLs) are heavily redacted.
2. **OTel Telemetry**: OpenTelemetry-compatible spans for HTTP requests, Database queries, SQS consumer loops, and Model execution times.
3. **Structured Metrics**: Expose rate, error, latency, database pool capacity, and SQS lag metrics.

## Consequences
- Complete, real-time insights into system health.
- Safe, redacted, and compliant production debugging.

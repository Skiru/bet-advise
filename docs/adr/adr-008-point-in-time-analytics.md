# ADR-008: Point-in-Time Analytics

## Status
Accepted

## Context
Analyzing sports data and odds quotes using features or prices that became available *after* a match started introduces lookahead bias (data leakage), yielding artificially inflated backtest accuracy that fails catastrophically in production.

## Decision
We implement a strictly **Point-In-Time (PIT)** analytical workflow. Every analytical feature must capture its `availableAt` timestamp. 
When building features and feeding models, we apply a rigid `analysisCutoff` threshold. Any snapshot or quote where `availableAt > analysisCutoff` is filtered out. Leakage-prevention tests are run globally.

## Consequences
- Complete elimination of lookahead bias.
- Fully reproducible historical backtests matching real live execution.

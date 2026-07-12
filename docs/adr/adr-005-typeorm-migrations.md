# ADR-005: TypeORM Migrations

## Status
Accepted

## Context
Using automatic schema synchronization (`synchronize: true` in TypeORM) in production is highly dangerous, as it can cause accidental column drops, data corruption, or schema mismatches.

## Decision
We disable `synchronize` in all environments (`synchronize: false`). All schema changes must be declared and run via explicit TypeORM SQL-based migrations. 
We maintain a custom `DataSource` configuration that enforces rigid transaction controls, connection timeouts, and SSL validation, and is used by NestJS and the TypeORM CLI.

## Consequences
- Safe, incremental schema state transitions.
- Fully auditable SQL history tracked in git.
- Zero risk of automatic, destructive schema operations during deployment.

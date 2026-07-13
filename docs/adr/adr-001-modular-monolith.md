# ADR-001: Modular Monolith Architecture

## Status
Accepted

## Context
We need a structure that balances rapid development velocity with clean separation of domain boundaries. A microservices architecture would introduce excessive network latency, distributed transaction complexity (Sagas), and deployment overhead.

## Decision
We adopt a **modular monolith** directory structure within a single repository. Each high-level business capability is mapped to a distinct NestJS module (e.g., `auth`, `tenancy`, `matches`, `providers`, `odds`, `analysis`, `advice`, `coupons`, `audit`, `outbox`). 

Modules must interact using explicit public interfaces (module APIs) and versioned integration events (via outbox). Direct imports of another module's database entities or database repositories are strictly prohibited.

## Consequences
- High cohesion and low coupling within modules.
- Easily testable boundaries with clean module-api mock/contract definitions.
- Straightforward transition to microservices in the future if scale warrants.

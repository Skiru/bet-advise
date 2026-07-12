# Bet Advise — NestJS Sports Betting Advice & Coupon Monolith

A production-grade, highly secure, and auditable sports betting advice and manual coupon-drafting system built on **NestJS**, **TypeORM (PostgreSQL)**, **Redis**, and **AWS (S3/SQS)**.

---

## 1. Product Purpose & Scope

`bet-advise` is a secured NestJS platform designed to ingest sports data and odds quotes, execute versioned predictive probability models, calculate expected values and uncertainties, and output auditable recommendations. It also bundles recommendations into manual, risk-controlled coupon drafts.

### Explicit Exclusions
*   **No automated bet placement** or bookmaker API integration.
*   **No scraping control plane** or automated login routines.
*   **No martingale** or capital loss-chasing algorithms.
*   **No guaranteed profit** claims. The system enforces conservative risk gates and explicit abstention.

---

## 2. Architecture & Module Map

The codebase is organized as a **Modular Monolith** applying **Hexagonal Architecture** and clean DDD principles.

```
src/
├── auth/          # OAuth 2.0/OIDC Resource Server auth, scopes & role claims
├── tenancy/       # Request-level isolation, AsyncLocalStorage, PostgreSQL RLS
├── matches/       # Matches lifecycle, participant mappings, transitions
├── providers/     # External provider registries, fail-closed adapters, ingestion
├── odds/          # Market odds, outcome mappings, quotes, validation
├── analysis/      # Point-in-Time features, Model Registry, no-vig calculations
├── advice/        # Conservative edge gates, EV estimation, abstention reasons
├── coupons/       # Draft coupon optimizer, correlation gates, concentration limits
├── audit/         # Tamper-evident tenant-level change ledger
├── outbox/        # Transactional outbox polling (FOR UPDATE SKIP LOCKED)
├── bootstrap/     # API vs Worker runtime composition entry points
└── shared/        # Shared core (Result, UUIDs, AWS S3/SQS/Redis adapters)
```

Within each business module, clean architecture layers are enforced:
1.  **Domain Layer**: Pure TypeScript entities with zero framework dependencies (no `@nestjs/*`, `typeorm`, or decorators).
2.  **Application Layer**: Commands, queries, handlers, and abstract Port interfaces.
3.  **Interfaces Layer**: REST HTTP controllers, guards, and DTOs (for API) or SQS message/job handlers (for Worker).
4.  **Infrastructure Layer**: Database mapping entities, TypeORM repositories, S3/SQS adapters implementing the ports.

---

## 3. API vs Worker Decoupling

To prevent background jobs from choking HTTP event loops, we employ strict runtime composition:
*   **API Process (`src/bootstrap/api.main.ts`)**: Initializes `ApiAppModule`. Boots ONLY the HTTP listener, JWT/OIDC authentication, and controllers. Does NOT poll background SQS queues or trigger scheduled jobs.
*   **Worker Process (`src/bootstrap/worker.main.ts`)**: Initializes `WorkerAppModule`. Boots outbox pollers, SQS queue consumers, and cron schedules. Does NOT start an HTTP server.

---

## 4. Multi-Tenant Security & PostgreSQL RLS

We enforce absolute tenant isolation as a core security property:
1.  **Resolution**: Every request is audited by `TenantMiddleware`. It resolves the tenant ID strictly from the verified JWT token claims (cryptographically verified against OIDC JWKS). Unauthenticated tenant headers or default fallbacks are strictly blocked.
2.  **PostgreSQL Row-Level Security (RLS)**: Every tenant-owned table enables RLS. Every database transaction sets the transaction-local variable:
    ```sql
    SET LOCAL app.current_tenant_id = 'tenant-uuid';
    ```
    PostgreSQL policies automatically restrict all `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations.

---

## 5. Database & Migrations

Automatic database sync is disabled in all environments (`synchronize: false`). All schema changes are performed through pure TypeORM SQL migrations.

Production connection strings configure:
*   Mandatory TLS certificate verification (`rejectUnauthorized: true`).
*   Statement timeout (max 5000ms), lock timeout (max 2000ms), and connection pool controls.

---

## 6. Analytical Integrity & Point-in-Time Features

The platform implements a strictly **Point-In-Time (PIT)** data flow to eliminate lookahead bias (data leakage) during model evaluation and backtesting.
*   Every data point carries an `availableAt` timestamp.
*   When executing features, the system enforces a strict `analysisCutoff` threshold. Any odds quote or statistic where `availableAt > analysisCutoff` is completely ignored.
*   The **Model Registry** governs predictions: all model runs require an active registration version, code commit SHA, and explicit, audited administrator `ModelApproval`.

---

## 7. Advice & Coupon Drafting Rules

### Advice Engine
Advice is produced for a match in state `SCHEDULED` using approved models. Recommendation is given ONLY if:
$$\text{Expected Value (EV)} \ge \text{EV Threshold} \quad \text{AND} \quad \text{Edge} \ge \text{Conservative Threshold}$$
Otherwise, advice is resolved as `ABSTAINED` or `REJECTED` with clear typed reason codes (`NO_PRODUCTION_DATA_PROVIDER`, `UNCERTAINTY_TOO_HIGH`, `STALE_ODDS`).

### Coupon Draft Engine
Builds manual, un-placed `CouponDraft` items from RECOMMENDED advice under strict risk constraints:
*   Rejects same-match legs (correlation limit).
*   Restricts total combined risk and concentration limits (e.g. max legs per sport/competition).

---

## 8. SQS Messaging & Idempotent Inbox

We implement reliable at-least-once messaging:
*   **Transactional Outbox**: Events are written to the `outbox_events` table inside the same transaction as the core entity change.
*   **Reliable Polling**: Outbox processor runs `SELECT ... FOR UPDATE SKIP LOCKED` to lock batch records and publish to SQS.
*   **Idempotent Inbox**: SQS consumers record message processing history in the `inbox_messages` table transactionally alongside the business side-effect. Duplicates are silently ignored.

---

## 9. Local Development & Verification

### MiniStack
Our local AWS development environment emulates PostgreSQL, Redis, S3, SQS, and SQS DLQ. Run:
```bash
pnpm local:up          # Start docker-compose ministack
pnpm local:bootstrap   # Initialize queues, S3 buckets, and RDS tables
pnpm local:doctor      # Verify connectivity and health of all components
```

### Full Production Verification
To verify code quality, compliance, and all testing gates, execute:
```bash
pnpm verify:production
```
This is the final certification gate that compiles both API/Worker targets and executes all test suites (unit, integration, e2e, architecture, concurrency, and mutation).

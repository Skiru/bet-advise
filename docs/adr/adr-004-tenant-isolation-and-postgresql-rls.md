# ADR-004: Tenant Isolation and PostgreSQL RLS

## Status
Accepted

## Context
A single SaaS database requires absolute tenant boundary guarantees. Accidental cross-tenant leakage (BOLA/IDOR) is a catastrophic security failure. 

## Decision
We enforce strict tenant isolation using a two-tier approach:
1. **Application Scope**: Resolve tenant ID strictly from the cryptographically verified JWT claim inside `TenantMiddleware` and bind it to `AsyncLocalStorage`. Defaulting to 'default' or relying on unchecked headers is forbidden.
2. **Database Row-Level Security (RLS)**: Enable native PostgreSQL Row-Level Security on every tenant-owned table. Every transaction sets a session-local tenant variable `app.current_tenant_id` which policies evaluate on `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.

## Consequences
- Defense-in-depth: even if application-layer code has an IDOR bug, the DB layer blocks access.
- Non-bypassable tenant constraints on indexes and queries.

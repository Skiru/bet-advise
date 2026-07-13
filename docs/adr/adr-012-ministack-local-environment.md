# ADR-012: MiniStack Local AWS Environment

## Status
Accepted

## Context
Developers need a realistic, offline, and secure AWS development and integration test environment that emulates PostgreSQL, Redis, S3, and SQS without running up cloud bills or requiring live AWS credentials.

## Decision
We retain and harden **MiniStack** as our local AWS emulation stack. It is controlled via standard docker-compose and verified using custom TypeScript scripts (`bootstrap-ministack.ts` and `doctor-ministack.ts`). 
All local integration and E2E tests target MiniStack. Real AWS credentials must never be embedded or used in local configuration.

## Consequences
- Fast, reproducible, and offline test execution.
- Identical environment configurations between development, CI, and staging.

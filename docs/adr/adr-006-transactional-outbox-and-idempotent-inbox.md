# ADR-006: Transactional Outbox and Idempotent Inbox

## Status
Accepted

## Context
Standard publish-subscribe patterns can lose events if the database transaction commits but the network message broker (SQS/SNS) is down, or if the broker is active but the database fails to commit.

## Decision
We enforce the **Transactional Outbox** pattern. All integration events are written to an `outbox_events` database table inside the *same* database transaction that persists the aggregate root state. 
A background worker claims pending events using atomic select-and-lock queries (`FOR UPDATE SKIP LOCKED`) and publishes them to SQS.
Receivers implement an **Idempotent Inbox** to record processed message IDs (`tenantId + eventId + handlerName`) in a transaction alongside business side-effects.

## Consequences
- At-least-once delivery guarantees without distributed transaction protocols.
- Resilience to SQS/database downtime and message duplicates.

# ADR-010: Advice and Abstention Policy

## Status
Accepted

## Context
Generating recommendations when underlying data quality is low, market odds are stale, or model predictions have high uncertainty leads to negative expected value and severe portfolio drawdowns.

## Decision
We implement a conservative **Abstention Policy** inside the `advice` engine. Recommendations are issued strictly if and only if all security, data quality, point-in-time, model approval, and conservative edge/EV gates are satisfied. 
If any criteria fails, the system must produce an `ABSTAINED` or `REJECTED` advice record with a detailed typed reason code (e.g., `UNCERTAINTY_TOO_HIGH`, `STALE_ODDS`).

## Consequences
- Rejects low-probability and high-risk setups.
- Prioritizes prediction accuracy and capital preservation over volume.

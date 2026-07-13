# ADR-011: Coupon-Draft Risk Model

## Status
Accepted

## Context
Aggregating multiple betting advice items into a single draft coupon without evaluating inter-leg correlation or sport/competition concentration risk exposes the user to high correlated-loss risks (e.g., nesting multiple outcomes from the same event).

## Decision
We enforce a rigid multi-leg **Risk Model** inside the coupon-draft builder. The draft optimizer:
1. Rejects duplicates or mutually conflicting selections.
2. Evaluates cross-leg correlation (e.g. bans same-event multi-legs).
3. Applies concentration limits (maximum allocations per sport/competition/market).
4. Restricts coupon draft creation exclusively to active, recommended advice.
No automated bet placement is supported.

## Consequences
- Guaranteed preservation of risk limits and diversification.
- Elimination of correlated tail-risk exposure in coupon drafting.

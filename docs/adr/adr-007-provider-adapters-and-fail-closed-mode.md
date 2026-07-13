# ADR-007: Provider Adapters and Fail-Closed Mode

## Status
Accepted

## Context
When external sports or odds providers are unconfigured or fail to respond, returning simulated/mock data or empty lists can silently poison downstream analytics and expected-value engines.

## Decision
We establish typed ports (`SportsDataProviderPort`, `OddsProviderPort`) and implement a strict **Fail-Closed** adapter when no real provider is available (`UnconfiguredSportsDataProvider`). 
If a provider is unconfigured, downstream flows must immediately abort, raise a typed `ProviderNotConfiguredError`, and record an `ABSTAINED` decision on advice and coupons. Mock fallbacks are forbidden.

## Consequences
- Zero silent pollution from dummy external fixtures in production.
- Guaranteed high fidelity of analysis data inputs.

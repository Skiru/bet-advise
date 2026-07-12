# ADR-014: Optional LLM Boundary

## Status
Accepted

## Context
Using LLMs to dynamically generate numerical probabilities, odds calculations, or risk decisions is highly unsafe due to model hallucinations, high latency, and lack of auditability.

## Decision
We enforce a strict boundary around any LLM usage through `ExplanationGeneratorPort`. 
An LLM may *only* be used to summarize and explain already-calculated, structured analytical evidence for human operators. Under no circumstances can an LLM alter probabilities, edge thresholds, coupon selections, or risk parameters. The system must remain fully functional if the LLM provider is disabled.

## Consequences
- Guaranteed numeric and financial accuracy of our advice.
- Safe enrichment of reports without hallucination risk in critical paths.

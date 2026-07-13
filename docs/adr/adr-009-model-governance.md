# ADR-009: Model Governance

## Status
Accepted

## Context
Executing unapproved machine learning or mathematical models, or configuring them via arbitrary environment variable strings, makes performance tracking and regulatory audits impossible.

## Decision
We establish a database-backed **Model Registry** inside the `analysis` module. Every prediction model must be registered with an explicit version, hyperparameter metadata, code commit SHA, and training cutoff. 
To run in production, a model version must possess an explicit, audited `ModelApproval` record signed by a tenant administrator. 

## Consequences
- Full governance and traceability of model executions.
- Multi-model champion/challenger comparisons.
- Safe rollbacks of underperforming model versions.

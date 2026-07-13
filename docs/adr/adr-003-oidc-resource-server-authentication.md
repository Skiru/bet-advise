# ADR-003: OIDC Resource Server Authentication

## Status
Accepted

## Context
The application must act as a secure, decentralized resource server without maintaining a local custom login or storing plain password hashes. 

## Decision
We configure `bet-advise` as an OAuth 2.0 / OpenID Connect (OIDC) resource server. The system validates incoming bearer tokens (issued by a trusted external OIDC Provider, e.g. Keycloak or Cognito) on every request. 
Validations include JWT signature, allowed algorithms, issuer, audience, subject, and scopes. All mock login endpoints, hardcoded phone numbers, and local token generation tables (`ApiToken`, `RefreshToken`) are fully removed.

## Consequences
- Centralized, production-grade identity management.
- Zero local password or token leakage risks.
- Standardized RBAC/ABAC through permission claims.

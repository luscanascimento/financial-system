# ADR-0003: Authentication strategy

- **Status:** Accepted
- **Date:** Phase 1 (Auth & Users)
- **Deciders:** FinanceHub engineering
- **Related:** [Architecture §6](../architecture.md#6-cross-cutting-concerns) · [ADR-0002](./0002-clean-architecture-backend.md)

## Context

FinanceHub handles sensitive personal financial data, so authentication must be secure by default while supporting a modern SPA + horizontally scalable API. Requirements:

- Stateless, scalable API auth that works across multiple instances.
- Strong password storage and protection against token theft/replay.
- Social login (Google, GitHub) and optional second factor (TOTP MFA).
- Sensible token lifetimes with a safe refresh flow and **reuse detection**.

## Decision

Use **JWT access tokens + rotating refresh tokens**, with the following design:

- **Access tokens** — short-lived JWTs (`JWT_ACCESS_TTL`, default `15m`), signed with `JWT_ACCESS_SECRET`. Sent as a `Bearer` token on each API request and verified by the auth guard. Stateless: no DB lookup on the hot path.
- **Refresh tokens** — longer-lived (`JWT_REFRESH_TTL`, default `7d`), signed with a **separate** `JWT_REFRESH_SECRET`. Server-side refresh state lives in **Redis**, keyed per session/token family, so tokens can be tracked, rotated, and revoked.
- **Refresh-token rotation** — every successful refresh issues a **new** refresh token and invalidates the previous one. Tokens are single-use.
- **Reuse detection** — if a **already-used/rotated** refresh token is presented, the entire session family is treated as compromised and **revoked** (forcing re-authentication). This defends against stolen-token replay.
- **Password hashing** — **Argon2** (memory-hard) for all local passwords.
- **OAuth** — **Google** and **GitHub** via OAuth 2.0, implemented behind a **Strategy** abstraction so providers are pluggable; successful OAuth issues the same JWT access/refresh pair.
- **MFA** — **TOTP**-based multi-factor authentication as a second step for accounts that enable it.

### Token storage

- **Access token** — held by the SPA in memory and attached by the Angular auth **HTTP interceptor**; on a `401` the interceptor triggers a refresh.
- **Refresh token** — delivered/stored so it is not readable by page JavaScript (httpOnly cookie semantics), with server-side state and rotation in Redis as the source of truth for validity.
- **CORS / transport** — locked to `CORS_ORIGIN`; TLS in production; `helmet` + `@nestjs/throttler` protect the auth endpoints.

## Consequences

**Positive**

- Stateless access-token verification → the API scales horizontally with no shared session store on the hot path.
- Short access-token TTL limits the blast radius of a leaked token; rotation + reuse detection contains refresh-token theft.
- Argon2 provides strong resistance to offline cracking.
- Strategy-based OAuth makes adding providers straightforward; TOTP adds a strong second factor.

**Negative / trade-offs**

- Refresh rotation requires **server-side state in Redis** (not fully stateless refresh) and careful family/session bookkeeping.
- Reuse-detection revocation can log out a legitimate user if a client mishandles concurrent refreshes — clients must serialize refreshes.
- Two secrets and multiple TTLs to manage/rotate; MFA and OAuth add flows and edge cases to test.

## Alternatives considered

| Option | Why not |
|--------|---------|
| **Server-side sessions (cookie + session store)** | Stateful on the hot path; more coupling and scaling overhead than short-lived stateless access tokens. |
| **Long-lived access tokens, no refresh** | A leaked token stays valid too long; no rotation/revocation story. |
| **Non-rotating refresh tokens** | Simpler, but a stolen refresh token is replayable for its full lifetime with no reuse detection. |
| **bcrypt / PBKDF2 for hashing** | Acceptable, but Argon2 (memory-hard) is the current best-practice default we standardize on. |
| **Third-party IdP (Auth0/Cognito/Keycloak) for everything** | Reduces control and adds external dependency/cost; we keep first-party auth and use OAuth only for social login. |

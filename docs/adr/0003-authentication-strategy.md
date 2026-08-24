# ADR-0003: Authentication strategy

- **Status:** Accepted — amended 2026-08-24 to match the implementation (see [Amendment](#amendment-2026-08-24))
- **Date:** Phase 1 (Auth & Users)
- **Deciders:** FinanceHub engineering
- **Related:** [Architecture §6](../architecture.md#6-cross-cutting-concerns) · [ADR-0002](./0002-clean-architecture-backend.md)

## Context

FinanceHub handles sensitive personal financial data, so authentication must be secure by default while supporting a modern SPA + horizontally scalable API. Requirements:

- Stateless, scalable API auth that works across multiple instances.
- Strong password storage and protection against token theft/replay.
- Optional second factor (TOTP MFA). Social login (Google, GitHub) was in the original scope; it is **not** implemented (see the amendment below).
- Sensible token lifetimes with a safe refresh flow and **reuse detection**.

## Decision

Use **JWT access tokens + rotating refresh tokens**, with the following design:

- **Access tokens** — short-lived JWTs (`JWT_ACCESS_TTL`, default `15m`), signed with `JWT_ACCESS_SECRET`. Sent as a `Bearer` token on each API request and verified by the auth guard. Stateless: no DB lookup on the hot path.
- **Refresh tokens** — longer-lived (`JWT_REFRESH_TTL`, default `7d`) **opaque** 256-bit random strings, not JWTs. Only their SHA-256 hash is persisted, in the PostgreSQL `refresh_tokens` table (`tokenHash`, `familyId`, `expiresAt`, `revokedAt`, `replacedByTokenId`), so tokens can be tracked, rotated, and revoked. Nothing about a refresh token can be derived from the stored row.
- **Refresh-token rotation** — every successful refresh issues a **new** refresh token and invalidates the previous one. Tokens are single-use.
- **Reuse detection** — if a **already-used/rotated** refresh token is presented, the entire session family is treated as compromised and **revoked** (forcing re-authentication). This defends against stolen-token replay.
- **Password hashing** — **Argon2** (memory-hard) for all local passwords.
- **MFA** — **TOTP** (RFC 6238, no external dependency) as a mandatory second step for accounts that enable it. `POST /auth/login` returns `{ mfaRequired: true, mfaToken }` — a 5-minute, `typ: "mfa"` JWT that the bearer guard refuses — instead of a session; the client answers at `POST /auth/mfa/challenge` with a TOTP or one-time recovery code, and only that call issues tokens and sets the refresh cookie. Secrets are stored AES-256-GCM-encrypted; recovery codes are stored as SHA-256 hashes and burned on use.

### Token storage

- **Access token** — held by the SPA in memory and attached by the Angular auth **HTTP interceptor**; on a `401` the interceptor triggers a refresh.
- **Refresh token** — an httpOnly, `SameSite=strict` cookie (`fh_refresh`, path `/api/auth`, `Secure` in production), so it is never readable by page JavaScript. The `refresh_tokens` table is the source of truth for validity.
- **CORS / transport** — locked to `CORS_ORIGIN`; TLS in production; `helmet` + `@nestjs/throttler` protect the auth endpoints.

## Consequences

**Positive**

- Stateless access-token verification → the API scales horizontally with no shared session store on the hot path.
- Short access-token TTL limits the blast radius of a leaked token; rotation + reuse detection contains refresh-token theft.
- Argon2 provides strong resistance to offline cracking.
- TOTP adds a strong second factor with no third-party dependency and no extra datastore.

**Negative / trade-offs**

- Refresh rotation requires **server-side state in PostgreSQL** (not fully stateless refresh) and careful family/session bookkeeping: every refresh costs a read plus two writes on the primary.
- Reuse-detection revocation can log out a legitimate user if a client mishandles concurrent refreshes — clients must serialize refreshes.
- Multiple TTLs to manage/rotate; MFA adds a second login leg and edge cases to test.
- Expired/rotated rows accumulate in `refresh_tokens`; they are never pruned. Add a scheduled cleanup when the table gets large.

## Alternatives considered

| Option | Why not |
|--------|---------|
| **Server-side sessions (cookie + session store)** | Stateful on the hot path; more coupling and scaling overhead than short-lived stateless access tokens. |
| **Long-lived access tokens, no refresh** | A leaked token stays valid too long; no rotation/revocation story. |
| **Non-rotating refresh tokens** | Simpler, but a stolen refresh token is replayable for its full lifetime with no reuse detection. |
| **bcrypt / PBKDF2 for hashing** | Acceptable, but Argon2 (memory-hard) is the current best-practice default we standardize on. |
| **Third-party IdP (Auth0/Cognito/Keycloak) for everything** | Reduces control and adds external dependency/cost; we keep first-party auth and use OAuth only for social login. |

## Amendment (2026-08-24)

This ADR originally described three things the code never did. Corrected above; recorded here so the divergence is not silently rewritten out of history.

| Original claim | Actual implementation |
|----------------|-----------------------|
| Refresh tokens are JWTs signed with a separate `JWT_REFRESH_SECRET`. | They are opaque `randomBytes(32)` hex strings. `JWT_REFRESH_SECRET` is validated at boot but signs nothing — it is currently dead configuration. |
| Refresh state lives in **Redis**, keyed per session/token family. | It lives in the PostgreSQL `refresh_tokens` table, one row per issued token, linked by `familyId`. Redis is used only for throttler storage and a health probe. |
| Social login via Google/GitHub behind a Strategy abstraction. | Not implemented. The `OAuthAccount` Prisma model and the `OAuthProvider` shared type exist; no provider, controller, route or strategy does. |

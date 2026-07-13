# Phase 1 — Auth & Users (Implementation Plan)

> Status: **Planned** · Execution starts next session. Docker-dependent steps
> (migration generation, integration/e2e tests) are deferred until the local
> stack is back up.

## Goal

Deliver secure authentication and user management: registration, login, JWT
access + rotating refresh tokens (with reuse detection), Argon2 hashing, email
verification, password reset, TOTP MFA, and OAuth (Google + GitHub) — plus the
Angular auth UI and route protection.

## Design decisions (confirmed)

> Confirmed 2026-07-13: full Phase 1 scope; refresh token via **httpOnly cookie**
> with the access token held in memory on the client (D3/D4 below).


| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D1 | Password hashing | **Argon2id** (`argon2`) | Modern, memory-hard, OWASP-recommended. |
| D2 | Access token | **JWT HS256**, 15 min, payload `{ sub, email, role }` | Stateless, fast to verify; secret already in config. |
| D3 | Refresh token | **Opaque random token, SHA-256–hashed at rest in Postgres** (`RefreshToken`), 7 days, **rotated on every use with family-based reuse detection** | Enables revocation, per-device sessions, and theft detection. |
| D4 | Refresh delivery | **httpOnly, Secure, SameSite=strict cookie** (`fh_refresh`); access token returned in body, held in memory on the client | Refresh token unreadable by JS (XSS-resistant); access token never in localStorage. |
| D5 | Route protection | **Global `JwtAuthGuard`** + `@Public()` opt-out; `@Roles()` + `RolesGuard` | Secure-by-default; explicit public endpoints. |
| D6 | OAuth | **`@nestjs/passport`** + `passport-google-oauth20` / `passport-github2`; links to `OAuthAccount` | Idiomatic NestJS; battle-tested strategies. |
| D7 | MFA | **TOTP** (`otplib`) + QR (`qrcode`) + hashed recovery codes | Standard authenticator-app flow. |
| D8 | Email | **`nodemailer`** with a dev "log/JSON" transport fallback (SMTP in prod; MailHog optional) | No external dependency to run locally. |
| D9 | Rate limiting | Tighter `@Throttle` on auth endpoints (login/register/reset) | Brute-force mitigation on top of the global throttler. |

## Prisma schema changes

Extend `apps/api/prisma/schema.prisma`:

- **`User`**: add `role Role @default(USER)`, `mfaEnabled Boolean @default(false)`,
  `mfaSecret String?` (encrypted at rest), relations to the tables below.
- **`RefreshToken`**: `id`, `userId`, `tokenHash` (unique), `familyId`,
  `userAgent`, `ipAddress`, `expiresAt`, `revokedAt?`, `replacedByTokenId?` —
  supports rotation + reuse detection.
- **`OAuthAccount`**: `id`, `userId`, `provider Provider`, `providerAccountId`,
  `@@unique([provider, providerAccountId])`.
- **`VerificationToken`**: `id`, `userId`, `type TokenType` (EMAIL_VERIFY |
  PASSWORD_RESET), `tokenHash`, `expiresAt`, `consumedAt?`.
- **`MfaRecoveryCode`**: `id`, `userId`, `codeHash`, `usedAt?`.
- Enums: `Role { USER, ADMIN }`, `Provider { GOOGLE, GITHUB }`,
  `TokenType { EMAIL_VERIFY, PASSWORD_RESET }`.

Migration `add_auth` is generated against a real Postgres (Docker) — **deferred**.
`prisma generate` (client types) runs now so code compiles.

## Backend module structure (Clean Architecture)

```
apps/api/src/modules/
├── auth/
│   ├── auth.controller.ts        register/login/refresh/logout/verify/reset/mfa/oauth
│   ├── auth.service.ts           use-cases (orchestration)
│   ├── dto/                       request/response DTOs (class-validator)
│   ├── domain/                   token/session value objects
│   ├── guards/                    jwt-auth.guard, roles.guard
│   ├── strategies/                jwt.strategy, google.strategy, github.strategy
│   ├── decorators/                @Public, @CurrentUser, @Roles
│   ├── services/                  password.service (Argon2), token.service (JWT+rotation),
│   │                              mfa.service (TOTP), verification.service
│   └── repositories/              refresh-token.repository, oauth-account.repository,
│                                  verification-token.repository
├── users/
│   ├── users.controller.ts        GET/PATCH /users/me, admin lookups
│   ├── users.service.ts
│   ├── users.repository.ts        Prisma-backed
│   ├── dto/  domain/  mappers/
└── mail/
    └── mail.service.ts            nodemailer (+ dev transport)
```

Shared contracts added to `@financehub/shared-types`: `AuthTokens`, `AuthUser`,
`Role`, `MfaMethod`, login/register request/response types.

## Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/auth/register` | public | Argon2 hash, send verification email |
| POST | `/api/auth/login` | public | body → access token; sets refresh cookie; `mfaRequired` if enabled |
| POST | `/api/auth/mfa/verify` | challenge | completes MFA login |
| POST | `/api/auth/refresh` | refresh cookie | rotates; detects reuse |
| POST | `/api/auth/logout` | refresh cookie | revokes token/family |
| POST | `/api/auth/verify-email` | public | consume email token |
| POST | `/api/auth/resend-verification` | auth | |
| POST | `/api/auth/forgot-password` | public | issues reset token (always 200) |
| POST | `/api/auth/reset-password` | public | consume reset token |
| GET | `/api/auth/google` · `/google/callback` | public | OAuth |
| GET | `/api/auth/github` · `/github/callback` | public | OAuth |
| POST | `/api/auth/mfa/setup` · `/enable` · `/disable` | auth | TOTP + recovery codes |
| GET/PATCH | `/api/users/me` | auth | profile |

## Frontend (Angular) slice

- `features/auth/`: login, register, forgot-password, reset-password,
  verify-email, MFA challenge + setup pages (Reactive Forms + Material).
- `AuthService` (Signals): current user, in-memory access token, silent refresh.
- Rework `auth.interceptor` → in-memory token + 401 → refresh → retry.
- Guards: `authGuard`, `guestGuard`, `roleGuard`. Protect `/dashboard`; gate
  `/auth/*` behind `guestGuard`.

## Execution order (vertical slices)

1. **Core credentials** — schema + `PasswordService` + `TokenService` +
   register/login + `JwtAuthGuard`/`@Public`/`@CurrentUser` + `GET /users/me`.
2. **Sessions** — refresh rotation + reuse detection + logout + device sessions.
3. **Email flows** — verification + forgot/reset password + `MailModule`.
4. **MFA** — TOTP setup/enable/verify/disable + recovery codes.
5. **OAuth** — Google + GitHub.
6. **Frontend** — auth pages, guards, interceptor refresh, wire to API.
7. **Docker-gated** — generate `add_auth` migration, integration tests
   (Supertest), Playwright e2e, Swagger polish, update README + new ADR.

## Testing

- **Unit (now, no Docker):** password/token/mfa services, auth use-cases with
  mocked repositories, DTO validation; frontend `AuthService`, guards, forms.
- **Integration + e2e (deferred):** Supertest against real Postgres, Playwright
  login/register journeys — run once the stack is up.

## New dependencies

Runtime: `argon2`, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`,
`passport-google-oauth20`, `passport-github2`, `otplib`, `qrcode`, `nodemailer`,
`cookie-parser`.
Dev: `@types/passport-jwt`, `@types/passport-google-oauth20`,
`@types/passport-github2`, `@types/qrcode`, `@types/nodemailer`,
`@types/cookie-parser`.

## New environment variables

`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`,
`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`,
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`,
`APP_WEB_URL` (for links in emails), `MFA_ISSUER` (defaults to `FinanceHub`).
OAuth/SMTP values are optional in dev — the strategies/mailer degrade gracefully.

## Definition of done

- All endpoints implemented, documented in Swagger, protected by default.
- Unit tests green; integration + e2e green once Docker is up.
- `add_auth` migration committed; seed updated with a verified demo user + hash.
- Frontend auth flow works end-to-end against the API.
- README + a new ADR (`0004-*`) updated; roadmap marks Phase 1 done.

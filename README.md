<div align="center">

# 💰 FinanceHub

**A production-grade personal finance management platform.**

Manage bank accounts, credit cards, income, expenses, transfers, budgets, goals,
recurring transactions and installments — with dashboards and reports, from the
web, from a Flutter app, or from an AI assistant over MCP.

Built as an [Nx](https://nx.dev) monorepo with **NestJS** (API), **Angular**
(web) and **Flutter** (mobile).

[![CI](https://github.com/luscanascimento/financial-system/actions/workflows/ci.yml/badge.svg)](./.github/workflows/ci.yml)
[![Conventional Commits](https://img.shields.io/badge/commits-conventional-informational)](https://www.conventionalcommits.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

</div>

---

## ✨ Overview

FinanceHub is a full-stack SaaS-style application built to demonstrate
professional engineering practices end-to-end: clean architecture, strong typing,
comprehensive testing, containerized infrastructure and CI/CD.

| Area         | Highlights                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| **Backend**  | NestJS 11 · Clean Architecture · Prisma 6 · PostgreSQL · Redis                                             |
| **Frontend** | Angular 21 · Standalone components · Signals · Angular Material · SCSS                                     |
| **Mobile**   | Flutter 3 ([`apps/mobile`](./apps/mobile/README.md)) · Riverpod · Dio · go_router · flutter_secure_storage |
| **Auth**     | JWT + refresh rotation · Argon2 · TOTP MFA enforced at login · email verify · password reset               |
| **Domain**   | Accounts · Categories · Transactions · Transfers · Installments · Recurring · Budgets · Goals · Reports    |
| **Quality**  | Vitest · flutter_test · Playwright · ESLint · Prettier · module boundaries                                 |
| **Infra**    | Docker Compose · GitHub Actions · Swagger/OpenAPI                                                          |
| **AI**       | MCP server ([`apps/mcp`](./apps/mcp/README.md)) — drive FinanceHub from Claude & other assistants          |

> **Status:** the full stack is functional end-to-end — authentication, the
> complete financial domain API (accounts, transactions, transfers, budgets,
> goals, reports), an Angular SPA (dashboard, feature pages, auth flow), a
> Flutter client against the same API, and an MCP server. See the
> [roadmap](#-roadmap) for what's done and what's next.

**Demo login (after `pnpm db:seed`):** `demo@financehub.dev` / `Password123!`

---

## 🔍 Engineering highlights

**TOTP multi-factor auth, implemented from the RFC — not from npm.**
[`apps/api/src/modules/account-security/services/totp.ts`](./apps/api/src/modules/account-security/services/totp.ts)
is ~140 dependency-free lines on top of Node's `crypto`: RFC 4648 Base32
encode/decode, the RFC 4226 HOTP dynamic-truncation step (big-endian 64-bit
counter → HMAC-SHA1 → offset from the low nibble of the last byte → mask the
sign bit → modulo 10^digits), and the RFC 6238 time-step wrapper with a
configurable `±window` for clock drift. Codes are compared with
`crypto.timingSafeEqual` behind a length guard, so verification leaks nothing
through timing. The
[spec](./apps/api/src/modules/account-security/services/totp.spec.ts) asserts
it against the **official RFC 4226 Appendix D / RFC 6238 Appendix B test
vectors** — the `"12345678901234567890"` reference secret, the published
truncated HOTP table, and the `T=59s → 287082` TOTP value — rather than against
its own output. Secrets are stored AES-256-GCM-encrypted at rest, and the second
factor is actually _enforced_: with MFA on, `POST /auth/login` returns a
5-minute challenge token the bearer guard refuses, and only
`POST /auth/mfa/challenge` — TOTP or a one-time recovery code — issues a
session.

Elsewhere in the domain:

- **Money is never a float.** Every amount is an integer count of minor units
  (`Int` in Prisma, `amountMinor`/`balanceMinor` on the wire), converted only at
  the display edge by `@financehub/shared-utils` — and mirrored by the same
  contract in the Angular pipe and the Flutter client. The minor-unit exponent
  comes from ISO 4217 via ICU, not from a hardcoded `100`, so JPY (0 digits) and
  KWD (3) round-trip correctly.
- **Balances can't drift.** Every mutation that touches a balance — create,
  update, delete, transfer, goal contribution — writes the row and adjusts the
  account inside one `prisma.$transaction`, so a two-sided transfer is
  all-or-nothing.
- **The recurrence engine isolates failure.** `runDue()` processes each template
  in its own try/catch and only advances `nextRunDate` _after_ the generated
  transaction commits: one bad template is logged and skipped instead of
  aborting the batch, and its missed run is retried rather than lost. A template
  overdue by several periods is caught up in one pass (capped per run).

**What is _not_ there yet, so nobody has to grep for it:**

- **No scheduler.** `runDue()` is triggered by
  `POST /recurring-transactions/run`; there is no `@Cron`, worker or queue in
  the repo. Recurring transactions are generated when something calls that
  endpoint (an external cron works), not on their own.
- **Multi-currency is partial.** Amounts carry their currency and its correct
  exponent, and net worth is reported per currency, but there is no FX
  conversion: the dashboard's headline `totalBalanceMinor` covers only the
  user's dominant currency (`ReportsService.getOverview`). Rates and cross-
  currency totals are not implemented.
- **No test coverage on `apps/mcp`.** The MCP server is typed and linted but has
  no unit tests yet.

---

## 🚀 Quick start

### Option A — Docker (recommended)

Requires Docker Desktop. No manual setup — one command boots the entire stack:

```bash
docker compose up --build
```

| Service      | URL                              |
| ------------ | -------------------------------- |
| Web app      | http://localhost:8080            |
| API          | http://localhost:3000/api        |
| Swagger docs | http://localhost:3000/api/docs   |
| API health   | http://localhost:3000/api/health |

The API applies database migrations automatically on start.

### Option B — Local development

Requires Node ≥ 20.19 and pnpm ≥ 10. Bring up only the backing services with
Docker, then run the apps with live reload:

```bash
pnpm install
docker compose up postgres redis   # backing services only
cp .env.example .env               # then adjust as needed

pnpm prisma:migrate:dev        # apply migrations
pnpm db:seed                   # optional demo data

npx nx serve api               # http://localhost:3000/api
npx nx serve web               # http://localhost:4200 (proxies /api → :3000)
```

### Option C — Flutter client

With the API up (Option A or B), point the mobile app at it. Platform folders
aren't vendored, so generate them once:

```bash
cd apps/mobile
flutter create . && flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:3000/api
```

Full details — auth/refresh parity with the web client, `--dart-define` keys,
Android cleartext caveat — in [`apps/mobile/README.md`](./apps/mobile/README.md).

---

## 🗂️ Monorepo layout

```
financehub/
├── apps/
│   ├── api/          NestJS backend (Clean Architecture)
│   ├── web/          Angular frontend
│   ├── mobile/       Flutter client for the same API (Riverpod + Dio + go_router)
│   ├── mcp/          Model Context Protocol server (AI assistant access)
│   └── web-e2e/      Playwright end-to-end tests
├── packages/
│   ├── shared-types/ Types/contracts shared by api + web
│   └── shared-utils/ Pure, framework-agnostic utilities
├── docker/           Dockerfiles, nginx & entrypoints
├── docs/             Architecture, guides & ADRs
└── docker-compose.yml
```

Dependency direction is enforced by the `@nx/enforce-module-boundaries` lint
rule (see [architecture docs](./docs/architecture.md)).

---

## 🧩 Available scripts

| Command                   | Description                           |
| ------------------------- | ------------------------------------- |
| `pnpm build`              | Build every project                   |
| `pnpm test`               | Run all unit tests (Vitest)           |
| `pnpm lint`               | Lint all projects                     |
| `pnpm typecheck`          | Type-check all projects               |
| `pnpm e2e`                | Run Playwright end-to-end tests¹      |
| `pnpm format`             | Format the workspace with Prettier    |
| `pnpm prisma:migrate:dev` | Create/apply a dev migration          |
| `pnpm prisma:generate`    | Generate the Prisma client            |
| `pnpm db:seed`            | Seed the database                     |
| `pnpm graph`              | Open the interactive Nx project graph |

¹ The e2e suite drives the real stack, so it needs Postgres, Redis, the API and
a seeded database — see [Testing](#-testing). The Flutter client is outside the
Nx graph; run its tests with `cd apps/mobile && flutter test`.

Target a single project with Nx, e.g. `npx nx test api` or `npx nx build web`.
Use `npx nx affected -t test` to run only what changed.

---

## 🧪 Testing

- **Unit** — Vitest on the API, the Angular app, `apps/mcp` (MCP client & tools),
  and `packages/shared-utils` (NestJS uses SWC for decorator metadata).
  Services are tested against mocked repositories with distributed concurrency locks;
  the security primitives (TOTP, crypto) are tested against published RFC vectors.
- **Mobile unit** — `flutter_test` over the Dart client's pure logic: money
  conversion/formatting, enum wire round-trips, model deserialization and API
  error mapping.
- **E2E** — Playwright in [`apps/web-e2e`](./apps/web-e2e/src): the money flow
  (sign in → open an account → book an expense → assert the dashboard KPI moved
  by exactly the right number of cents), driven headless through the real
  Angular → NestJS → Prisma → PostgreSQL stack.

```bash
npx nx run-many -t test        # all TypeScript unit tests
cd apps/mobile && flutter test # Flutter client unit tests

# End-to-end. Needs a running, seeded stack:
docker compose up -d && pnpm db:seed
BASE_URL=http://localhost:8080 npx nx e2e web-e2e --project=chromium
```

Without `BASE_URL`, Playwright boots `nx run web:serve` on :4200 itself — which
still needs the API and its datastores up (`docker compose up postgres redis
api`).

---

## 📚 Documentation

| Document                                   | Contents                               |
| ------------------------------------------ | -------------------------------------- |
| [Architecture](./docs/architecture.md)     | System design, layering, boundaries    |
| [Development guide](./docs/development.md) | Setup, workflow, adding features       |
| [Deployment guide](./docs/deployment.md)   | Docker topology, env, migrations, prod |
| [Contributing](./CONTRIBUTING.md)          | Branching, Conventional Commits, PRs   |
| [ADRs](./docs/adr/README.md)               | Architecture Decision Records          |

API reference is auto-generated (Swagger/OpenAPI) at `/api/docs`.

---

## 🛣️ Roadmap

| Phase | Scope                                                                                        | Status    |
| ----- | -------------------------------------------------------------------------------------------- | --------- |
| **0** | Foundation — monorepo, infra, Docker, CI, dashboard skeleton                                 | ✅ Done   |
| **1** | Auth & Users — register/login, JWT+refresh, Argon2, MFA (TOTP), email verify, password reset | ✅ Done   |
| **2** | Accounts & Categories                                                                        | ✅ Done   |
| **3** | Transactions, transfers, installments, recurring¹                                            | ✅ Done   |
| **4** | Budgets & Goals                                                                              | ✅ Done   |
| **5** | Reports & Dashboards (KPIs, charts, cash flow)                                               | ✅ Done   |
| **6** | Search/filtering/pagination ✅ · notifications — · audit logs —                              | ◐ Partial |
| **7** | Flutter mobile client ([`apps/mobile`](./apps/mobile/README.md)) consuming the same API      | ✅ Done   |
| **8** | MCP server ([`apps/mcp`](./apps/mcp/README.md)) — FinanceHub as an AI assistant tool         | ✅ Done   |
| **9** | OAuth (Google/GitHub), attachments, notifications, audit logs & deployment                   | 📋 Next   |

¹ “Recurring” is the domain + generation logic; nothing in the repo _schedules_
it — see [Engineering highlights](#-engineering-highlights).

“Notifications” in Phase 6 means server-side delivery (email/push/in-app feed),
which is **not built**. The web app's
`core/services/notification.service.ts` is a `MatSnackBar` wrapper for UI
toasts — a different thing, and not counted here.

---

## 🤝 Contributing

This project uses [Conventional Commits](https://www.conventionalcommits.org) and
feature-branch PRs. See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## 📄 License

[MIT](./LICENSE)

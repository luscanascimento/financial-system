# Phases 2–5 — Financial Domain (Delivery Notes)

> Status: **Delivered.** Accounts, categories, transactions, transfers,
> installments, recurring templates, budgets, goals and reports — backend API,
> Angular UI, migration and seed — plus the remaining Phase 1 auth surface
> (email verification, password reset, TOTP MFA).

## What shipped

### Backend (NestJS, Clean Architecture)

Ten feature modules under `apps/api/src/modules/`, all secured by the global
`JwtAuthGuard` and scoped per user (a user can never read or mutate another
user's rows — ownership failures return `404`):

| Module | Route | Highlights |
| ------ | ----- | ---------- |
| `accounts` | `/api/accounts` | Checking/savings/credit/cash/wallet/investment; balance maintained transactionally |
| `categories` | `/api/categories` | Hierarchical income/expense; flat or tree; default seeding |
| `transactions` | `/api/transactions` | Income/expense ledger; filters + pagination; installment splitting; balance updates inside `prisma.$transaction` |
| `transfers` | `/api/transfers` | Account-to-account (incl. cross-currency); excluded from cash-flow |
| `recurring` | `/api/recurring-transactions` | Scheduled templates; `POST /run` generates due transactions |
| `budgets` | `/api/budgets` | Per-category caps with computed period spend/progress |
| `goals` | `/api/goals` | Savings goals + contributions; `ACHIEVED` transition |
| `reports` | `/api/reports` | Overview KPIs, net worth, cash flow, category breakdown |
| `mail` | — | Dev log transport (no SMTP dependency) |
| `account-security` | `/api/auth/*`, `/api/auth/mfa/*` | Email verification, password reset, TOTP MFA (RFC 6238, zero new deps) + hashed recovery codes |

**Money** is stored as signed integer **minor units** (cents) everywhere,
mirroring `@financehub/shared-utils`' `money` helpers. Period math (budgets,
reports) uses the shared `period` helpers, computed in UTC for determinism.

### Frontend (Angular 21, zoneless, Signals, Material 3)

- **Auth**: `AuthService` (in-memory access token + silent refresh via the
  httpOnly refresh cookie), `authGuard`/`guestGuard`, a `401 → refresh → retry`
  interceptor, and login / register / forgot-password / reset-password /
  verify-email pages.
- **Shell**: responsive `MainLayout` (sidenav, theme toggle, account menu).
- **Dashboard**: KPIs, an inline-SVG cash-flow chart and a category breakdown
  from the reports API (no charting dependency).
- **Features** (lazy-loaded): accounts, transactions (filters + pagination),
  categories, budgets (progress bars), goals (contributions).

### Data

- Offline migration `20260715120000_add_financial_domain` (generated with
  `prisma migrate diff`, so it applies cleanly under `prisma migrate deploy`
  without needing a live database to author).
- A rich idempotent seed: demo user (`demo@financehub.dev` / `Password123!`),
  default categories, four accounts, two months of transactions, a budget and a
  savings goal.

## Verification

`nx run-many -t build test lint` is green across all six projects — API build +
`tsc` clean, **104 API unit tests** and **web build + AOT template check +
unit tests** passing, lint clean.

## Deferred (Phase 7 candidates)

- **OAuth** (Google/GitHub) sign-in.
- **Login MFA gating** — MFA can be set up/enabled/verified; the login endpoint
  does not yet branch into an MFA challenge.
- **Attachments** (receipts to MinIO) and **audit logs**.
- **Integration tests** (Supertest) and **Playwright e2e** — deferred until the
  local Docker stack is verified end-to-end (see the Phase 0 Docker note).

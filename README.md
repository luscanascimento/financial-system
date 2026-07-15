<div align="center">

# 💰 FinanceHub

**A production-grade personal finance management platform.**

Manage bank accounts, credit cards, income, expenses, transfers, budgets, goals,
recurring transactions and installments — with dashboards, reports and
notifications.

Built as an [Nx](https://nx.dev) monorepo with **NestJS** (API) and **Angular** (web).

[![CI](https://github.com/luscanascimento/financial-system/actions/workflows/ci.yml/badge.svg)](./.github/workflows/ci.yml)
[![Conventional Commits](https://img.shields.io/badge/commits-conventional-informational)](https://www.conventionalcommits.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

</div>

---

## ✨ Overview

FinanceHub is a full-stack SaaS-style application built to demonstrate
professional engineering practices end-to-end: clean architecture, strong typing,
comprehensive testing, containerized infrastructure and CI/CD.

| Area          | Highlights                                                                 |
| ------------- | -------------------------------------------------------------------------- |
| **Backend**   | NestJS 11 · Clean Architecture · Prisma 6 · PostgreSQL · Redis · MinIO      |
| **Frontend**  | Angular 21 · Standalone components · Signals · Angular Material · SCSS      |
| **Auth**      | JWT + refresh rotation · Argon2 · TOTP MFA · email verify · password reset  |
| **Domain**    | Accounts · Categories · Transactions · Transfers · Installments · Recurring · Budgets · Goals · Reports |
| **Quality**   | Vitest · Supertest · Playwright · ESLint · Prettier · module boundaries    |
| **Infra**     | Docker Compose · GitHub Actions · Swagger/OpenAPI                           |

> **Status:** the full stack is functional end-to-end — authentication, the
> complete financial domain API (accounts, transactions, transfers, budgets,
> goals, reports) and an Angular SPA (dashboard, feature pages, auth flow). See
> the [roadmap](#-roadmap) for what's done and what's next.

**Demo login (after `pnpm db:seed`):** `demo@financehub.dev` / `Password123!`

---

## 🚀 Quick start

### Option A — Docker (recommended)

Requires Docker Desktop. No manual setup — one command boots the entire stack:

```bash
docker compose up --build
```

| Service         | URL                                   |
| --------------- | ------------------------------------- |
| Web app         | http://localhost:8080                 |
| API             | http://localhost:3000/api             |
| Swagger docs    | http://localhost:3000/api/docs        |
| API health      | http://localhost:3000/api/health      |
| MinIO console   | http://localhost:9001                 |

The API applies database migrations automatically on start.

### Option B — Local development

Requires Node ≥ 20.19 and pnpm ≥ 10. Bring up only the backing services with
Docker, then run the apps with live reload:

```bash
pnpm install
docker compose up postgres redis minio minio-setup   # backing services only
cp .env.example .env                                  # then adjust as needed

pnpm prisma:migrate:dev        # apply migrations
pnpm db:seed                   # optional demo data

npx nx serve api               # http://localhost:3000/api
npx nx serve web               # http://localhost:4200 (proxies /api → :3000)
```

---

## 🗂️ Monorepo layout

```
financehub/
├── apps/
│   ├── api/          NestJS backend (Clean Architecture)
│   ├── web/          Angular frontend
│   └── web-e2e/      Playwright end-to-end tests
├── packages/
│   ├── shared-types/ Types/contracts shared by api + web
│   ├── shared-utils/ Pure, framework-agnostic utilities
│   └── ui/           Angular presentational component library
├── docker/           Dockerfiles, nginx & entrypoints
├── docs/             Architecture, guides & ADRs
└── docker-compose.yml
```

Dependency direction is enforced by the `@nx/enforce-module-boundaries` lint
rule (see [architecture docs](./docs/architecture.md)).

---

## 🧩 Available scripts

| Command                     | Description                                      |
| --------------------------- | ------------------------------------------------ |
| `pnpm build`                | Build every project                              |
| `pnpm test`                 | Run all unit tests (Vitest)                      |
| `pnpm lint`                 | Lint all projects                                |
| `pnpm typecheck`            | Type-check all projects                          |
| `pnpm e2e`                  | Run Playwright end-to-end tests                  |
| `pnpm format`               | Format the workspace with Prettier               |
| `pnpm prisma:migrate:dev`   | Create/apply a dev migration                     |
| `pnpm prisma:generate`      | Generate the Prisma client                       |
| `pnpm db:seed`              | Seed the database                                |
| `pnpm graph`                | Open the interactive Nx project graph            |

Target a single project with Nx, e.g. `npx nx test api` or `npx nx build web`.
Use `npx nx affected -t test` to run only what changed.

---

## 🧪 Testing

- **Unit** — Vitest across every project (NestJS uses SWC for decorator metadata).
- **Integration** — Supertest against the NestJS HTTP layer *(from Phase 1)*.
- **E2E** — Playwright in `apps/web-e2e`.

```bash
npx nx run-many -t test        # all unit tests
npx nx e2e web-e2e             # end-to-end
```

---

## 📚 Documentation

| Document                                             | Contents                                    |
| ---------------------------------------------------- | ------------------------------------------- |
| [Architecture](./docs/architecture.md)               | System design, layering, boundaries         |
| [Development guide](./docs/development.md)            | Setup, workflow, adding features            |
| [Deployment guide](./docs/deployment.md)             | Docker topology, env, migrations, prod       |
| [Contributing](./CONTRIBUTING.md)                    | Branching, Conventional Commits, PRs        |
| [ADRs](./docs/adr/README.md)                         | Architecture Decision Records               |

API reference is auto-generated (Swagger/OpenAPI) at `/api/docs`.

---

## 🛣️ Roadmap

| Phase | Scope                                                                       | Status |
| ----- | --------------------------------------------------------------------------- | ------ |
| **0** | Foundation — monorepo, infra, Docker, CI, dashboard skeleton                | ✅ Done |
| **1** | Auth & Users — register/login, JWT+refresh, Argon2, MFA (TOTP), email verify, password reset | ✅ Done |
| **2** | Accounts & Categories                                                        | ✅ Done |
| **3** | Transactions, transfers, installments, recurring                             | ✅ Done |
| **4** | Budgets & Goals                                                              | ✅ Done |
| **5** | Reports & Dashboards (KPIs, charts, cash flow)                                | ✅ Done |
| **6** | Search/filtering/pagination ✅ · notifications ✅ · audit logs                | ◐ Partial |
| **7** | OAuth (Google/GitHub), attachments, E2E hardening & deployment               | 📋 Next |

---

## 🤝 Contributing

This project uses [Conventional Commits](https://www.conventionalcommits.org) and
feature-branch PRs. See [CONTRIBUTING.md](./CONTRIBUTING.md).

To activate the local git hooks (commit-message linting + staged formatting),
add the tooling once and reinstall:

```bash
pnpm add -D husky @commitlint/cli @commitlint/config-conventional lint-staged
pnpm install   # runs "prepare" → husky
```

---

## 📄 License

[MIT](./LICENSE)

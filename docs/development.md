# FinanceHub — Development Guide

> How to set up, run, and work day-to-day on FinanceHub.
>
> Related docs: [Architecture](./architecture.md) · [Deployment](./deployment.md) · [Contributing](../CONTRIBUTING.md) · [ADRs](./adr/README.md)

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | `>= 20.19` | Use a version manager (nvm/fnm/volta). |
| **pnpm** | `>= 10` | Package manager. `corepack enable` is the easiest way to get it. |
| **Docker + Docker Compose** | Recent | Runs the full stack (web, api, postgres, redis, minio). |
| **Git** | Recent | Conventional Commits are enforced via Husky + commitlint. |

You do **not** need Postgres, Redis, or MinIO installed locally — Docker Compose provides them.

---

## 2. First-time setup

```bash
# 1. Clone and enter the repo
git clone <repo-url> financehub
cd financehub

# 2. Install dependencies (also installs Husky git hooks via "prepare")
pnpm install

# 3. Create your local env file
cp .env.example .env
# Edit .env and set the JWT secrets (JWT_ACCESS_SECRET, JWT_REFRESH_SECRET) to random values

# 4. Start the entire stack
docker compose up
```

With `docker compose up` running, everything is wired for you — no manual database or bucket setup required.

| Service | URL |
|---------|-----|
| Web app (nginx) | http://localhost:8080 |
| API | http://localhost:3000/api |
| Swagger / OpenAPI | http://localhost:3000/api/docs |
| MinIO console | http://localhost:9001 |

See the [Deployment guide](./deployment.md) for the full Compose topology and port map.

---

## 3. Day-to-day workflow

You can develop entirely in Docker, or run individual dev servers with Nx for faster feedback loops.

```bash
# API dev server  →  http://localhost:3000  (API under /api, Swagger at /api/docs)
npx nx serve api

# Web dev server  →  http://localhost:4200  (with HMR)
npx nx serve web
```

When running dev servers outside Docker, keep the infrastructure containers (postgres, redis, minio) up so the API has its dependencies.

Typical loop:

1. Create a feature branch (see [Contributing](../CONTRIBUTING.md#branching-model)).
2. Make changes; run the relevant dev server(s).
3. Run `npx nx affected -t lint test typecheck` before committing.
4. Commit using **Conventional Commits** (commitlint will reject non-conforming messages).
5. Open a PR; CI runs lint, test, build, and typecheck.

---

## 4. Project commands

| Task | Command |
|------|---------|
| Install deps | `pnpm install` |
| Run full stack (Docker) | `docker compose up` |
| Serve API | `npx nx serve api` |
| Serve web | `npx nx serve web` |
| Test everything | `pnpm test` (`npx nx run-many -t test`) |
| Test one project | `npx nx test <project>` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| Format | `pnpm format` |
| Build everything | `pnpm build` |
| Web E2E | `npx nx e2e web-e2e` |
| Affected (lint/test/build) | `npx nx affected -t lint test build` |
| Project graph | `pnpm graph` (`nx graph`) |

Project names: `api`, `web`, `web-e2e`, `shared-types`, `shared-utils`, `ui`.

---

## 5. Adding a new backend module

The API follows Clean Architecture (see [Architecture §3](./architecture.md#3-backend-clean-architecture) and [ADR-0002](./adr/0002-clean-architecture-backend.md)). New feature modules (e.g. `Accounts`, `Budgets`) follow the same layered folder convention.

Suggested folder shape for a feature module under `apps/api/src/app/<feature>/`:

```
<feature>/
├── <feature>.module.ts          # NestJS module: wires providers (DI)
├── <feature>.controller.ts      # HTTP layer: routes, Swagger decorators, guards
├── application/
│   └── <feature>.service.ts     # Use-cases; depends on repository INTERFACE
├── domain/
│   ├── <feature>.model.ts       # Domain entity / value objects (no framework deps)
│   ├── <feature>.repository.ts  # Repository INTERFACE (owned by domain)
│   └── <feature>.validator.ts   # Domain-level invariants
├── infrastructure/
│   └── prisma-<feature>.repository.ts  # Implements interface; the ONLY Prisma-aware file
├── dto/
│   ├── create-<feature>.dto.ts  # class-validator DTOs
│   └── update-<feature>.dto.ts
└── mappers/
    └── <feature>.mapper.ts      # Prisma row ↔ domain ↔ DTO
```

Checklist when adding a module:

1. Define the **domain model** + **repository interface** first (no framework imports).
2. Write the **service** (use-case) against the interface.
3. Implement the **Prisma repository** and **mapper**; this is the only file that imports Prisma.
4. Add **DTOs** with `class-validator` decorators.
5. Add the **controller** with routes, guards, and `@nestjs/swagger` decorators (keep OpenAPI accurate).
6. Register everything in `<feature>.module.ts` using DI provider tokens (bind interface → implementation).
7. If the module needs schema, add a **Prisma migration**.
8. Add **unit tests** (Vitest) for services against a fake repository, and **integration tests** (Supertest) for controllers.
9. Respect the [module boundary matrix](./architecture.md#8-module-boundary-matrix): `scope:api` may only depend on api + shared.

---

## 6. Adding a new frontend feature

`apps/web` uses Angular 21 standalone components with lazy-loaded feature routes.

Suggested folder shape under `apps/web/src/app/features/<feature>/`:

```
features/<feature>/
├── <feature>.routes.ts          # Lazy-loaded route config (loadChildren/loadComponent)
├── pages/                       # Route-level container components (smart)
│   └── <feature>-list.component.ts
├── components/                  # Feature-local presentational components
├── services/                    # Feature data-access services (HTTP, state)
└── models/                      # Feature-local types (import shared via @financehub/shared-types)
```

Checklist when adding a feature:

1. Create a **lazy route** and register it in the app routes.
2. Add **route guards** for protected areas.
3. Build **container (smart) components** for pages; compose **presentational** components from `@financehub/ui`.
4. Use **Signals** for local state and **RxJS** for async streams; use **Reactive Forms** for inputs.
5. Reuse cross-cutting UX: loading/skeleton states, toasts, dark mode, responsive layout.
6. Share contracts via `@financehub/shared-types` — never redefine API shapes locally.
7. Reusable, business-logic-free components belong in `packages/ui` (`type:ui`), not in the app.
8. Add **unit tests** (Vitest) and, for critical flows, **Playwright E2E** in `apps/web-e2e`.

---

## 7. Testing guide

| Layer | Tool | Location / command |
|-------|------|--------------------|
| Unit (all projects) | **Vitest** | `npx nx test <project>` / `pnpm test` |
| API integration | **Supertest** | Co-located with the API project's tests |
| Web E2E | **Playwright** | `apps/web-e2e` → `npx nx e2e web-e2e` |

Guidelines:

- **Services** are unit-tested against **in-memory fake repositories** (no DB) — enabled by the repository-interface design.
- **Controllers** get integration coverage with **Supertest** hitting the Nest app.
- Prefer `npx nx affected -t test` locally to only run what changed.
- Keep tests deterministic; avoid real network/OAuth calls in unit tests (use strategy/adapter fakes).

---

## 8. Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| `pnpm install` uses a globally wrong pnpm | Run `corepack enable`; ensure pnpm `>= 10` and Node `>= 20.19`. |
| API can't reach DB/Redis when running `nx serve api` | Make sure the infra containers are up (`docker compose up postgres redis minio`) and `.env` points to them. |
| `CORS` errors from the web app | Ensure `CORS_ORIGIN` matches the web origin (default `http://localhost:8080`). |
| Commit rejected by commitlint | Message must follow [Conventional Commits](../CONTRIBUTING.md#conventional-commits). |
| ESLint fails with a module-boundary error | You crossed the [boundary matrix](./architecture.md#8-module-boundary-matrix). Move the code or fix the import. |
| Stale Nx results | Reset the cache: `npx nx reset`. |
| Ports already in use | Another process holds `8080/3000/5432/6379/9000/9001`; stop it or remap in `docker compose`. |
| MinIO bucket / uploads failing | Confirm `MINIO_*` env vars and that the `financehub` bucket exists (Compose provisions it). |
| Migration drift | Re-apply Prisma migrations (see [deployment](./deployment.md#running-migrations)). |

# ADR-0001: Nx integrated monorepo

- **Status:** Accepted
- **Date:** Phase 0 (Foundation)
- **Deciders:** FinanceHub engineering
- **Related:** [Architecture](../architecture.md) · [ADR-0002](./0002-clean-architecture-backend.md)

## Context

FinanceHub ships a web SPA (Angular), a backend API (NestJS), and shared code (types, utilities, a UI component library) that must stay in lockstep. We needed a repository strategy that:

- Lets the web and API **share TypeScript contracts** (types/enums) without publishing or version drift.
- **Enforces module boundaries** so the codebase does not decay into a tangle as features land across Phases 1–7.
- Provides **fast, incremental** CI (only build/test what changed) with caching.
- Offers first-class Angular **and** Node/NestJS support and code generators.

Options considered: a polyrepo, or a monorepo powered by Turborepo, Lerna, or Nx.

## Decision

Adopt an **Nx 23 integrated monorepo** with **pnpm workspaces** and **TypeScript 5.9 (strict)**.

- Apps live under `apps/` (`web`, `api`, `web-e2e`); shared libraries under `packages/` (`shared-types`, `shared-utils`, `ui`).
- Projects carry **Nx tags** (`scope:*`, `type:*`) and the **`@nx/enforce-module-boundaries`** ESLint rule enforces the [boundary matrix](../architecture.md#8-module-boundary-matrix) at lint/CI time.
- Nx's project graph, caching, and `affected` commands drive local and CI builds; `nx graph` visualizes dependencies.
- Shared code is imported via TS path aliases (`@financehub/shared-types`, `@financehub/shared-utils`) — no internal publishing.

## Consequences

**Positive**

- One version of every dependency and contract; the web and API cannot drift.
- Architectural constraints are **machine-enforced**; violations fail the build.
- `nx affected` + caching keep CI fast as the repo grows.
- First-class generators/executors for both Angular and NestJS.

**Negative / trade-offs**

- Nx is a heavier tool to learn than a bare pnpm workspace; contributors must understand tags, the project graph, and executors.
- A single large repo needs disciplined CODEOWNERS/branching to avoid contention.
- Some coupling to Nx conventions and plugin versioning.

## Alternatives considered

| Option | Why not |
|--------|---------|
| **Polyrepo** | Contract sharing requires publishing/versioning shared packages; high drift risk and cross-repo change friction. |
| **Turborepo** | Great task caching, but weaker enforced module boundaries and no integrated Angular/Nest generators. |
| **Lerna** | Primarily a publishing/versioning tool; lacks the integrated task graph, boundary enforcement, and generators we want. |
| **Bare pnpm workspaces** | Workable for linking, but no project graph, `affected`, caching, or boundary enforcement out of the box. |

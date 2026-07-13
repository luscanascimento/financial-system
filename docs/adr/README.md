# Architecture Decision Records (ADRs)

This directory records the significant architectural decisions made on FinanceHub — what we decided, why, and what we traded off. ADRs give new contributors the *context behind the code* and prevent us from relitigating settled decisions.

> Related docs: [Architecture](../architecture.md) · [Development](../development.md) · [Deployment](../deployment.md) · [Contributing](../../CONTRIBUTING.md)

## Index

| # | Title | Status | Summary |
|---|-------|--------|---------|
| [0001](./0001-nx-monorepo.md) | Nx integrated monorepo | Accepted | Nx 23 integrated monorepo with pnpm workspaces and tag-enforced module boundaries, over polyrepo/Turborepo/Lerna. |
| [0002](./0002-clean-architecture-backend.md) | Clean Architecture for the NestJS backend | Accepted | Inward dependency rule, framework-free domain, and repository interfaces that isolate Prisma. |
| [0003](./0003-authentication-strategy.md) | Authentication strategy | Accepted | JWT access + rotating refresh tokens (reuse detection), Argon2, Google/GitHub OAuth, TOTP MFA. |

## How we use ADRs

We use the **MADR** (Markdown Any Decision Records) style. Each ADR is a short, immutable-in-spirit Markdown file that captures a single decision.

**Process**

1. **Propose** — copy the structure of an existing ADR into `NNNN-short-title.md` using the next sequential number. Open it as **Proposed** in a PR.
2. **Discuss** — review happens on the PR alongside the code (or ahead of it).
3. **Accept** — once agreed, set the status to **Accepted** and merge. Add a row to the index above.
4. **Supersede** — decisions are not edited away. To change one, write a **new** ADR that supersedes it; mark the old one **Superseded by ADR-NNNN** and link both directions.

**Structure (MADR)**

Every ADR contains: **Title**, **Status**, **Context**, **Decision**, **Consequences** (positive and negative/trade-offs), and **Alternatives considered**. Metadata (date, deciders, related links) sits at the top.

**Statuses:** `Proposed` · `Accepted` · `Superseded` · `Deprecated` · `Rejected`.

**When to write one:** any decision that is hard to reverse, affects multiple projects, or that a future contributor would reasonably ask "why is it done this way?" — e.g. framework choices, architectural patterns, auth strategy, data/storage decisions.

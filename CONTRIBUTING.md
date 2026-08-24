# Contributing to FinanceHub

Thanks for contributing! This guide covers our branching model, commit conventions, PR process, code style, and testing expectations.

> Related docs: [Architecture](./docs/architecture.md) · [Development](./docs/development.md) · [Deployment](./docs/deployment.md) · [ADRs](./docs/adr/README.md)

---

## Prerequisites

Node `>= 20.19`, pnpm `>= 10`, Docker. Run `pnpm install` first. See the [Development Guide](./docs/development.md) for full setup.

---

## Branching model

- `main` is always releasable and protected.
- Work happens on **feature branches** cut from `main`, merged back via **Pull Request**.
- Use short, descriptive, type-prefixed branch names:

| Prefix | Example |
|--------|---------|
| `feat/` | `feat/transactions-installments` |
| `fix/` | `fix/refresh-token-rotation` |
| `chore/` | `chore/bump-nx-23` |
| `docs/` | `docs/adr-authentication` |
| `refactor/` | `refactor/accounts-repository` |

Keep branches focused and short-lived. Rebase on `main` to stay current.

---

## Conventional Commits

Commit messages **must** follow the [Conventional Commits](https://www.conventionalcommits.org/) spec. There is no commit hook enforcing it — reviewers do.

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Types

| Type | Use for |
|------|---------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `chore` | Tooling, deps, housekeeping (no src behavior change) |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or fixing tests |
| `ci` | CI configuration and pipelines |
| `build` | Build system, bundler, or packaging changes |
| `perf` | Performance improvements |

### Scopes

Scope is the affected project or feature module, e.g. `web`, `api`, `ui`, `shared-types`, `shared-utils`, `auth`, `users`, `accounts`, `categories`, `transactions`, `budgets`, `goals`, `reports`, `notifications`.

### Examples

```text
feat(transactions): add recurring transaction scheduling
fix(auth): detect refresh-token reuse and revoke the session family
chore(deps): bump prisma to 6.3
docs(architecture): document the dependency rule diagram
refactor(accounts): move balance calc behind the repository interface
test(budgets): cover over-budget threshold notifications
ci(actions): run nx affected on pull requests
build(api): switch api bundling to webpack node target
perf(reports): cache monthly aggregation in redis
```

### Breaking changes

Add a `!` after the type/scope and/or a `BREAKING CHANGE:` footer:

```text
feat(api)!: rename /transactions payload fields

BREAKING CHANGE: `amountCents` replaces `amount`.
```

---

## Pull Request process

1. Branch from `main`, make your change, and keep the scope tight.
2. Run locally before pushing:
   ```bash
   npx nx affected -t lint test typecheck build
   ```
3. Push and open a PR against `main` with a clear description of **what** and **why** (link issues/ADRs).
4. Ensure the **CI pipeline is green** — lint, test, build, typecheck all pass.
5. Address review feedback; keep the branch rebased on `main`.
6. Squash-friendly, Conventional-Commit-compliant history is expected.

---

## Code style

- **TypeScript 5.9, `strict` mode** across all projects.
- Formatting is handled by Prettier — run `pnpm format` (CI checks with `pnpm format:check`).
- Linting via ESLint — run `pnpm lint`. This includes `@nx/enforce-module-boundaries`.
- **Respect the [module boundary matrix](./docs/architecture.md#8-module-boundary-matrix).** A boundary violation fails the build:
  - `scope:web` → web + shared · `scope:api` → api + shared · `scope:shared` → shared only
  - `type:types` → types only · `type:util` → util + types
- **Backend:** follow [Clean Architecture](./docs/architecture.md#3-backend-clean-architecture) — keep the domain framework-free, depend on repository interfaces, isolate Prisma behind repositories. See [ADR-0002](./docs/adr/0002-clean-architecture-backend.md).
- **Frontend:** standalone components, lazy routes, Signals for local state, RxJS for streams, Reactive Forms.
- Share contracts through `@financehub/shared-types` — never duplicate API shapes.

---

## Testing expectations

- **Unit tests (Vitest)** for new/changed logic across all projects.
- **Playwright E2E** (`apps/web-e2e`) for critical user flows.
- Unit-test services against **fake repositories** (no DB), enabled by the interface design.
- Run `npx nx affected -t test` before opening a PR.

---

## When adding a feature

Every feature change should keep the whole system consistent. Before marking a feature done:

1. **Update tests** — unit + integration (+ E2E for user-facing flows).
2. **Update Swagger** — keep the `@nestjs/swagger` decorators and `/api/docs` accurate for any API change.
3. **Update the README** and relevant docs so they reflect reality.
4. **Keep the architecture consistent** — honor Clean Architecture layering, the dependency rule, and the module boundary matrix. If you make a significant architectural decision, add an [ADR](./docs/adr/README.md).

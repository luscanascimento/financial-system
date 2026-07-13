# ADR-0002: Clean Architecture for the NestJS backend

- **Status:** Accepted
- **Date:** Phase 0 (Foundation)
- **Deciders:** FinanceHub engineering
- **Related:** [Architecture §3](../architecture.md#3-backend-clean-architecture) · [ADR-0001](./0001-nx-monorepo.md) · [ADR-0003](./0003-authentication-strategy.md)

## Context

`apps/api` will grow to nine feature modules (Auth, Users, Accounts, Categories, Transactions, Budgets, Goals, Reports, Notifications) across Phases 1–7. Business rules — balances, budgets, installments, recurring transactions, reporting — are the long-lived asset; the frameworks around them (NestJS, Prisma, Redis, MinIO, HTTP) are replaceable details.

We needed an architecture that keeps **business logic testable and independent of frameworks**, isolates the ORM so schema/persistence changes don't ripple outward, and gives every module a **consistent, predictable structure**.

## Decision

Adopt **Clean Architecture** for the backend, with the **dependency rule**: source dependencies point **inward**, and the **domain has no framework dependencies**.

Each feature module is layered:

**Controller → Service (use-cases) → Repository (Prisma-backed) → Domain Models + DTOs + Validators + Mappers.**

Key rules:

- The **domain** (models, repository *interfaces*, validators, mappers) imports no NestJS, Prisma, Express, or Redis.
- **Services** (use-cases) depend on repository **interfaces**, never on `PrismaClient`.
- The **Prisma repository** implements the domain interface and is the *only* place that touches Prisma models for that feature; **mappers** translate rows ↔ domain, so column/schema changes don't leak past the repository.
- Interfaces are bound to implementations via NestJS **Dependency Injection** provider tokens — dependency inversion in practice.

Supporting patterns are applied where they add value: **Repository, Factory, Strategy, Adapter, Builder, Dependency Injection**, and **CQRS** where beneficial (notably read-heavy Reports/Dashboard).

## Consequences

**Positive**

- Services are unit-testable against **in-memory fake repositories** with no database.
- Prisma is fully isolated; swapping persistence or adding read replicas is a repository-local change.
- Every module has the same shape, lowering onboarding and review cost.
- Framework churn (Nest/Prisma upgrades) is contained in outer layers.

**Negative / trade-offs**

- More files and indirection per feature (interfaces, mappers, layered folders) — heavier for trivial CRUD.
- Mapping between Prisma rows, domain models, and DTOs adds boilerplate.
- Requires team discipline; the dependency rule must be enforced in review (and, where possible, lint).

## Alternatives considered

| Option | Why not |
|--------|---------|
| **Transaction Script / anemic services calling Prisma directly** | Fast initially, but couples business logic to the ORM and HTTP; hard to test and prone to leaking persistence concerns everywhere. |
| **Active Record via Prisma models** | Business rules end up on persistence objects; no framework independence; poor unit-testability. |
| **Hexagonal (ports & adapters) as a distinct style** | Essentially the same goals; Clean Architecture's inward dependency rule + repository interfaces already give us ports/adapters, so we standardize on this vocabulary. |
| **Full CQRS + event sourcing everywhere** | Overkill for most modules; we apply CQRS selectively (Reports/Dashboard) rather than as a global mandate. |

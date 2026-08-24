# FinanceHub — Deployment Guide

> How FinanceHub is containerized, configured, and operated.
>
> Related docs: [Architecture](./architecture.md) · [Development](./development.md) · [Contributing](../CONTRIBUTING.md) · [ADRs](./adr/README.md)

---

## 1. Docker Compose topology

The entire platform runs as a set of containers on a shared network. The web container (nginx) serves the built Angular app and proxies API traffic; the API container talks to Postgres and Redis.

```mermaid
graph TD
  subgraph Compose["docker compose network"]
    Web["web (nginx)<br/>8080:80"]
    API["api (NestJS 11)<br/>3000:3000"]
    PG[("postgres:16<br/>5432:5432")]
    Redis[("redis:7<br/>6379:6379")]
  end

  Browser(["Browser"]) --> Web
  Web -->|"/api proxy"| API
  API --> PG
  API --> Redis
```

### 1.1 Port map

| Service | Container | Host mapping | Purpose |
|---------|-----------|--------------|---------|
| web | nginx | `8080:80` | Serves the Angular SPA; proxies to the API |
| api | NestJS 11 | `3000:3000` | REST API under `/api`, Swagger at `/api/docs` |
| postgres | PostgreSQL 16 | `5432:5432` | Primary datastore |
| redis | Redis 7 | `6379:6379` | Distributed rate-limit counters |

---

## 2. The `docker compose up` flow

```bash
cp .env.example .env      # set JWT secrets and any overrides
docker compose up         # build + start the whole stack
```

What happens:

1. **Infrastructure starts** — `postgres` and `redis` come up.
2. **API starts** — validates its environment with `zod`, connects to Postgres (Prisma) and Redis (ioredis), applies migrations, and exposes `/api` (+ `/api/docs`).
3. **Web starts** — nginx serves the built Angular bundle on port 80 (host `8080`) and proxies `/api` to the API container.
4. Health checks gate readiness (see §4) so dependents wait for their dependencies.

Bring it down with `docker compose down` (add `-v` to also drop volumes/data).

---

## 3. Environment configuration

All configuration is via environment variables, documented in **`.env.example`** and validated at API bootstrap with **zod** (the API refuses to start on invalid config).

| Variable | Example / default | Purpose |
|----------|-------------------|---------|
| `NODE_ENV` | `development` / `production` | Runtime mode |
| `PORT` | `3000` | API listen port |
| `API_GLOBAL_PREFIX` | `api` | Global route prefix |
| `CORS_ORIGIN` | `http://localhost:8080` | Allowed browser origin |
| `DATABASE_URL` | `postgresql://financehub:financehub@postgres:5432/financehub?schema=public` | Postgres connection (Prisma) |
| `REDIS_HOST` | `redis` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `JWT_ACCESS_SECRET` | *(set me)* | Signs short-lived access tokens |
| `JWT_ACCESS_TTL` | `15m` | Access token lifetime |
| `JWT_REFRESH_SECRET` | *(set me)* | Signs refresh tokens |
| `JWT_REFRESH_TTL` | `7d` | Refresh token lifetime |
| `THROTTLE_TTL` | `60` | Rate-limit window (seconds) |
| `THROTTLE_LIMIT` | `120` | Max requests per window |

> **Never** reuse the example secrets in production. Generate strong, unique values for `JWT_ACCESS_SECRET` and `ENCRYPTION_KEY`.

---

## 4. Health checks & readiness

Health is exposed via **`@nestjs/terminus`**, which reports the liveness/readiness of the API and its downstream dependencies (PostgreSQL, Redis).

- **Liveness** — the API process is up and responsive.
- **Readiness** — downstream dependencies (DB, Redis) are reachable; used by Compose/orchestrators to gate traffic and startup ordering.

Wire these endpoints into container `healthcheck` blocks and any external load balancer / orchestrator probes so unhealthy instances are not sent traffic.

---

## 5. Running migrations

Schema changes are managed with **Prisma Migrate** and versioned in the repository.

- On startup/deploy, apply committed migrations before serving traffic (`prisma migrate deploy` in production, `prisma migrate dev` while developing schema locally).
- Never edit an already-applied migration; add a new one.
- Migrations should be **backward compatible** for zero-downtime deploys (expand → migrate → contract).

See [Architecture §5](./architecture.md#5-data-caching-and-storage-strategy) for how persistence is isolated behind repositories.

---

## 6. Production considerations

| Area | Guidance |
|------|----------|
| **Secrets** | Inject `JWT_*` and `ENCRYPTION_KEY` from a secrets manager, not `.env`. Rotate regularly. |
| **TLS** | Terminate HTTPS at the edge/load balancer and lock `CORS_ORIGIN` to the real web origin. |
| **Scaling** | The API holds no in-process session state (refresh tokens live in Postgres, rate-limit counters in Redis), so it scales horizontally behind a load balancer. Postgres scales vertically with read replicas as needed. |
| **Rate limiting** | Tune `THROTTLE_TTL` / `THROTTLE_LIMIT` for production traffic; back the throttler with Redis for multi-instance correctness. |
| **Backups** | Regular automated Postgres backups (PITR where possible). Test restores. |
| **Observability** | Ship structured logs and health/metrics to your monitoring stack; alert on readiness failures and error-rate spikes. |
| **Config validation** | The zod env schema fails fast on misconfiguration — surface those errors in deploy logs. |

---

## 7. CI/CD overview

CI runs on **GitHub Actions**.

- **PR pipeline** — runs **lint, test, build, typecheck** (Nx `affected` keeps it fast).
- **Docker image workflow** — a **separate** workflow builds and publishes container images.
- Merges require a green pipeline and passing review (see [Contributing](../CONTRIBUTING.md#pull-request-process)).

```mermaid
graph LR
  PR["Pull Request"] --> Lint["lint"]
  PR --> Test["test"]
  PR --> Build["build"]
  PR --> TC["typecheck"]
  Lint --> Merge["Merge to main"]
  Test --> Merge
  Build --> Merge
  TC --> Merge
  Merge --> Img["Docker image workflow<br/>(separate)"]
  Img --> Deploy["Deploy"]
```

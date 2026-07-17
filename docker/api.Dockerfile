# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 — build the NestJS application with the full workspace toolchain.
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# OpenSSL is required by Prisma's query engine.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable

WORKDIR /workspace

# Install dependencies against the committed lockfile for reproducible builds.
COPY . .
RUN pnpm install --frozen-lockfile

# Generate the Prisma client and compile the API (webpack, generatePackageJson).
RUN pnpm prisma:generate \
  && pnpm exec nx build api --configuration=production

# ---------------------------------------------------------------------------
# Stage 2 — slim production runtime.
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# OpenSSL is required by Prisma's query engine at runtime.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable

WORKDIR /app

# Compiled app + the pruned package.json that Nx generated for it.
COPY --from=builder /workspace/dist/apps/api ./
# Prisma schema & migrations are needed to run `migrate deploy` at startup.
COPY --from=builder /workspace/apps/api/prisma ./prisma

# Install only the runtime dependencies declared by the generated manifest,
# plus the Prisma CLI used by the entrypoint to apply migrations. The runtime
# stage ships only Nx's pruned single-package manifest (no workspace lockfile),
# so a frozen install does not apply here; the Prisma CLI is pinned to the exact
# @prisma/client version to keep client and CLI in lock-step across rebuilds.
RUN pnpm install --prod --no-frozen-lockfile \
  && pnpm add prisma@6.19.3 \
  && pnpm exec prisma generate --schema=./prisma/schema.prisma \
  && pnpm store prune

COPY docker/api-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Run as the unprivileged user shipped with the node image.
USER node

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

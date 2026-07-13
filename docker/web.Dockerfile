# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 — build the Angular application.
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /workspace

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec nx build web --configuration=production

# ---------------------------------------------------------------------------
# Stage 2 — serve the static bundle with nginx and proxy /api to the API.
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/dist/apps/web/browser /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

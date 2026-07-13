/**
 * Runtime environment settings.
 *
 * The web app always talks to the API through the `/api` prefix on its own
 * origin. In development the Angular dev-server proxies `/api` to
 * `http://localhost:3000` (see `proxy.conf.json`); in production nginx proxies
 * `/api` to the `api` container. This keeps a single, environment-agnostic URL.
 */
export const environment = {
  production: false,
  apiBaseUrl: '/api',
} as const;

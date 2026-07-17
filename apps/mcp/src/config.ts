/**
 * MCP server configuration, read from the environment.
 *
 * The server authenticates to the FinanceHub REST API on the user's behalf.
 * Provide either a long-lived access token or (more commonly for local use)
 * email + password credentials, which the client exchanges for a token and
 * refreshes automatically.
 */
export interface McpConfig {
  /** Base URL of the FinanceHub API, including the global prefix. */
  apiBaseUrl: string;
  /** Optional pre-issued bearer token (skips the login flow). */
  accessToken?: string;
  /** Credentials used to log in when no access token is supplied. */
  email?: string;
  password?: string;
  /** Per-request outbound timeout, in milliseconds. */
  requestTimeoutMs: number;
}

/** Default outbound request timeout (ms). */
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Validates and normalizes the configured API base URL. Only `http:`/`https:`
 * are allowed, so a misconfigured `FINANCEHUB_API_URL` can't turn the client
 * into a request forwarder for arbitrary schemes (`file:`, `gopher:`, …).
 */
function normalizeApiBaseUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`FINANCEHUB_API_URL is not a valid URL: ${raw}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `FINANCEHUB_API_URL must use http or https (got ${parsed.protocol}).`,
    );
  }
  return raw.replace(/\/+$/, '');
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  // Only the API URL has a default. Credentials are pure passthroughs so no
  // secrets are baked into the bundle and a missing configuration surfaces a
  // clear "no credentials" error rather than a phantom login. Point the demo
  // values from `.env`/the client config (see the repo `.env.example`).
  const timeout = Number(env.FINANCEHUB_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  return {
    apiBaseUrl: normalizeApiBaseUrl(
      env.FINANCEHUB_API_URL ?? 'http://localhost:3000/api',
    ),
    accessToken: env.FINANCEHUB_ACCESS_TOKEN,
    email: env.FINANCEHUB_EMAIL,
    password: env.FINANCEHUB_PASSWORD,
    requestTimeoutMs:
      Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS,
  };
}

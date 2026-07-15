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
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  // Only the API URL has a default. Credentials are pure passthroughs so no
  // secrets are baked into the bundle and a missing configuration surfaces a
  // clear "no credentials" error rather than a phantom login. Point the demo
  // values from `.env`/the client config (see the repo `.env.example`).
  return {
    apiBaseUrl: (env.FINANCEHUB_API_URL ?? 'http://localhost:3000/api').replace(
      /\/+$/,
      '',
    ),
    accessToken: env.FINANCEHUB_ACCESS_TOKEN,
    email: env.FINANCEHUB_EMAIL,
    password: env.FINANCEHUB_PASSWORD,
  };
}

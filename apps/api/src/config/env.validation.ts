import { z } from 'zod';

/**
 * Runtime schema for all environment variables the API consumes.
 *
 * The schema is the single source of truth for configuration: it coerces raw
 * string values into their proper types and fails fast (at boot) with a
 * human-readable error when the environment is misconfigured. Secrets fall back
 * to insecure development defaults so the stack boots out-of-the-box, but those
 * defaults are rejected when `NODE_ENV=production`.
 */
export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    API_GLOBAL_PREFIX: z.string().min(1).default('api'),
    // One or more allowed CORS origins, comma-separated.
    CORS_ORIGIN: z.string().default('http://localhost:8080'),
    // Number of reverse-proxy hops to trust for `req.ip` / `X-Forwarded-*`.
    // `0` disables proxy trust (correct for local dev with no proxy); the
    // bundled nginx deployment sets this to `1`. Never trust blindly — a value
    // higher than the real hop count lets clients spoof their forwarded IP.
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
    // Per-request timeout (ms). Slow/hung requests are aborted so they cannot
    // pile up and exhaust the event loop.
    REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    // Maximum accepted request body size (any `bytes`-parseable string).
    BODY_LIMIT: z.string().default('1mb'),
    // Explicitly expose Swagger/OpenAPI docs. Unset ⇒ enabled outside production.
    SWAGGER_ENABLED: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) =>
        value === undefined ? undefined : value === 'true',
      ),
    // Base URL of the web app, used to build links in outbound emails.
    APP_WEB_URL: z.string().url().default('http://localhost:8080'),

    // Cryptography (data-at-rest encryption + optional password pepper)
    ENCRYPTION_KEY: z
      .string()
      .min(32)
      .default('dev-encryption-key-change-me-32-characters!!'),
    // Optional application-side pepper mixed into Argon2id. Once set it must
    // remain stable — changing it invalidates every existing password hash.
    PASSWORD_PEPPER: z.string().min(16).optional(),

    // Multi-factor authentication
    MFA_ISSUER: z.string().min(1).default('FinanceHub'),

    // Persistence
    DATABASE_URL: z
      .string()
      .url()
      .default(
        'postgresql://financehub:financehub@localhost:5432/financehub?schema=public',
      ),

    // Cache
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().int().positive().default(6379),
    REDIS_PASSWORD: z.string().optional(),

    // Authentication (consumed from Phase 1 onwards)
    JWT_ACCESS_SECRET: z
      .string()
      .min(16)
      .default('dev-access-secret-change-me-32-characters'),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(16)
      .default('dev-refresh-secret-change-me-32-characters'),
    JWT_REFRESH_TTL: z.string().default('7d'),

    // Rate limiting
    THROTTLE_TTL: z.coerce.number().int().positive().default(60),
    THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') {
      return;
    }
    // Guard against shipping development secrets to production.
    const insecure: Array<[keyof typeof env, string]> = [
      ['JWT_ACCESS_SECRET', 'dev-access-secret-change-me-32-characters'],
      ['JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me-32-characters'],
      ['ENCRYPTION_KEY', 'dev-encryption-key-change-me-32-characters!!'],
    ];
    for (const [key, devDefault] of insecure) {
      if (env[key] === devDefault) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must be overridden with a strong secret in production`,
        });
      }
    }
    // The development DATABASE_URL ships weak, well-known credentials.
    if (env.DATABASE_URL.includes('financehub:financehub@')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message:
          'DATABASE_URL must use strong credentials in production (not the financehub:financehub dev default)',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/**
 * Validates `process.env` against {@link envSchema}. Used as the `validate`
 * hook of `@nestjs/config` so misconfiguration aborts startup immediately.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const details = result.error.issues
      .map(
        (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`,
      )
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return result.data;
}

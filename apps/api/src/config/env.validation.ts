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
    CORS_ORIGIN: z.string().default('http://localhost:8080'),

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

    // Object storage (MinIO / S3-compatible)
    MINIO_ENDPOINT: z.string().default('localhost'),
    MINIO_PORT: z.coerce.number().int().positive().default(9000),
    MINIO_ACCESS_KEY: z.string().default('financehub'),
    MINIO_SECRET_KEY: z.string().default('financehub-secret'),
    MINIO_BUCKET: z.string().default('financehub'),
    MINIO_USE_SSL: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') {
      return;
    }
    // Guard against shipping development secrets to production.
    const insecure: Array<[keyof typeof env, string]> = [
      ['JWT_ACCESS_SECRET', 'dev-access-secret-change-me-32-characters'],
      ['JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me-32-characters'],
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
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return result.data;
}

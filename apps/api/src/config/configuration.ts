import { validateEnv, type Env } from './env.validation';

/**
 * Strongly-typed, namespaced application configuration.
 *
 * The nested shape lets consumers read values with dotted keys via
 * `ConfigService`, e.g. `configService.getOrThrow('app.port', { infer: true })`.
 */
export interface AppConfiguration {
  app: {
    nodeEnv: Env['NODE_ENV'];
    port: number;
    globalPrefix: string;
    /** Allowed CORS origins, parsed from the comma-separated env var. */
    corsOrigins: string[];
    trustProxy: number;
    requestTimeoutMs: number;
    bodyLimit: string;
    swaggerEnabled: boolean;
    webUrl: string;
    isProduction: boolean;
  };
  security: {
    encryptionKey: string;
    passwordPepper?: string;
  };
  mfa: {
    issuer: string;
  };
  database: {
    url: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  jwt: {
    accessSecret: string;
    accessTtl: string;
    refreshSecret: string;
    refreshTtl: string;
  };
  throttle: {
    ttl: number;
    limit: number;
  };
}

/**
 * `@nestjs/config` load factory. Reads the already-validated environment and
 * maps it into the namespaced {@link AppConfiguration} object.
 */
export function loadConfiguration(): AppConfiguration {
  const env = validateEnv(process.env);

  return {
    app: {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      globalPrefix: env.API_GLOBAL_PREFIX,
      corsOrigins: env.CORS_ORIGIN.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
      trustProxy: env.TRUST_PROXY,
      requestTimeoutMs: env.REQUEST_TIMEOUT_MS,
      bodyLimit: env.BODY_LIMIT,
      // Docs are on by default outside production; opt in explicitly for prod.
      swaggerEnabled: env.SWAGGER_ENABLED ?? env.NODE_ENV !== 'production',
      webUrl: env.APP_WEB_URL,
      isProduction: env.NODE_ENV === 'production',
    },
    security: {
      encryptionKey: env.ENCRYPTION_KEY,
      passwordPepper: env.PASSWORD_PEPPER,
    },
    mfa: {
      issuer: env.MFA_ISSUER,
    },
    database: {
      url: env.DATABASE_URL,
    },
    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
    },
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      accessTtl: env.JWT_ACCESS_TTL,
      refreshSecret: env.JWT_REFRESH_SECRET,
      refreshTtl: env.JWT_REFRESH_TTL,
    },
    throttle: {
      ttl: env.THROTTLE_TTL,
      limit: env.THROTTLE_LIMIT,
    },
  };
}

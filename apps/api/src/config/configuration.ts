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
    corsOrigin: string;
    isProduction: boolean;
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
  storage: {
    endpoint: string;
    port: number;
    accessKey: string;
    secretKey: string;
    bucket: string;
    useSsl: boolean;
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
      corsOrigin: env.CORS_ORIGIN,
      isProduction: env.NODE_ENV === 'production',
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
    storage: {
      endpoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
      bucket: env.MINIO_BUCKET,
      useSsl: env.MINIO_USE_SSL,
    },
  };
}

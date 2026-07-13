import { describe, expect, it } from 'vitest';

import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const base = {
    DATABASE_URL:
      'postgresql://financehub:financehub@localhost:5432/financehub?schema=public',
  };

  it('applies sensible defaults for optional variables', () => {
    const env = validateEnv({ ...base });

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.API_GLOBAL_PREFIX).toBe('api');
    expect(env.THROTTLE_LIMIT).toBe(120);
  });

  it('coerces numeric and boolean strings to their real types', () => {
    const env = validateEnv({
      ...base,
      PORT: '4000',
      REDIS_PORT: '6380',
      MINIO_USE_SSL: 'true',
    });

    expect(env.PORT).toBe(4000);
    expect(env.REDIS_PORT).toBe(6380);
    expect(env.MINIO_USE_SSL).toBe(true);
  });

  it('rejects an invalid DATABASE_URL', () => {
    expect(() => validateEnv({ DATABASE_URL: 'not-a-url' })).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('rejects development JWT secrets in production', () => {
    expect(() =>
      validateEnv({ ...base, NODE_ENV: 'production' }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('accepts strong secrets in production', () => {
    const env = validateEnv({
      ...base,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'a-sufficiently-long-access-secret-value',
      JWT_REFRESH_SECRET: 'a-sufficiently-long-refresh-secret-value',
    });

    expect(env.NODE_ENV).toBe('production');
  });
});

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
    expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });

  it('rejects the development encryption key in production', () => {
    expect(() =>
      validateEnv({
        ...prodBase,
        ENCRYPTION_KEY: 'dev-encryption-key-change-me-32-characters!!',
      }),
    ).toThrow(/ENCRYPTION_KEY/);
  });

  it('rejects weak datastore credentials in production', () => {
    expect(() =>
      validateEnv({
        ...prodBase,
        DATABASE_URL:
          'postgresql://financehub:financehub@localhost:5432/financehub?schema=public',
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('parses the TOTP secret encryption pepper knobs with defaults', () => {
    const env = validateEnv({ ...base });

    expect(env.TRUST_PROXY).toBe(0);
    expect(env.MFA_ISSUER).toBe('FinanceHub');
    expect(env.ENCRYPTION_KEY.length).toBeGreaterThanOrEqual(32);
  });

  it('accepts strong secrets in production', () => {
    const env = validateEnv({ ...prodBase });

    expect(env.NODE_ENV).toBe('production');
  });
});

/** A fully production-safe environment (no dev defaults tripped). */
const prodBase = {
  NODE_ENV: 'production',
  DATABASE_URL:
    'postgresql://app:sTr0ng-Passw0rd@db.internal:5432/financehub?schema=public',
  JWT_ACCESS_SECRET: 'a-sufficiently-long-access-secret-value',
  JWT_REFRESH_SECRET: 'a-sufficiently-long-refresh-secret-value',
  ENCRYPTION_KEY: 'a-sufficiently-long-encryption-key-value-32+',
  MINIO_SECRET_KEY: 'a-strong-object-storage-secret-value',
};

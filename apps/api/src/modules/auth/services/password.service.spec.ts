import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import type { AppConfiguration } from '../../../config/configuration';
import { PasswordService } from './password.service';

/** Builds a PasswordService whose config returns the given pepper (or none). */
function makeService(pepper?: string): PasswordService {
  const config = {
    get: () => pepper,
  } as unknown as ConfigService<AppConfiguration, true>;
  return new PasswordService(config);
}

describe('PasswordService', () => {
  const service = makeService();

  it('hashes a password to an argon2id digest', async () => {
    const hash = await service.hash('S3cure-pass!');
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it('verifies a correct password', async () => {
    const hash = await service.hash('S3cure-pass!');
    await expect(service.verify(hash, 'S3cure-pass!')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('S3cure-pass!');
    await expect(service.verify(hash, 'wrong')).resolves.toBe(false);
  });

  it('returns false for a malformed hash instead of throwing', async () => {
    await expect(service.verify('not-a-hash', 'whatever')).resolves.toBe(false);
  });

  it('applies a pepper so a peppered hash fails to verify without it', async () => {
    const peppered = makeService('a-stable-application-pepper-value');
    const hash = await peppered.hash('S3cure-pass!');

    await expect(peppered.verify(hash, 'S3cure-pass!')).resolves.toBe(true);
    // The same password, verified without the pepper, must NOT match.
    await expect(service.verify(hash, 'S3cure-pass!')).resolves.toBe(false);
  });
});

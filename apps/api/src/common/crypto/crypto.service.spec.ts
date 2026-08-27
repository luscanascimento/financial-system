import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import type { AppConfiguration } from '../../config/configuration';
import { CryptoService } from './crypto.service';

function makeService(
  key = 'a-fixed-test-encryption-key-that-is-long',
): CryptoService {
  const config = {
    get: () => key,
  } as unknown as ConfigService<AppConfiguration, true>;
  return new CryptoService(config);
}

describe('CryptoService', () => {
  const crypto = makeService();

  it('round-trips plaintext through AES-256-GCM', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const envelope = crypto.encrypt(secret);

    expect(envelope).not.toContain(secret);
    expect(crypto.isEncrypted(envelope)).toBe(true);
    expect(crypto.decrypt(envelope)).toBe(secret);
  });

  it('produces a distinct ciphertext each call (random IV)', () => {
    const a = crypto.encrypt('same');
    const b = crypto.encrypt('same');

    expect(a).not.toBe(b);
    expect(crypto.decrypt(a)).toBe('same');
    expect(crypto.decrypt(b)).toBe('same');
  });

  it('rejects tampered ciphertext (authentication tag)', () => {
    const envelope = crypto.encrypt('secret');
    const parts = envelope.split(':');
    // Flip a byte in the ciphertext segment.
    const tampered = Buffer.from(parts[4], 'base64');
    tampered[0] ^= 0xff;
    parts[4] = tampered.toString('base64');

    expect(() => crypto.decrypt(parts.join(':'))).toThrow();
  });

  it('fails to decrypt with a different key', () => {
    const envelope = crypto.encrypt('secret');
    const other = makeService('an-entirely-different-encryption-key-value');

    expect(() => other.decrypt(envelope)).toThrow();
  });

  it('rejects a plaintext value as an envelope', () => {
    expect(crypto.isEncrypted('GEZDGNBVGY3TQOJQ')).toBe(false);
    expect(() => crypto.decrypt('GEZDGNBVGY3TQOJQ')).toThrow();
  });
});

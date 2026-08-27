import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfiguration } from '../../config/configuration';

/**
 * Authenticated symmetric encryption for sensitive data at rest (e.g. TOTP
 * secrets), using AES-256-GCM.
 *
 * The 256-bit key is derived deterministically from the high-entropy
 * `ENCRYPTION_KEY` secret via SHA-256, so operators can supply a passphrase of
 * any length. Each ciphertext carries a fresh random 96-bit IV and the GCM
 * authentication tag, serialized as a self-describing, versioned string:
 *
 *     enc:v1:<iv-b64>:<tag-b64>:<ciphertext-b64>
 *
 * The version prefix lets {@link isEncrypted} distinguish encrypted payloads
 * from legacy plaintext, enabling transparent, lazy migration of existing rows.
 */
@Injectable()
export class CryptoService {
  private static readonly PREFIX = 'enc:v1';
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_BYTES = 12;

  private readonly key: Buffer;

  constructor(configService: ConfigService<AppConfiguration, true>) {
    const secret = configService.get('security.encryptionKey', { infer: true });
    // Derive a fixed-length 32-byte key from the configured secret. SHA-256 is
    // an appropriate KDF here because the input is a high-entropy secret, not a
    // low-entropy user password.
    this.key = createHash('sha256').update(secret, 'utf8').digest();
  }

  /** Encrypts `plaintext` into the versioned `enc:v1:…` envelope. */
  encrypt(plaintext: string): string {
    const iv = randomBytes(CryptoService.IV_BYTES);
    const cipher = createCipheriv(CryptoService.ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      CryptoService.PREFIX,
      iv.toString('base64'),
      tag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  /**
   * Decrypts a value produced by {@link encrypt}. Throws if the payload is not
   * a well-formed envelope or fails authentication (tampering / wrong key).
   */
  decrypt(payload: string): string {
    if (!this.isEncrypted(payload)) {
      throw new Error(
        'CryptoService.decrypt: value is not an encrypted envelope',
      );
    }
    const [, , ivB64, tagB64, ctB64] = payload.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const ciphertext = Buffer.from(ctB64, 'base64');
    const decipher = createDecipheriv(CryptoService.ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }

  /** True when `value` is one of this service's `enc:v1:…` envelopes. */
  isEncrypted(value: string | null | undefined): value is string {
    return (
      typeof value === 'string' &&
      value.startsWith(`${CryptoService.PREFIX}:`) &&
      value.split(':').length === 5
    );
  }

  /** Constant-time comparison of two UTF-8 strings (avoids timing oracles). */
  static safeEquals(a: string, b: string): boolean {
    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');
    if (bufferA.length !== bufferB.length) {
      return false;
    }
    return timingSafeEqual(bufferA, bufferB);
  }
}

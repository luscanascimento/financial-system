import { describe, expect, it } from 'vitest';

import {
  base32Decode,
  base32Encode,
  generateHotp,
  generateSecret,
  totpUri,
  verifyTotp,
} from './totp';

// RFC 6238 Appendix B reference secret: the ASCII string "12345678901234567890"
// (20 bytes), which the RFC uses for its SHA-1 test-vector table.
const RFC_SECRET_ASCII = '12345678901234567890';
const RFC_SECRET_BASE32 = base32Encode(Buffer.from(RFC_SECRET_ASCII, 'ascii'));

describe('totp', () => {
  describe('base32', () => {
    it('round-trips arbitrary bytes', () => {
      const bytes = Buffer.from(RFC_SECRET_ASCII, 'ascii');
      expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
    });

    it('decodes the RFC secret back to its ASCII bytes', () => {
      expect(base32Decode(RFC_SECRET_BASE32).toString('ascii')).toBe(
        RFC_SECRET_ASCII,
      );
    });
  });

  describe('generateHotp', () => {
    // RFC 4226 Appendix D truncated 6-digit HOTP values for the same secret.
    const rfc4226 = [
      '755224',
      '287082',
      '359152',
      '969429',
      '338314',
      '254676',
      '287922',
      '162583',
      '399871',
      '520489',
    ];

    it.each(rfc4226.map((code, counter) => [counter, code]))(
      'matches the RFC 4226 vector at counter %i',
      (counter, expected) => {
        expect(generateHotp(RFC_SECRET_BASE32, counter as number)).toBe(
          expected,
        );
      },
    );
  });

  describe('verifyTotp', () => {
    it('accepts the RFC 6238 code for T=59s (287082)', () => {
      // T0=0, step=30s -> counter=1 at 59s; the RFC 8-digit value is 94287082,
      // whose 6-digit truncation is 287082.
      expect(verifyTotp(RFC_SECRET_BASE32, '287082', 0, 59_000)).toBe(true);
    });

    it('rejects an incorrect code', () => {
      expect(verifyTotp(RFC_SECRET_BASE32, '000000', 0, 59_000)).toBe(false);
    });

    it('rejects non-numeric input', () => {
      expect(verifyTotp(RFC_SECRET_BASE32, 'abc123', 1, 59_000)).toBe(false);
    });

    it('tolerates one step of clock drift within the window', () => {
      // 89s -> counter=2; the previous step (counter=1, "287082") is still
      // accepted with a ±1 window.
      expect(verifyTotp(RFC_SECRET_BASE32, '287082', 1, 89_000)).toBe(true);
    });
  });

  describe('generateSecret / totpUri', () => {
    it('produces a decodable Base32 secret', () => {
      const secret = generateSecret();
      expect(() => base32Decode(secret)).not.toThrow();
      expect(secret).toMatch(/^[A-Z2-7]+$/);
    });

    it('builds a provisioning URI carrying the secret and issuer', () => {
      const uri = totpUri(
        'JBSWY3DPEHPK3PXP',
        'jane@financehub.dev',
        'FinanceHub',
      );
      expect(uri).toContain('otpauth://totp/');
      expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
      expect(uri).toContain('issuer=FinanceHub');
    });
  });
});

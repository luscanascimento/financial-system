import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Pure RFC 6238 (TOTP) / RFC 4226 (HOTP) helpers built on Node's `crypto`.
 *
 * Secrets are handled as Base32 (RFC 4648, no padding) strings — the encoding
 * authenticator apps expect in an `otpauth://` URI. No external dependency.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const DEFAULT_DIGITS = 6;
const DEFAULT_PERIOD = 30;

/** Generates a new random Base32 TOTP secret (20 bytes = 160 bits by default). */
export function generateSecret(byteLength = 20): string {
  return base32Encode(randomBytes(byteLength));
}

/**
 * Builds the `otpauth://totp/...` provisioning URI consumed by authenticator
 * apps (and QR-code generators on the client).
 */
export function totpUri(
  secret: string,
  account: string,
  issuer: string,
): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DEFAULT_DIGITS),
    period: String(DEFAULT_PERIOD),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * Verifies a candidate `code` against `secret`, tolerating clock drift of
 * `±window` steps around the current time. Returns `true` on a match.
 */
export function verifyTotp(
  secret: string,
  code: string,
  window = 1,
  atMs: number = Date.now(),
): boolean {
  const normalized = code.trim();
  if (!/^\d+$/.test(normalized)) {
    return false;
  }
  const counter = Math.floor(atMs / 1000 / DEFAULT_PERIOD);
  for (let offset = -window; offset <= window; offset += 1) {
    const expected = generateHotp(secret, counter + offset);
    if (
      constantTimeEquals(expected, normalized.padStart(DEFAULT_DIGITS, '0'))
    ) {
      return true;
    }
  }
  return false;
}

/** Computes the HOTP value (RFC 4226) for a Base32 secret and counter. */
export function generateHotp(
  secret: string,
  counter: number,
  digits = DEFAULT_DIGITS,
): string {
  const key = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  // Write the 64-bit counter big-endian (safe for values within 2^53).
  buffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return (binary % 10 ** digits).toString().padStart(digits, '0');
}

/** RFC 4648 Base32 encoding (no padding), uppercase. */
export function base32Encode(data: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/** RFC 4648 Base32 decoding, tolerant of padding, whitespace and case. */
export function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base32 character: ${char}`);
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Length-safe, timing-safe string comparison. */
function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}

import { describe, expect, it } from 'vitest';

import { formatMoney, majorToMinor, minorToMajor } from './money';

describe('money helpers', () => {
  it('converts between minor and major units', () => {
    expect(minorToMajor(12345)).toBe(123.45);
    expect(majorToMinor(123.45)).toBe(12345);
  });

  it('rounds major-to-minor conversions to avoid float drift', () => {
    expect(majorToMinor(0.1 + 0.2)).toBe(30);
  });

  it('uses the ISO 4217 exponent, not a hardcoded 100', () => {
    // JPY has no minor unit: 1000 minor units is ¥1,000, not ¥10.
    expect(minorToMajor(1000, 'JPY')).toBe(1000);
    expect(majorToMinor(1000, 'JPY')).toBe(1000);
    expect(formatMoney(1000, 'JPY', 'en-US')).toContain('1,000');

    // KWD has three: 1234 minor units is 1.234 dinar.
    expect(minorToMajor(1234, 'KWD')).toBe(1.234);
    expect(majorToMinor(1.234, 'KWD')).toBe(1234);
    expect(formatMoney(1234, 'KWD', 'en-US')).toContain('1.234');
  });

  it('falls back to two decimals for a malformed currency code', () => {
    expect(minorToMajor(4599, 'not-a-code')).toBe(45.99);
  });

  it('formats minor units as a localized currency string', () => {
    // Non-breaking spaces vary by runtime; assert on the significant parts.
    const formatted = formatMoney(199999, 'USD', 'en-US');
    expect(formatted).toContain('$');
    expect(formatted).toContain('1,999.99');
  });
});

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

  it('formats minor units as a localized currency string', () => {
    // Non-breaking spaces vary by runtime; assert on the significant parts.
    const formatted = formatMoney(199999, 'USD', 'en-US');
    expect(formatted).toContain('$');
    expect(formatted).toContain('1,999.99');
  });
});

import { describe, expect, it } from 'vitest';

import { parseDurationMs } from './duration';

describe('parseDurationMs', () => {
  it.each([
    ['500ms', 500],
    ['30s', 30_000],
    ['15m', 900_000],
    ['12h', 43_200_000],
    ['7d', 604_800_000],
  ])('parses %s', (input, expected) => {
    expect(parseDurationMs(input)).toBe(expected);
  });

  it('throws on invalid input', () => {
    expect(() => parseDurationMs('7 days')).toThrow(/Invalid duration/);
    expect(() => parseDurationMs('abc')).toThrow(/Invalid duration/);
  });
});

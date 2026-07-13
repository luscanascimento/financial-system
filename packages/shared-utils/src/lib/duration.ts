/**
 * Parses a short duration string (e.g. `15m`, `7d`, `30s`, `12h`) into
 * milliseconds. Used to derive concrete expiry timestamps from TTL config such
 * as `JWT_REFRESH_TTL`.
 *
 * Supported units: `ms`, `s`, `m`, `h`, `d`.
 * @throws if the input is not a recognized duration.
 */
const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDurationMs(input: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid duration: "${input}"`);
  }
  const [, value, unit] = match;
  return Number(value) * UNIT_MS[unit];
}

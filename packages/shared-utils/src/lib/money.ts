/**
 * Monetary helpers. FinanceHub stores money as an integer number of **minor
 * units** to avoid floating-point rounding errors. These helpers convert
 * to/from the display representation.
 *
 * The minor-unit exponent is *not* always 2: JPY has 0 (¥1000 is 1000 minor
 * units, not ¥10) and KWD has 3. It is read from ICU via `Intl` rather than
 * from a hand-maintained table.
 */

const DEFAULT_CURRENCY = 'USD';

/** ISO 4217 minor-unit factor for `currency` (JPY → 1, USD → 100, KWD → 1000). */
function minorUnitFactor(currency: string): number {
  let digits = 2;
  try {
    digits =
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    // Not a well-formed currency code: fall back to the 2-digit majority
    // rather than blowing up a whole rendered table.
  }
  return 10 ** digits;
}

/** Converts minor units to a major-unit number (e.g. `4599` USD → `45.99`). */
export function minorToMajor(
  amountMinor: number,
  currency: string = DEFAULT_CURRENCY,
): number {
  return amountMinor / minorUnitFactor(currency);
}

/** Converts a major-unit amount to integer minor units. */
export function majorToMinor(
  amountMajor: number,
  currency: string = DEFAULT_CURRENCY,
): number {
  return Math.round(amountMajor * minorUnitFactor(currency));
}

/**
 * Formats an amount in minor units as a localized currency string.
 *
 * @param amountMinor Integer amount in minor units.
 * @param currency    ISO 4217 currency code (e.g. `USD`, `EUR`, `BRL`).
 * @param locale      BCP 47 locale tag; defaults to `en-US`.
 */
export function formatMoney(
  amountMinor: number,
  currency: string,
  locale = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(minorToMajor(amountMinor, currency));
}

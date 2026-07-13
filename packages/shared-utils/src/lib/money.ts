/**
 * Monetary helpers. FinanceHub stores money as an integer number of **minor
 * units** (e.g. cents) to avoid floating-point rounding errors. These helpers
 * convert to/from the display representation.
 */

/** Converts minor units (cents) to a major-unit number (dollars). */
export function minorToMajor(amountMinor: number): number {
  return amountMinor / 100;
}

/** Converts a major-unit amount to integer minor units. */
export function majorToMinor(amountMajor: number): number {
  return Math.round(amountMajor * 100);
}

/**
 * Formats an amount in minor units as a localized currency string.
 *
 * @param amountMinor Integer amount in minor units (cents).
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
  }).format(minorToMajor(amountMinor));
}

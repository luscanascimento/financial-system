/**
 * Shared validation bounds for the financial domain.
 *
 * Monetary values are stored as a signed 32-bit Postgres `INT` of minor units,
 * so amounts must stay within the signed 32-bit range or the write fails (or,
 * worse, silently overflows). DTOs cap amounts at these bounds up front.
 */

/** Largest value a signed 32-bit Postgres INT column can hold. */
export const MAX_MINOR_AMOUNT = 2_147_483_647;

/** Smallest value a signed 32-bit Postgres INT column can hold. */
export const MIN_MINOR_AMOUNT = -2_147_483_648;

/**
 * Upper bound on installment legs. Each leg is a row written inside one DB
 * transaction, so an unbounded value is a DoS / data-bloat vector. 120 legs
 * (ten years of monthly installments) is well beyond any real use.
 */
export const MAX_INSTALLMENTS = 120;

/** Maximum length for free-text search parameters. */
export const MAX_SEARCH_LENGTH = 100;

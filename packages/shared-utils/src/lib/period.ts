import type { BudgetPeriod } from '@financehub/shared-types';

/**
 * Date-range helpers for recurring financial periods (budgets, cash-flow
 * buckets, reports). All functions are pure and operate in UTC to stay
 * deterministic regardless of server timezone.
 */

export interface DateRange {
  /** Inclusive start of the range. */
  start: Date;
  /** Exclusive end of the range. */
  end: Date;
}

function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/** First instant of the UTC month containing `date`. */
export function startOfMonth(date: Date): Date {
  return utc(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

/** First instant of the month after the one containing `date`. */
export function startOfNextMonth(date: Date): Date {
  return utc(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

/** Adds `count` calendar months (may be negative), clamping the day of month. */
export function addMonths(date: Date, count: number): Date {
  const target = utc(date.getUTCFullYear(), date.getUTCMonth() + count, 1);
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return target;
}

/** Adds `count` days (may be negative). */
export function addDays(date: Date, count: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + count);
  return copy;
}

/** Start of the ISO week (Monday, 00:00 UTC) containing `date`. */
export function startOfWeek(date: Date): Date {
  const day = date.getUTCDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // days since Monday
  return addDays(startOfDay(date), -diff);
}

/** First instant of the UTC day containing `date`. */
export function startOfDay(date: Date): Date {
  return utc(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Computes the [start, end) bounds of the {@link BudgetPeriod} that contains
 * `reference`, anchored at `anchor` (the period's start date). Weekly/monthly/
 * yearly periods align to `anchor`'s day/date.
 */
export function periodBounds(
  period: BudgetPeriod,
  anchor: Date,
  reference: Date = new Date(),
): DateRange {
  switch (period) {
    case 'WEEKLY': {
      const anchorStart = startOfDay(anchor);
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const elapsed = startOfDay(reference).getTime() - anchorStart.getTime();
      const periods = Math.floor(elapsed / msPerWeek);
      const start = addDays(anchorStart, periods * 7);
      return { start, end: addDays(start, 7) };
    }
    case 'YEARLY': {
      const year =
        reference.getUTCFullYear() -
        (reference.getUTCMonth() < anchor.getUTCMonth() ||
        (reference.getUTCMonth() === anchor.getUTCMonth() &&
          reference.getUTCDate() < anchor.getUTCDate())
          ? 1
          : 0);
      const start = utc(year, anchor.getUTCMonth(), anchor.getUTCDate());
      return {
        start,
        end: utc(year + 1, anchor.getUTCMonth(), anchor.getUTCDate()),
      };
    }
    case 'MONTHLY':
    default: {
      const start =
        reference.getUTCDate() < anchor.getUTCDate()
          ? addMonths(startOfDay(anchor), monthDiff(anchor, reference) - 1)
          : addMonths(startOfDay(anchor), monthDiff(anchor, reference));
      return { start, end: addMonths(start, 1) };
    }
  }
}

/** Whole months between two dates (b - a), ignoring day of month. */
function monthDiff(a: Date, b: Date): number {
  return (
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    (b.getUTCMonth() - a.getUTCMonth())
  );
}

/**
 * Builds an array of month {@link DateRange}s covering the last `count` months
 * up to and including the month containing `reference`, oldest first.
 */
export function lastMonths(
  count: number,
  reference: Date = new Date(),
): DateRange[] {
  const ranges: DateRange[] = [];
  const base = startOfMonth(reference);
  for (let i = count - 1; i >= 0; i -= 1) {
    const start = addMonths(base, -i);
    ranges.push({ start, end: addMonths(start, 1) });
  }
  return ranges;
}

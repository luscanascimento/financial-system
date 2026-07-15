import type {
  Budget as BudgetDto,
  BudgetProgress,
} from '@financehub/shared-types';
import type { Budget } from '@prisma/client';

import type { DateRange } from '@financehub/shared-utils';

/**
 * Maps the persistence `Budget` entity to the public {@link BudgetDto}
 * projection, serialising dates to ISO strings and passing nullable fields
 * through as `null`.
 */
export function toBudget(budget: Budget): BudgetDto {
  return {
    id: budget.id,
    categoryId: budget.categoryId ?? null,
    name: budget.name,
    amountMinor: budget.amountMinor,
    period: budget.period,
    startDate: budget.startDate.toISOString(),
    rollover: budget.rollover,
    createdAt: budget.createdAt.toISOString(),
    updatedAt: budget.updatedAt.toISOString(),
  };
}

/**
 * Enriches a budget with the current period's actual spend, producing a
 * {@link BudgetProgress}. `ratio` is 0 when the budgeted amount is 0 to avoid a
 * divide-by-zero; it may exceed 1 when the user is over budget.
 */
export function toBudgetProgress(
  budget: Budget,
  bounds: DateRange,
  spentMinor: number,
): BudgetProgress {
  return {
    ...toBudget(budget),
    periodStart: bounds.start.toISOString(),
    periodEnd: bounds.end.toISOString(),
    spentMinor,
    remainingMinor: budget.amountMinor - spentMinor,
    ratio: budget.amountMinor === 0 ? 0 : spentMinor / budget.amountMinor,
  };
}

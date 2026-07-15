import type { Goal, GoalContribution } from '@financehub/shared-types';
import type {
  Goal as GoalEntity,
  GoalContribution as GoalContributionEntity,
} from '@prisma/client';

/**
 * Maps the persistence `Goal` entity to the public {@link Goal} projection,
 * serialising dates to ISO strings and passing nullable columns through as null.
 */
export function toGoal(goal: GoalEntity): Goal {
  return {
    id: goal.id,
    name: goal.name,
    targetAmountMinor: goal.targetAmountMinor,
    currentAmountMinor: goal.currentAmountMinor,
    currency: goal.currency,
    targetDate: goal.targetDate ? goal.targetDate.toISOString() : null,
    accountId: goal.accountId,
    color: goal.color,
    icon: goal.icon,
    status: goal.status,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

/**
 * Maps the persistence `GoalContribution` entity to the public
 * {@link GoalContribution} projection.
 */
export function toGoalContribution(
  contribution: GoalContributionEntity,
): GoalContribution {
  return {
    id: contribution.id,
    goalId: contribution.goalId,
    amountMinor: contribution.amountMinor,
    date: contribution.date.toISOString(),
    note: contribution.note,
    createdAt: contribution.createdAt.toISOString(),
  };
}

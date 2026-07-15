import type { RecurringTransaction as RecurringDto } from '@financehub/shared-types';
import type { RecurringTransaction } from '@prisma/client';

/**
 * Maps the persistence `RecurringTransaction` entity to the shared
 * {@link RecurringDto} contract, serialising dates to ISO strings and
 * preserving nullable fields.
 */
export function toRecurringDto(entity: RecurringTransaction): RecurringDto {
  return {
    id: entity.id,
    accountId: entity.accountId,
    categoryId: entity.categoryId,
    type: entity.type,
    amountMinor: entity.amountMinor,
    description: entity.description,
    frequency: entity.frequency,
    interval: entity.interval,
    startDate: entity.startDate.toISOString(),
    nextRunDate: entity.nextRunDate.toISOString(),
    endDate: entity.endDate ? entity.endDate.toISOString() : null,
    active: entity.active,
    lastRunAt: entity.lastRunAt ? entity.lastRunAt.toISOString() : null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

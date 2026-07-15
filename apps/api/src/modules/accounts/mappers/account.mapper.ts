import type { Account as AccountDto } from '@financehub/shared-types';
import type { Account } from '@prisma/client';

/**
 * Maps the persistence `Account` entity to the shared {@link AccountDto}
 * contract, serialising dates to ISO strings and preserving nullable fields.
 */
export function toAccountDto(account: Account): AccountDto {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    currency: account.currency,
    balanceMinor: account.balanceMinor,
    initialBalanceMinor: account.initialBalanceMinor,
    creditLimitMinor: account.creditLimitMinor,
    institution: account.institution,
    color: account.color,
    icon: account.icon,
    archived: account.archived,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

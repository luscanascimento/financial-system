import type { Transaction as TransactionDto } from '@financehub/shared-types';
import type { Transaction } from '@prisma/client';

/**
 * Maps the persistence `Transaction` entity to the shared {@link TransactionDto}
 * contract, serialising dates to ISO strings and preserving nullable fields.
 */
export function toTransactionDto(transaction: Transaction): TransactionDto {
  return {
    id: transaction.id,
    accountId: transaction.accountId,
    categoryId: transaction.categoryId,
    type: transaction.type,
    amountMinor: transaction.amountMinor,
    description: transaction.description,
    notes: transaction.notes,
    date: transaction.date.toISOString(),
    status: transaction.status,
    installmentGroupId: transaction.installmentGroupId,
    installmentNumber: transaction.installmentNumber,
    installmentTotal: transaction.installmentTotal,
    recurringTransactionId: transaction.recurringTransactionId,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

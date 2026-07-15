import type { Transfer as TransferDto } from '@financehub/shared-types';
import type { Transfer } from '@prisma/client';

/**
 * Maps the persistence `Transfer` entity to the shared {@link TransferDto}
 * contract, serialising dates to ISO strings and preserving nullable fields.
 */
export function toTransferDto(transfer: Transfer): TransferDto {
  return {
    id: transfer.id,
    fromAccountId: transfer.fromAccountId,
    toAccountId: transfer.toAccountId,
    fromAmountMinor: transfer.fromAmountMinor,
    toAmountMinor: transfer.toAmountMinor,
    description: transfer.description,
    date: transfer.date.toISOString(),
    createdAt: transfer.createdAt.toISOString(),
    updatedAt: transfer.updatedAt.toISOString(),
  };
}

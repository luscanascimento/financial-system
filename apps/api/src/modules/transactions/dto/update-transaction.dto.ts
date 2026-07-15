import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateTransactionDto } from './create-transaction.dto';

/**
 * Partial update for a transaction. Installment splitting is a create-time
 * concern, so `installmentTotal` is omitted from the update surface.
 */
export class UpdateTransactionDto extends PartialType(
  OmitType(CreateTransactionDto, ['installmentTotal'] as const),
) {}

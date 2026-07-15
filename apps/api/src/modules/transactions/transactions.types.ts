import type { FlowType, TransactionStatus } from '@financehub/shared-types';

/**
 * Normalised filter set the transactions repository understands. Date bounds
 * are already parsed to `Date`s and amounts to numbers by the service.
 */
export interface TransactionListFilters {
  accountId?: string;
  categoryId?: string;
  type?: FlowType;
  status?: TransactionStatus;
  from?: Date;
  to?: Date;
  minAmountMinor?: number;
  maxAmountMinor?: number;
  search?: string;
}

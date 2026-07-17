import { ApiPropertyOptional } from '@nestjs/swagger';
import type {
  FlowType,
  PaginationQuery,
  SortOrder,
  TransactionStatus,
} from '@financehub/shared-types';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import {
  MAX_MINOR_AMOUNT,
  MAX_SEARCH_LENGTH,
} from '../../../common/validation/constants';
import { IsAfterOrEqual } from '../../../common/validation/is-after-or-equal';

const FLOW_TYPES: FlowType[] = ['INCOME', 'EXPENSE'];
const STATUSES: TransactionStatus[] = ['PENDING', 'CLEARED'];
const SORT_ORDERS: SortOrder[] = ['asc', 'desc'];

/** Pagination + filter query for the transactions list endpoint. */
export class QueryTransactionsDto implements PaginationQuery {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ example: 'date' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: SORT_ORDERS, default: 'desc' })
  @IsOptional()
  @IsEnum(SORT_ORDERS)
  sortOrder?: SortOrder;

  @ApiPropertyOptional({
    description: 'Free-text match on description/notes.',
    maxLength: MAX_SEARCH_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_SEARCH_LENGTH)
  search?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: FLOW_TYPES })
  @IsOptional()
  @IsEnum(FLOW_TYPES)
  type?: FlowType;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsEnum(STATUSES)
  status?: TransactionStatus;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Inclusive lower date bound.',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Inclusive upper date bound (must be ≥ `from`).',
  })
  @IsOptional()
  @IsISO8601()
  @IsAfterOrEqual('from')
  to?: string;

  @ApiPropertyOptional({
    description: 'Minimum amount in minor units.',
    minimum: 0,
    maximum: MAX_MINOR_AMOUNT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_MINOR_AMOUNT)
  minAmountMinor?: number;

  @ApiPropertyOptional({
    description: 'Maximum amount in minor units.',
    minimum: 0,
    maximum: MAX_MINOR_AMOUNT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_MINOR_AMOUNT)
  maxAmountMinor?: number;
}

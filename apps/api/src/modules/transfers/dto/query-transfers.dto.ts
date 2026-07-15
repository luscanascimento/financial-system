import { ApiPropertyOptional } from '@nestjs/swagger';
import type { PaginationQuery, SortOrder } from '@financehub/shared-types';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

const SORT_ORDERS: SortOrder[] = ['asc', 'desc'];

/** Pagination + filter query for the transfers list endpoint. */
export class QueryTransfersDto implements PaginationQuery {
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

  @ApiPropertyOptional({ description: 'Free-text match on description.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filter by source account.',
  })
  @IsOptional()
  @IsUUID()
  fromAccountId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filter by destination account.',
  })
  @IsOptional()
  @IsUUID()
  toAccountId?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Inclusive lower date bound.',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Inclusive upper date bound.',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

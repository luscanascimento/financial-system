import { ApiPropertyOptional } from '@nestjs/swagger';
import type {
  GoalStatus,
  PaginationQuery,
  SortOrder,
} from '@financehub/shared-types';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const SORT_ORDERS: SortOrder[] = ['asc', 'desc'];
const GOAL_STATUSES: GoalStatus[] = ['ACTIVE', 'ACHIEVED', 'ARCHIVED'];

/**
 * Query parameters accepted by the goals list endpoint: standard pagination and
 * search plus an optional status filter.
 */
export class ListGoalsQueryDto implements PaginationQuery {
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

  @ApiPropertyOptional({
    description: 'Field to sort by.',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: SORT_ORDERS, default: 'desc' })
  @IsOptional()
  @IsIn(SORT_ORDERS)
  sortOrder?: SortOrder;

  @ApiPropertyOptional({ description: 'Case-insensitive name search.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: GOAL_STATUSES })
  @IsOptional()
  @IsIn(GOAL_STATUSES)
  status?: GoalStatus;
}

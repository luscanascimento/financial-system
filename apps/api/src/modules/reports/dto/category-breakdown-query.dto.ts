import { ApiPropertyOptional } from '@nestjs/swagger';
import type { FlowType } from '@financehub/shared-types';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

const FLOW_TYPES: FlowType[] = ['INCOME', 'EXPENSE'];

/**
 * Query parameters for the category-breakdown endpoint: the flow type to group
 * and an optional inclusive date range.
 */
export class CategoryBreakdownQueryDto {
  @ApiPropertyOptional({
    description: 'Flow type to break down. Defaults to EXPENSE.',
    enum: FLOW_TYPES,
    example: 'EXPENSE',
    default: 'EXPENSE',
  })
  @IsOptional()
  @IsEnum(FLOW_TYPES)
  type?: FlowType;

  @ApiPropertyOptional({
    description: 'Inclusive start of the range (ISO 8601).',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: 'Exclusive end of the range (ISO 8601).',
    example: '2026-02-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

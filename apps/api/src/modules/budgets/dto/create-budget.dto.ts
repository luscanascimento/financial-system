import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { BudgetPeriod } from '@financehub/shared-types';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

const BUDGET_PERIODS: BudgetPeriod[] = ['WEEKLY', 'MONTHLY', 'YEARLY'];

/** Payload to create a spending budget for the authenticated user. */
export class CreateBudgetDto {
  @ApiProperty({ example: 'Groceries', minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    description: 'Spending cap in integer minor units (e.g. cents).',
    example: 50000,
  })
  @IsInt()
  @IsPositive()
  amountMinor!: number;

  @ApiPropertyOptional({
    description:
      'Expense category this budget caps; omit for an overall budget.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    enum: BUDGET_PERIODS,
    default: 'MONTHLY',
    description: 'Rolling window the budget resets on.',
  })
  @IsOptional()
  @IsEnum(BUDGET_PERIODS)
  period?: BudgetPeriod;

  @ApiProperty({
    description:
      'Anchor date the recurring period is computed from (ISO 8601).',
    example: '2026-07-01T00:00:00.000Z',
  })
  @IsISO8601()
  startDate!: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Carry unused budget into the next period.',
  })
  @IsOptional()
  @IsBoolean()
  rollover?: boolean;
}

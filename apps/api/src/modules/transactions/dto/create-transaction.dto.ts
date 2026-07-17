import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { FlowType, TransactionStatus } from '@financehub/shared-types';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import {
  MAX_INSTALLMENTS,
  MAX_MINOR_AMOUNT,
} from '../../../common/validation/constants';

const FLOW_TYPES: FlowType[] = ['INCOME', 'EXPENSE'];
const STATUSES: TransactionStatus[] = ['PENDING', 'CLEARED'];

/** Payload to record a single transaction (optionally split into installments). */
export class CreateTransactionDto {
  @ApiProperty({ format: 'uuid', description: 'Account the entry posts to.' })
  @IsUUID()
  accountId!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Classifying category.' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ enum: FLOW_TYPES, example: 'EXPENSE' })
  @IsEnum(FLOW_TYPES)
  type!: FlowType;

  @ApiProperty({
    example: 4599,
    maximum: MAX_MINOR_AMOUNT,
    description: 'Positive amount in minor units; `type` gives the direction.',
  })
  @IsInt()
  @IsPositive()
  @Max(MAX_MINOR_AMOUNT)
  amountMinor!: number;

  @ApiProperty({ example: 'Weekly groceries', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description!: string;

  @ApiPropertyOptional({ example: 'Whole Foods', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ example: '2026-07-15T00:00:00.000Z', format: 'date-time' })
  @IsISO8601()
  date!: string;

  @ApiPropertyOptional({ enum: STATUSES, default: 'CLEARED' })
  @IsOptional()
  @IsEnum(STATUSES)
  status?: TransactionStatus;

  @ApiPropertyOptional({
    example: 3,
    minimum: 1,
    maximum: MAX_INSTALLMENTS,
    description: 'When > 1, split into N monthly installment legs.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INSTALLMENTS)
  installmentTotal?: number;
}

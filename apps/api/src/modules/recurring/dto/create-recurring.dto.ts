import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { FlowType, RecurrenceFrequency } from '@financehub/shared-types';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const FLOW_TYPES: FlowType[] = ['INCOME', 'EXPENSE'];
const FREQUENCIES: RecurrenceFrequency[] = [
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
];

/** Payload to create a recurring-transaction template. */
export class CreateRecurringDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Account generated entries post to.',
  })
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
    example: 1299,
    description: 'Positive amount in minor units.',
  })
  @IsInt()
  @IsPositive()
  amountMinor!: number;

  @ApiProperty({
    example: 'Streaming subscription',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description!: string;

  @ApiProperty({ enum: FREQUENCIES, example: 'MONTHLY' })
  @IsEnum(FREQUENCIES)
  frequency!: RecurrenceFrequency;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    default: 1,
    description: 'Every N periods (interval 2 + MONTHLY = every two months).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  interval?: number;

  @ApiProperty({ example: '2026-07-15T00:00:00.000Z', format: 'date-time' })
  @IsISO8601()
  startDate!: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Stop generating after this date.',
  })
  @IsOptional()
  @IsISO8601()
  endDate?: string;
}

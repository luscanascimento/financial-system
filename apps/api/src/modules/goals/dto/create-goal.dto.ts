import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Payload for creating a savings goal. All monetary values are integer minor
 * units of `currency`.
 */
export class CreateGoalDto {
  @ApiProperty({ example: 'Emergency fund', minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    description: 'Target amount in minor units (e.g. cents). Must be positive.',
    example: 500000,
  })
  @IsInt()
  @IsPositive()
  targetAmountMinor!: number;

  @ApiPropertyOptional({
    description: 'ISO 4217 currency code.',
    example: 'USD',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Optional target date (ISO 8601).',
    example: '2026-12-31T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  targetDate?: string;

  @ApiPropertyOptional({
    description: 'Optional account earmarked to fund this goal.',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({ example: '#22c55e', maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @ApiPropertyOptional({ example: 'piggy-bank', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string;
}

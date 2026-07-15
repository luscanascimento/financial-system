import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Payload for recording a single deposit toward a goal. `amountMinor` is an
 * integer number of minor units in the goal's currency.
 */
export class CreateContributionDto {
  @ApiProperty({
    description: 'Contribution amount in minor units. Must be positive.',
    example: 25000,
  })
  @IsInt()
  @IsPositive()
  amountMinor!: number;

  @ApiProperty({
    description: 'Date the contribution was made (ISO 8601).',
    example: '2026-07-15T00:00:00.000Z',
  })
  @IsISO8601()
  date!: string;

  @ApiPropertyOptional({ example: 'July paycheck transfer', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** Payload to move money between two of the user's own accounts. */
export class CreateTransferDto {
  @ApiProperty({ format: 'uuid', description: 'Source account (debited).' })
  @IsUUID()
  fromAccountId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Destination account (credited).',
  })
  @IsUUID()
  toAccountId!: string;

  @ApiProperty({
    example: 50000,
    description: 'Amount debited, in minor units.',
  })
  @IsInt()
  @IsPositive()
  fromAmountMinor!: number;

  @ApiPropertyOptional({
    example: 50000,
    description:
      'Amount credited, in minor units. Defaults to `fromAmountMinor`.',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  toAmountMinor?: number;

  @ApiPropertyOptional({ example: 'Move to savings', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiProperty({ example: '2026-07-15T00:00:00.000Z', format: 'date-time' })
  @IsISO8601()
  date!: string;
}

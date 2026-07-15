import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AccountType } from '@financehub/shared-types';
import {
  IsEnum,
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

const ACCOUNT_TYPES: AccountType[] = [
  'CHECKING',
  'SAVINGS',
  'CREDIT_CARD',
  'CASH',
  'WALLET',
  'INVESTMENT',
];

/** Payload to open a new account for the authenticated user. */
export class CreateAccountDto {
  @ApiProperty({ example: 'Everyday Checking', minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: ACCOUNT_TYPES, example: 'CHECKING' })
  @IsEnum(ACCOUNT_TYPES)
  type!: AccountType;

  @ApiPropertyOptional({
    example: 'USD',
    minLength: 3,
    maxLength: 3,
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiProperty({
    example: 100000,
    description: 'Opening balance in minor units.',
  })
  @IsInt()
  initialBalanceMinor!: number;

  @ApiPropertyOptional({
    example: 500000,
    description: 'Credit limit in minor units.',
  })
  @IsOptional()
  @IsInt()
  creditLimitMinor?: number;

  @ApiPropertyOptional({ example: 'Acme Bank', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  institution?: string;

  @ApiPropertyOptional({ example: '#4F46E5' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ example: 'wallet', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string;
}

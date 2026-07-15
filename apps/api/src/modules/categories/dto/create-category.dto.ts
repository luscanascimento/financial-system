import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { FlowType } from '@financehub/shared-types';
import {
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

const FLOW_TYPES: FlowType[] = ['INCOME', 'EXPENSE'];

/** Payload to create an income/expense category (optionally nested). */
export class CreateCategoryDto {
  @ApiProperty({ example: 'Groceries', minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: FLOW_TYPES, example: 'EXPENSE' })
  @IsEnum(FLOW_TYPES)
  type!: FlowType;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Parent category id (must share the same type and owner).',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ example: '#22C55E' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ example: 'cart', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string;
}

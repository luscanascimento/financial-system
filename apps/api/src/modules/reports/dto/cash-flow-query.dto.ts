import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Query parameters for the cash-flow endpoint: the number of trailing months to
 * bucket income vs. expense over.
 */
export class CashFlowQueryDto {
  @ApiPropertyOptional({
    description: 'Number of trailing months to include (1–36).',
    example: 6,
    minimum: 1,
    maximum: 36,
    default: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36)
  months?: number;
}

import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

import { CreateRecurringDto } from './create-recurring.dto';

/**
 * Partial update for a recurring template. `startDate` is anchored at creation
 * (it seeds `nextRunDate`) so it is omitted; templates can be paused via
 * `active`.
 */
export class UpdateRecurringDto extends PartialType(
  OmitType(CreateRecurringDto, ['startDate'] as const),
) {
  @ApiPropertyOptional({ description: 'Pause or resume generation.' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import type { GoalStatus } from '@financehub/shared-types';
import { IsIn, IsOptional } from 'class-validator';

import { CreateGoalDto } from './create-goal.dto';

const GOAL_STATUSES: GoalStatus[] = ['ACTIVE', 'ACHIEVED', 'ARCHIVED'];

/**
 * Partial update for an existing goal (all creation fields optional) plus an
 * explicit `status` for archiving/reactivating.
 */
export class UpdateGoalDto extends PartialType(CreateGoalDto) {
  @ApiPropertyOptional({ enum: GOAL_STATUSES, example: 'ARCHIVED' })
  @IsOptional()
  @IsIn(GOAL_STATUSES)
  status?: GoalStatus;
}

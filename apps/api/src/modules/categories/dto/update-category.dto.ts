import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateCategoryDto } from './create-category.dto';

/**
 * Partial update for a category. `type` is immutable after creation (it would
 * orphan classified transactions), so it is omitted from the update surface.
 */
export class UpdateCategoryDto extends PartialType(
  OmitType(CreateCategoryDto, ['type'] as const),
) {}

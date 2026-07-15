import { PartialType } from '@nestjs/swagger';

import { CreateBudgetDto } from './create-budget.dto';

/**
 * Payload to update a budget. Every field is optional; omitted fields keep
 * their current value.
 */
export class UpdateBudgetDto extends PartialType(CreateBudgetDto) {}

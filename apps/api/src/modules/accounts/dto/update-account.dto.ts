import { PartialType } from '@nestjs/swagger';

import { CreateAccountDto } from './create-account.dto';

/** Partial update for an existing account (all fields optional). */
export class UpdateAccountDto extends PartialType(CreateAccountDto) {}

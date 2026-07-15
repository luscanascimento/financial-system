import { Module } from '@nestjs/common';

import { AccountsController } from './accounts.controller';
import { AccountsRepository } from './accounts.repository';
import { AccountsService } from './accounts.service';

/** Wires the accounts feature: controller, service and persistence gateway. */
@Module({
  controllers: [AccountsController],
  providers: [AccountsService, AccountsRepository],
  exports: [AccountsService, AccountsRepository],
})
export class AccountsModule {}

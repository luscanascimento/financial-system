import { Module } from '@nestjs/common';

import { AccountsModule } from '../accounts/accounts.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { RecurringController } from './recurring.controller';
import { RecurringRepository } from './recurring.repository';
import { RecurringService } from './recurring.service';

/**
 * Recurring-transaction templates. Depends on Transactions (to spawn generated
 * entries) and Accounts (ownership checks) via their exported providers.
 */
@Module({
  imports: [TransactionsModule, AccountsModule],
  controllers: [RecurringController],
  providers: [RecurringService, RecurringRepository],
  exports: [RecurringService, RecurringRepository],
})
export class RecurringModule {}

import { Module } from '@nestjs/common';

import { AccountsModule } from '../accounts/accounts.module';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsService } from './transactions.service';

/**
 * The income/expense ledger. Depends on Accounts (balance adjustments) and
 * Categories (ownership + type checks) via their exported repositories.
 */
@Module({
  imports: [AccountsModule, CategoriesModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsRepository],
  exports: [TransactionsService, TransactionsRepository],
})
export class TransactionsModule {}

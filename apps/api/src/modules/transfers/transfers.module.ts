import { Module } from '@nestjs/common';

import { AccountsModule } from '../accounts/accounts.module';
import { TransfersController } from './transfers.controller';
import { TransfersRepository } from './transfers.repository';
import { TransfersService } from './transfers.service';

/**
 * Account-to-account transfers. Depends on Accounts (balance adjustments) via
 * its exported repository.
 */
@Module({
  imports: [AccountsModule],
  controllers: [TransfersController],
  providers: [TransfersService, TransfersRepository],
  exports: [TransfersService, TransfersRepository],
})
export class TransfersModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { CryptoModule } from '../common/crypto/crypto.module';
import {
  loadConfiguration,
  type AppConfiguration,
} from '../config/configuration';
import { validateEnv } from '../config/env.validation';
import { HealthModule } from '../health/health.module';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { RedisThrottlerStorage } from '../infrastructure/redis/redis-throttler.storage';
import { AccountSecurityModule } from '../modules/account-security/account-security.module';
import { AccountsModule } from '../modules/accounts/accounts.module';
import { AuthModule } from '../modules/auth/auth.module';
import { BudgetsModule } from '../modules/budgets/budgets.module';
import { CategoriesModule } from '../modules/categories/categories.module';
import { GoalsModule } from '../modules/goals/goals.module';
import { MailModule } from '../modules/mail/mail.module';
import { RecurringModule } from '../modules/recurring/recurring.module';
import { ReportsModule } from '../modules/reports/reports.module';
import { TransactionsModule } from '../modules/transactions/transactions.module';
import { TransfersModule } from '../modules/transfers/transfers.module';
import { UsersModule } from '../modules/users/users.module';

/**
 * Composition root. Wires global configuration, infrastructure (Prisma, Redis),
 * cross-cutting concerns (rate limiting) and feature modules. Feature modules
 * (Auth, Users, Accounts, …) are registered here as they land in later phases.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', 'apps/api/.env'],
      validate: validateEnv,
      load: [loadConfiguration],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService, RedisThrottlerStorage],
      useFactory: (
        configService: ConfigService<AppConfiguration, true>,
        storage: RedisThrottlerStorage,
      ) => {
        const throttle = configService.get('throttle', { infer: true });
        return {
          // Redis-backed store so limits are enforced globally across replicas.
          storage,
          throttlers: [{ ttl: throttle.ttl * 1000, limit: throttle.limit }],
        };
      },
    }),
    PrismaModule,
    RedisModule,
    CryptoModule,
    HealthModule,
    MailModule,
    AuthModule,
    UsersModule,
    AccountSecurityModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    TransfersModule,
    RecurringModule,
    BudgetsModule,
    GoalsModule,
    ReportsModule,
  ],
  providers: [
    // Apply rate limiting globally; routes can opt out with @SkipThrottle().
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

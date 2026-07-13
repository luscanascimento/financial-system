import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import {
  loadConfiguration,
  type AppConfiguration,
} from '../config/configuration';
import { validateEnv } from '../config/env.validation';
import { HealthModule } from '../health/health.module';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { RedisModule } from '../infrastructure/redis/redis.module';

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
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfiguration, true>) => {
        const throttle = configService.get('throttle', { infer: true });
        return {
          throttlers: [{ ttl: throttle.ttl * 1000, limit: throttle.limit }],
        };
      },
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
  ],
  providers: [
    // Apply rate limiting globally; routes can opt out with @SkipThrottle().
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

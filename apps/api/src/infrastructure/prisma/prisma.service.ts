import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

import type { AppConfiguration } from '../../config/configuration';

/**
 * Thin, framework-aware wrapper around the generated {@link PrismaClient}.
 *
 * It is the single gateway to PostgreSQL. Feature modules never touch this
 * class directly — they depend on repository abstractions that receive it via
 * dependency injection, keeping Prisma an implementation detail of the
 * infrastructure layer.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService<AppConfiguration, true>) {
    super({
      datasources: {
        db: { url: configService.get('database.url', { infer: true }) },
      },
      log: configService.get('app.isProduction', { infer: true })
        ? ['warn', 'error']
        : ['query', 'warn', 'error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL');
  }

  /**
   * Lightweight connectivity probe used by the health module.
   */
  async ping(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }
}

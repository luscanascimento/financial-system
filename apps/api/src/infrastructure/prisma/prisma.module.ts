import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * Provides the shared {@link PrismaService} across the application. Marked
 * `@Global()` so feature modules can inject repositories without re-importing
 * the persistence module everywhere.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

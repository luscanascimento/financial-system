import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { AppModule } from './app.module';

/**
 * Boot test: compiles the entire application dependency-injection graph with
 * the infrastructure gateways stubbed. This proves every feature module's
 * providers resolve (no missing/unexported dependencies) without needing a live
 * Postgres or Redis — a failure here means the API would crash on startup.
 */
describe('AppModule', () => {
  beforeEach(() => {
    // Some infra secrets are only validated in production; keep the test env clean.
    vi.stubEnv('NODE_ENV', 'test');
  });

  it('resolves the full DI graph', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: vi.fn(),
        $disconnect: vi.fn(),
        ping: vi.fn(),
      })
      .overrideProvider(RedisService)
      .useValue({
        onModuleInit: vi.fn(),
        onModuleDestroy: vi.fn(),
        ping: vi.fn(),
      })
      .compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});

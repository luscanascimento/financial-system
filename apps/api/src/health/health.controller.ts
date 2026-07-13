import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../modules/auth/decorators/public.decorator';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { StorageHealthIndicator } from './indicators/storage.health';

/**
 * Exposes Kubernetes/Docker-friendly health probes:
 *
 * - `GET /api/health`  — full dependency check (DB, Redis, storage, memory).
 * - `GET /api/health/live`  — liveness: is the process up at all?
 * - `GET /api/health/ready` — readiness: are critical deps reachable?
 */
@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  private static readonly MAX_HEAP_BYTES = 512 * 1024 * 1024;

  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly storage: StorageHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Full health check of the API and its dependencies' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.database.isHealthy(),
      () => this.redis.isHealthy(),
      () => this.storage.isHealthy(),
      () =>
        this.memory.checkHeap('memory_heap', HealthController.MAX_HEAP_BYTES),
    ]);
  }

  @Get('live')
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe (process is running)' })
  liveness(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe (critical dependencies reachable)' })
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.database.isHealthy(),
      () => this.redis.isHealthy(),
    ]);
  }
}

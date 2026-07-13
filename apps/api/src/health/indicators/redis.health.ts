import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';

import { RedisService } from '../../infrastructure/redis/redis.service';

/**
 * Reports Redis connectivity via `PING`.
 */
@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly redis: RedisService,
  ) {}

  async isHealthy(key = 'redis'): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      const alive = await this.redis.ping();
      return alive
        ? indicator.up()
        : indicator.down({ message: 'unexpected PING response' });
    } catch (error) {
      return indicator.down({
        message: error instanceof Error ? error.message : 'unreachable',
      });
    }
  }
}

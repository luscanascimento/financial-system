import { Global, Module } from '@nestjs/common';

import { RedisService } from './redis.service';

/**
 * Exposes the shared {@link RedisService} application-wide.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}

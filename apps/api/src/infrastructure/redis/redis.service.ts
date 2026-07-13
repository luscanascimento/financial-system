import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import type { AppConfiguration } from '../../config/configuration';

/**
 * Owns the singleton Redis connection used for caching, rate-limiting metadata
 * and (from later phases) refresh-token/session state. Exposes a small, typed
 * surface so callers never depend on the raw driver.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(configService: ConfigService<AppConfiguration, true>) {
    const redis = configService.get('redis', { infer: true });
    this.client = new Redis({
      host: redis.host,
      port: redis.port,
      password: redis.password,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    this.logger.log('Connected to Redis');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Disconnected from Redis');
  }

  /** Underlying driver, for advanced use cases (pub/sub, pipelines). */
  get connection(): Redis {
    return this.client;
  }

  async ping(): Promise<boolean> {
    return (await this.client.ping()) === 'PONG';
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}

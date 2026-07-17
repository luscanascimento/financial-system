import { Injectable, Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';

import { RedisService } from './redis.service';

/**
 * Shape returned by {@link ThrottlerStorage.increment}. Declared locally because
 * `@nestjs/throttler`'s barrel does not re-export the interface type.
 */
interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * A {@link ThrottlerStorage} backed by Redis, so rate-limit counters are shared
 * across every API instance instead of living in each process's memory. Without
 * this, horizontal scaling multiplies the effective limit by the replica count
 * and a per-IP limit is trivially bypassed by hitting different pods.
 *
 * The whole increment/expire/block decision runs in a single atomic Lua script
 * to avoid races between concurrent requests. If Redis is unreachable the store
 * **fails open** (allows the request) rather than taking the API down — a
 * degraded rate limiter is preferable to an outage.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly prefix = 'throttle:';

  // KEYS[1] = hit counter, KEYS[2] = block flag
  // ARGV[1] = ttl(ms), ARGV[2] = limit, ARGV[3] = blockDuration(ms)
  // Returns: { totalHits, timeToExpireSec, isBlocked(0|1), timeToBlockExpireSec }
  private static readonly SCRIPT = `
    local hitKey = KEYS[1]
    local blockKey = KEYS[2]
    local ttl = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    local block = tonumber(ARGV[3])

    local totalHits = redis.call('INCR', hitKey)
    if totalHits == 1 then
      redis.call('PEXPIRE', hitKey, ttl)
    end
    local ttlRemaining = redis.call('PTTL', hitKey)
    if ttlRemaining < 0 then
      redis.call('PEXPIRE', hitKey, ttl)
      ttlRemaining = ttl
    end

    local blocked = 0
    local blockRemaining = redis.call('PTTL', blockKey)
    if blockRemaining > 0 then
      blocked = 1
    else
      blockRemaining = 0
      if totalHits > limit then
        redis.call('SET', blockKey, '1', 'PX', block)
        blocked = 1
        blockRemaining = block
      end
    end

    local function toSec(ms) return math.floor((ms + 999) / 1000) end
    return { totalHits, toSec(ttlRemaining), blocked, toSec(blockRemaining) }
  `;

  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitKey = `${this.prefix}${throttlerName}:${key}`;
    const blockKey = `${hitKey}:blocked`;

    try {
      const result = (await this.redis.connection.eval(
        RedisThrottlerStorage.SCRIPT,
        2,
        hitKey,
        blockKey,
        String(ttl),
        String(limit),
        String(blockDuration),
      )) as [number, number, number, number];

      const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] = result;
      return {
        totalHits,
        timeToExpire,
        isBlocked: isBlocked === 1,
        timeToBlockExpire,
      };
    } catch (error) {
      // Fail open: a Redis outage must not deny every request.
      this.logger.error(
        `Rate-limit store unavailable, allowing request: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {
        totalHits: 0,
        timeToExpire: Math.ceil(ttl / 1000),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }
}

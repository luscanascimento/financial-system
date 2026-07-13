import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';

import type { AppConfiguration } from '../../config/configuration';

/**
 * Reports MinIO/S3 availability by hitting its unauthenticated liveness probe
 * (`/minio/health/live`). Uses a short timeout so a slow storage backend never
 * stalls the health endpoint.
 */
@Injectable()
export class StorageHealthIndicator {
  private readonly livenessUrl: string;

  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    configService: ConfigService<AppConfiguration, true>,
  ) {
    const storage = configService.get('storage', { infer: true });
    const scheme = storage.useSsl ? 'https' : 'http';
    this.livenessUrl = `${scheme}://${storage.endpoint}:${storage.port}/minio/health/live`;
  }

  async isHealthy(key = 'storage'): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    try {
      const response = await fetch(this.livenessUrl, {
        signal: controller.signal,
      });
      return response.ok
        ? indicator.up()
        : indicator.down({ message: `status ${response.status}` });
    } catch (error) {
      return indicator.down({
        message: error instanceof Error ? error.message : 'unreachable',
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

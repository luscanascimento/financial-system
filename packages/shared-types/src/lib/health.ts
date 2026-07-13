/** Health probe payloads exposed by `GET /api/health`. */

export type HealthState = 'ok' | 'error' | 'shutting_down';

export interface HealthIndicatorStatus {
  status: 'up' | 'down';
  [detail: string]: unknown;
}

export interface HealthCheckResponse {
  status: HealthState;
  info?: Record<string, HealthIndicatorStatus>;
  error?: Record<string, HealthIndicatorStatus>;
  details: Record<string, HealthIndicatorStatus>;
}

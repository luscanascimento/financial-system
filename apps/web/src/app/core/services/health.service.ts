import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { HealthCheckResponse } from '@financehub/shared-types';
import { Observable, catchError, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SKIP_ERROR_NOTIFICATION } from '../interceptors/error.interceptor';

/**
 * Reads the API health endpoint. Terminus returns HTTP 503 (with the same body
 * shape) when a dependency is down, so we normalize both success and error
 * responses into a single {@link HealthCheckResponse} and suppress the global
 * error toast for this background probe.
 */
@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/health`;

  check(): Observable<HealthCheckResponse> {
    const context = new HttpContext().set(SKIP_ERROR_NOTIFICATION, true);

    return this.http
      .get<HealthCheckResponse>(this.url, { context })
      .pipe(
        catchError((error: { error?: HealthCheckResponse }) => {
          if (error.error && typeof error.error === 'object') {
            return of(error.error);
          }
          return of({
            status: 'error',
            details: {},
          } satisfies HealthCheckResponse);
        }),
      );
  }
}

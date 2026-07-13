import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import type { ApiErrorResponse } from '@financehub/shared-types';
import { catchError, throwError } from 'rxjs';

import { NotificationService } from '../services/notification.service';

/**
 * Opt-out flag for callers (e.g. background polling) that handle errors
 * themselves and don't want a toast. Set via `HttpContext`.
 */
export const SKIP_ERROR_NOTIFICATION = new HttpContextToken<boolean>(
  () => false,
);

/**
 * Surfaces failed HTTP calls to the user as a toast, then re-throws so callers
 * can still react. Understands the API's canonical {@link ApiErrorResponse}
 * envelope and falls back gracefully for network/opaque errors.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!req.context.get(SKIP_ERROR_NOTIFICATION)) {
        notifications.error(resolveMessage(error));
      }
      return throwError(() => error);
    }),
  );
};

function resolveMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Unable to reach the server. Check your connection and try again.';
  }

  const body = error.error as Partial<ApiErrorResponse> | string | null;
  if (typeof body === 'string' && body.length > 0) {
    return body;
  }
  if (body && typeof body === 'object' && body.message) {
    return Array.isArray(body.message) ? body.message[0] : body.message;
  }
  return error.message || 'Something went wrong.';
}

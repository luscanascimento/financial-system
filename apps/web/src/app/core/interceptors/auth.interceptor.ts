import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

const AUTH_FREE_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

/**
 * Attaches the in-memory bearer access token to API requests and transparently
 * recovers from expiry: on a 401 it performs a single refresh (rotating the
 * httpOnly cookie), then retries the original request once with the new token.
 * Requests to the auth endpoints are never retried, preventing refresh loops.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  return next(withBearer(req, auth.getAccessToken())).pipe(
    catchError((error: unknown) => {
      const isAuthFree = AUTH_FREE_PATHS.some((p) => req.url.includes(p));
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isAuthFree
      ) {
        return auth.refresh().pipe(
          switchMap(() => next(withBearer(req, auth.getAccessToken()))),
          // The refresh itself failed: the session is gone for good. Clear
          // local state and send the user to login rather than looping on 401s.
          catchError((refreshError: unknown) => {
            auth.forceLogout();
            void router.navigate(['/auth/login']);
            return throwError(() => refreshError);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};

function withBearer(
  req: HttpRequest<unknown>,
  token: string | null,
): HttpRequest<unknown> {
  return token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;
}

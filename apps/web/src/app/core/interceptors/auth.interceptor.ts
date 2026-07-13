import { HttpInterceptorFn } from '@angular/common/http';

import { environment } from '../../../environments/environment';

const ACCESS_TOKEN_KEY = 'financehub.accessToken';

/**
 * Attaches the bearer access token to outbound API requests when present.
 *
 * Phase 0 wires the plumbing; the token store and refresh flow are implemented
 * in Phase 1 (Auth). Only same-origin API calls are decorated so third-party
 * requests never receive our credentials.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isApiRequest = req.url.startsWith(environment.apiBaseUrl);
  if (!isApiRequest) {
    return next(req);
  }

  const token = readAccessToken();
  if (!token) {
    return next(req);
  }

  return next(
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  );
};

function readAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../services/auth.service';

/**
 * Ensures a route is only reachable by an authenticated user. If the session
 * hasn't been probed yet (fresh page load), it waits for the silent-refresh
 * attempt before deciding, then redirects unauthenticated users to /auth/login.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const decide = (): boolean => {
    if (auth.isAuthenticated()) {
      return true;
    }
    void router.navigate(['/auth/login'], {
      queryParams: { redirectTo: state.url },
    });
    return false;
  };

  if (auth.initialized()) {
    return decide();
  }
  return auth.restoreSession().pipe(map(decide));
};

/**
 * The inverse of {@link authGuard}: keeps already-authenticated users out of
 * the auth pages (login/register), sending them to the dashboard instead.
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const decide = (): boolean => {
    if (!auth.isAuthenticated()) {
      return true;
    }
    void router.navigate(['/dashboard']);
    return false;
  };

  if (auth.initialized()) {
    return decide();
  }
  return auth.restoreSession().pipe(map(decide));
};

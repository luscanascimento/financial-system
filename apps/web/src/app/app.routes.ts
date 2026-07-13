import { Route } from '@angular/router';

/**
 * Top-level routes. Feature areas are lazy-loaded so each ships in its own
 * bundle. Additional features (auth, accounts, transactions, …) plug in here
 * as later phases land.
 */
export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    title: 'Dashboard · FinanceHub',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];

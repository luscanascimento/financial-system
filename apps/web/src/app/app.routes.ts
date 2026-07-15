import { Route } from '@angular/router';

import { authGuard, guestGuard } from './core/guards/auth.guard';

/**
 * Top-level routes. Auth pages render full-screen behind the guest guard; every
 * feature area is nested under the authenticated {@link MainLayout} shell and
 * protected by the auth guard. Feature components are lazy-loaded so each ships
 * in its own bundle.
 */
export const appRoutes: Route[] = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        title: 'Sign in · FinanceHub',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/login').then((m) => m.Login),
      },
      {
        path: 'register',
        title: 'Create account · FinanceHub',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/register').then((m) => m.Register),
      },
      {
        path: 'forgot-password',
        title: 'Reset password · FinanceHub',
        loadComponent: () =>
          import('./features/auth/forgot-password').then(
            (m) => m.ForgotPassword,
          ),
      },
      {
        path: 'reset-password',
        title: 'Reset password · FinanceHub',
        loadComponent: () =>
          import('./features/auth/reset-password').then((m) => m.ResetPassword),
      },
      {
        path: 'verify-email',
        title: 'Verify email · FinanceHub',
        loadComponent: () =>
          import('./features/auth/verify-email').then((m) => m.VerifyEmail),
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout').then((m) => m.MainLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · FinanceHub',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'accounts',
        title: 'Accounts · FinanceHub',
        loadComponent: () =>
          import('./features/accounts/accounts').then((m) => m.Accounts),
      },
      {
        path: 'transactions',
        title: 'Transactions · FinanceHub',
        loadComponent: () =>
          import('./features/transactions/transactions').then(
            (m) => m.Transactions,
          ),
      },
      {
        path: 'budgets',
        title: 'Budgets · FinanceHub',
        loadComponent: () =>
          import('./features/budgets/budgets').then((m) => m.Budgets),
      },
      {
        path: 'goals',
        title: 'Goals · FinanceHub',
        loadComponent: () =>
          import('./features/goals/goals').then((m) => m.Goals),
      },
      {
        path: 'categories',
        title: 'Categories · FinanceHub',
        loadComponent: () =>
          import('./features/categories/categories').then((m) => m.Categories),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

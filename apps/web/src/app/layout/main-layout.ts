import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { ThemeService } from '../core/services/theme.service';

interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: string;
}

/**
 * Authenticated application chrome: a collapsible sidenav with primary
 * navigation plus a toolbar carrying the brand, theme toggle and account menu.
 * All protected feature routes render inside its content outlet.
 */
@Component({
  selector: 'fh-main-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  private readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  protected readonly isDark = this.theme.isDark;
  protected readonly user = this.auth.currentUser;
  protected readonly opened = signal(true);

  protected readonly initials = computed(() => {
    const name = this.user()?.displayName ?? '';
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || '?'
    );
  });

  protected readonly nav: readonly NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Accounts', path: '/accounts', icon: 'account_balance' },
    { label: 'Transactions', path: '/transactions', icon: 'receipt_long' },
    { label: 'Budgets', path: '/budgets', icon: 'savings' },
    { label: 'Goals', path: '/goals', icon: 'flag' },
    { label: 'Categories', path: '/categories', icon: 'category' },
  ];

  protected toggleSidenav(): void {
    this.opened.update((value) => !value);
  }

  protected toggleTheme(): void {
    this.theme.toggle();
  }

  protected logout(): void {
    this.auth.logout().subscribe({
      complete: () => {
        this.notifications.info('Signed out');
        void this.router.navigate(['/auth/login']);
      },
    });
  }
}

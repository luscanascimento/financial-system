import { Component, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import type { HealthCheckResponse } from '@financehub/shared-types';

import { HealthService } from '../../core/services/health.service';

interface Kpi {
  readonly label: string;
  readonly value: string;
  readonly icon: string;
  readonly trend: string;
}

interface DependencyStatus {
  readonly key: string;
  readonly up: boolean;
}

/**
 * Landing dashboard. In Phase 0 it demonstrates the end-to-end wiring —
 * signals, HTTP, loading/skeleton/error states — by rendering placeholder KPIs
 * and a live system-status panel fed by the API health endpoint. Real financial
 * data replaces the placeholders from Phase 5 onwards.
 */
@Component({
  selector: 'fh-dashboard',
  imports: [
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly healthApi = inject(HealthService);

  protected readonly loading = signal(true);
  protected readonly health = signal<HealthCheckResponse | null>(null);

  /** Placeholder KPIs — wired to real aggregates in later phases. */
  protected readonly kpis: readonly Kpi[] = [
    { label: 'Total balance', value: '$0.00', icon: 'account_balance', trend: 'Add an account to begin' },
    { label: 'Income (30d)', value: '$0.00', icon: 'trending_up', trend: 'No transactions yet' },
    { label: 'Expenses (30d)', value: '$0.00', icon: 'trending_down', trend: 'No transactions yet' },
    { label: 'Savings rate', value: '—', icon: 'savings', trend: 'Awaiting data' },
  ];

  protected readonly dependencies = computed<DependencyStatus[]>(() => {
    const details = this.health()?.details ?? {};
    return Object.entries(details).map(([key, value]) => ({
      key,
      up: value.status === 'up',
    }));
  });

  protected readonly overallUp = computed(() => this.health()?.status === 'ok');

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.healthApi.check().subscribe((result) => {
      this.health.set(result);
      this.loading.set(false);
    });
  }
}

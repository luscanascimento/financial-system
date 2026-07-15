import { Component, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import type {
  CashFlowPoint,
  CategoryBreakdownItem,
  FinancialOverview,
} from '@financehub/shared-types';
import { forkJoin } from 'rxjs';

import { MoneyPipe } from '../../shared/money.pipe';
import { DashboardService } from './dashboard.service';

interface Kpi {
  readonly label: string;
  readonly valueMinor: number;
  readonly icon: string;
  readonly amountClass: string;
}

/** A cash-flow point projected onto the SVG chart geometry. */
interface CashFlowBar {
  readonly label: string;
  readonly incomeMinor: number;
  readonly expenseMinor: number;
  /** Bar heights in the chart's viewBox units (0–CHART_HEIGHT). */
  readonly incomeHeight: number;
  readonly expenseHeight: number;
}

const CHART_HEIGHT = 100;

/**
 * Landing dashboard driven by the reports API: headline KPIs, an inline SVG
 * cash-flow chart (income vs expense per month, no chart library) and a
 * category-breakdown panel of horizontal bars.
 */
@Component({
  selector: 'fh-dashboard',
  imports: [MatCardModule, MatIconModule, MatProgressSpinnerModule, MoneyPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly api = inject(DashboardService);

  protected readonly loading = signal(true);
  protected readonly overview = signal<FinancialOverview | null>(null);
  protected readonly cashFlow = signal<CashFlowPoint[]>([]);
  protected readonly breakdown = signal<CategoryBreakdownItem[]>([]);

  protected readonly chartHeight = CHART_HEIGHT;

  protected readonly currency = computed(
    () => this.overview()?.currency ?? 'USD',
  );

  protected readonly kpis = computed<Kpi[]>(() => {
    const o = this.overview();
    if (!o) {
      return [];
    }
    return [
      {
        label: 'Total balance',
        valueMinor: o.totalBalanceMinor,
        icon: 'account_balance',
        amountClass: '',
      },
      {
        label: 'Income (this month)',
        valueMinor: o.monthIncomeMinor,
        icon: 'trending_up',
        amountClass: 'fh-amount--income',
      },
      {
        label: 'Expenses (this month)',
        valueMinor: o.monthExpenseMinor,
        icon: 'trending_down',
        amountClass: 'fh-amount--expense',
      },
      {
        label: 'Net (this month)',
        valueMinor: o.monthNetMinor,
        icon: 'savings',
        amountClass:
          o.monthNetMinor < 0 ? 'fh-amount--expense' : 'fh-amount--income',
      },
    ];
  });

  /** Peak income/expense across the window — used to scale the bar heights. */
  private readonly cashFlowMax = computed(() =>
    this.cashFlow().reduce(
      (max, p) => Math.max(max, p.incomeMinor, p.expenseMinor),
      0,
    ),
  );

  protected readonly cashFlowBars = computed<CashFlowBar[]>(() => {
    const max = this.cashFlowMax();
    return this.cashFlow().map((p) => ({
      label: new Date(p.period).toLocaleDateString(undefined, {
        month: 'short',
      }),
      incomeMinor: p.incomeMinor,
      expenseMinor: p.expenseMinor,
      incomeHeight: max > 0 ? (p.incomeMinor / max) * CHART_HEIGHT : 0,
      expenseHeight: max > 0 ? (p.expenseMinor / max) * CHART_HEIGHT : 0,
    }));
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    forkJoin({
      overview: this.api.overview(),
      cashFlow: this.api.cashFlow(6),
      breakdown: this.api.categoryBreakdown('EXPENSE'),
    }).subscribe({
      next: ({ overview, cashFlow, breakdown }) => {
        this.overview.set(overview);
        this.cashFlow.set(cashFlow);
        this.breakdown.set(breakdown);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

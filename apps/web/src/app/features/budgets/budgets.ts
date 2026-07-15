import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import type {
  BudgetPeriod,
  BudgetProgress,
  Category,
} from '@financehub/shared-types';
import { majorToMinor, minorToMajor } from '@financehub/shared-utils';

import { NotificationService } from '../../core/services/notification.service';
import { MoneyPipe } from '../../shared/money.pipe';
import { BudgetsService } from './budgets.service';

const BUDGET_PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];

/** Budgets overview: card grid with progress bars and an inline create/edit form. */
@Component({
  selector: 'fh-budgets',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MoneyPipe,
  ],
  templateUrl: './budgets.html',
  styleUrl: './budgets.scss',
})
export class Budgets {
  private readonly api = inject(BudgetsService);
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);

  protected readonly budgetPeriods = BUDGET_PERIODS;
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly budgets = signal<BudgetProgress[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formOpen = signal(false);

  protected readonly totalAmountMinor = computed(() =>
    this.budgets().reduce((sum, b) => sum + b.amountMinor, 0),
  );
  protected readonly totalSpentMinor = computed(() =>
    this.budgets().reduce((sum, b) => sum + b.spentMinor, 0),
  );

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    categoryId: [''],
    amountMajor: [0, [Validators.required]],
    period: ['MONTHLY' as BudgetPeriod, [Validators.required]],
    startDate: [new Date(), [Validators.required]],
  });

  constructor() {
    this.load();
    this.loadCategories();
  }

  /** Clamp the progress-bar value to 100 even when the budget is exceeded. */
  protected barValue(ratio: number): number {
    return Math.min(Math.max(ratio, 0), 1) * 100;
  }

  protected categoryName(categoryId: string | null): string | null {
    if (!categoryId) {
      return null;
    }
    return this.categories().find((c) => c.id === categoryId)?.name ?? null;
  }

  protected load(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (budgets) => {
        this.budgets.set(budgets);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected loadCategories(): void {
    this.api.expenseCategories().subscribe({
      next: (categories) => this.categories.set(categories),
    });
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      name: '',
      categoryId: '',
      amountMajor: 0,
      period: 'MONTHLY',
      startDate: new Date(),
    });
    this.formOpen.set(true);
  }

  protected openEdit(budget: BudgetProgress): void {
    this.editingId.set(budget.id);
    this.form.reset({
      name: budget.name,
      categoryId: budget.categoryId ?? '',
      amountMajor: minorToMajor(budget.amountMinor),
      period: budget.period,
      startDate: new Date(budget.startDate),
    });
    this.formOpen.set(true);
  }

  protected cancel(): void {
    this.formOpen.set(false);
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const id = this.editingId();

    const done = {
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.notifications.success(id ? 'Budget updated' : 'Budget created');
        this.load();
      },
      error: () => this.saving.set(false),
    };

    const payload = {
      name: raw.name,
      amountMinor: majorToMinor(raw.amountMajor),
      categoryId: raw.categoryId || null,
      period: raw.period,
      startDate: raw.startDate.toISOString(),
    };

    if (id) {
      this.api.update(id, payload).subscribe(done);
    } else {
      this.api.create(payload).subscribe(done);
    }
  }

  protected remove(budget: BudgetProgress): void {
    this.api.remove(budget.id).subscribe({
      next: () => {
        this.notifications.info(`Deleted ${budget.name}`);
        this.load();
      },
    });
  }
}

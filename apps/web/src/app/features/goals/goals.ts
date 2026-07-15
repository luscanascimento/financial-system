import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import type { Account, Goal } from '@financehub/shared-types';
import { majorToMinor, minorToMajor } from '@financehub/shared-utils';

import { NotificationService } from '../../core/services/notification.service';
import { MoneyPipe } from '../../shared/money.pipe';
import { AccountsService } from '../accounts/accounts.service';
import { GoalsService } from './goals.service';

/** Savings goals: card grid with inline create/edit and contribution forms. */
@Component({
  selector: 'fh-goals',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MoneyPipe,
  ],
  templateUrl: './goals.html',
  styleUrl: './goals.scss',
})
export class Goals {
  private readonly api = inject(GoalsService);
  private readonly accountsApi = inject(AccountsService);
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly contributing = signal(false);
  protected readonly goals = signal<Goal[]>([]);
  protected readonly accounts = signal<Account[]>([]);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly contributeId = signal<string | null>(null);

  protected readonly totalSavedMinor = computed(() =>
    this.goals().reduce((sum, g) => sum + g.currentAmountMinor, 0),
  );

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    targetAmountMajor: [0, [Validators.required, Validators.min(0)]],
    currency: ['USD', [Validators.required]],
    targetDate: [''],
    accountId: [''],
  });

  protected readonly contributionForm = this.fb.nonNullable.group({
    amountMajor: [0, [Validators.required, Validators.min(0)]],
    note: [''],
  });

  constructor() {
    this.load();
    this.loadAccounts();
  }

  protected progress(goal: Goal): number {
    if (goal.targetAmountMinor <= 0) {
      return 0;
    }
    return Math.min(
      100,
      (goal.currentAmountMinor / goal.targetAmountMinor) * 100,
    );
  }

  protected load(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (goals) => {
        this.goals.set(goals);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected loadAccounts(): void {
    this.accountsApi.list().subscribe({
      next: (accounts) => this.accounts.set(accounts),
    });
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      name: '',
      targetAmountMajor: 0,
      currency: 'USD',
      targetDate: '',
      accountId: '',
    });
    this.formOpen.set(true);
  }

  protected openEdit(goal: Goal): void {
    this.editingId.set(goal.id);
    this.form.reset({
      name: goal.name,
      targetAmountMajor: minorToMajor(goal.targetAmountMinor),
      currency: goal.currency,
      targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : '',
      accountId: goal.accountId ?? '',
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

    const payload = {
      name: raw.name,
      targetAmountMinor: majorToMinor(raw.targetAmountMajor),
      currency: raw.currency,
      targetDate: raw.targetDate || null,
      accountId: raw.accountId || null,
    };

    const done = {
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.notifications.success(id ? 'Goal updated' : 'Goal created');
        this.load();
      },
      error: () => this.saving.set(false),
    };

    if (id) {
      this.api.update(id, payload).subscribe(done);
    } else {
      this.api.create(payload).subscribe(done);
    }
  }

  protected openContribute(goal: Goal): void {
    this.contributeId.set(goal.id);
    this.contributionForm.reset({ amountMajor: 0, note: '' });
  }

  protected cancelContribute(): void {
    this.contributeId.set(null);
  }

  protected contribute(goal: Goal): void {
    if (this.contributionForm.invalid || this.contributing()) {
      this.contributionForm.markAllAsTouched();
      return;
    }
    this.contributing.set(true);
    const raw = this.contributionForm.getRawValue();

    this.api
      .contribute(goal.id, {
        amountMinor: majorToMinor(raw.amountMajor),
        date: new Date().toISOString(),
        note: raw.note || null,
      })
      .subscribe({
        next: () => {
          this.contributing.set(false);
          this.contributeId.set(null);
          this.notifications.success(`Contributed to ${goal.name}`);
          this.load();
        },
        error: () => this.contributing.set(false),
      });
  }

  protected remove(goal: Goal): void {
    this.api.remove(goal.id).subscribe({
      next: () => {
        this.notifications.info(`Deleted ${goal.name}`);
        this.load();
      },
    });
  }
}

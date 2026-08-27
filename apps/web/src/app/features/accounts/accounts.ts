import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import type { Account, AccountType } from '@financehub/shared-types';
import { majorToMinor, minorToMajor } from '@financehub/shared-utils';

import { NotificationService } from '../../core/services/notification.service';
import { MoneyPipe } from '../../shared/money.pipe';
import { AccountsService } from './accounts.service';

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: 'CHECKING', label: 'Checking', icon: 'account_balance' },
  { value: 'SAVINGS', label: 'Savings', icon: 'savings' },
  { value: 'CREDIT_CARD', label: 'Credit card', icon: 'credit_card' },
  { value: 'CASH', label: 'Cash', icon: 'payments' },
  { value: 'WALLET', label: 'Wallet', icon: 'wallet' },
  { value: 'INVESTMENT', label: 'Investment', icon: 'trending_up' },
];

/** Accounts overview: card grid with an inline create/edit form. */
@Component({
  selector: 'fh-accounts',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MoneyPipe,
  ],
  templateUrl: './accounts.html',
  styleUrl: './accounts.scss',
})
export class Accounts {
  private readonly api = inject(AccountsService);
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);

  protected readonly accountTypes = ACCOUNT_TYPES;
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly accounts = signal<Account[]>([]);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formOpen = signal(false);

  protected readonly totalMinor = computed(() =>
    this.accounts().reduce((sum, a) => sum + a.balanceMinor, 0),
  );

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    type: ['CHECKING' as AccountType, [Validators.required]],
    currency: ['USD', [Validators.required]],
    balanceMajor: [0, [Validators.required]],
    institution: [''],
  });

  constructor() {
    this.load();
  }

  protected iconFor(type: AccountType): string {
    return (
      ACCOUNT_TYPES.find((t) => t.value === type)?.icon ?? 'account_balance'
    );
  }

  protected load(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      name: '',
      type: 'CHECKING',
      currency: 'USD',
      balanceMajor: 0,
      institution: '',
    });
    this.formOpen.set(true);
  }

  protected openEdit(account: Account): void {
    this.editingId.set(account.id);
    this.form.reset({
      name: account.name,
      type: account.type,
      currency: account.currency,
      balanceMajor: minorToMajor(account.balanceMinor, account.currency),
      institution: account.institution ?? '',
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
        this.notifications.success(id ? 'Account updated' : 'Account created');
        this.load();
      },
      error: () => this.saving.set(false),
    };

    if (id) {
      this.api
        .update(id, {
          name: raw.name,
          type: raw.type,
          currency: raw.currency,
          institution: raw.institution || null,
        })
        .subscribe(done);
    } else {
      this.api
        .create({
          name: raw.name,
          type: raw.type,
          currency: raw.currency,
          initialBalanceMinor: majorToMinor(raw.balanceMajor, raw.currency),
          institution: raw.institution || null,
        })
        .subscribe(done);
    }
  }

  protected archive(account: Account): void {
    this.api.archive(account.id).subscribe({
      next: () => {
        this.notifications.info(`Archived ${account.name}`);
        this.load();
      },
    });
  }
}

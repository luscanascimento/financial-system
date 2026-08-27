import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import type {
  Account,
  Category,
  FlowType,
  PaginationMeta,
  Transaction,
} from '@financehub/shared-types';
import { majorToMinor } from '@financehub/shared-utils';

import { NotificationService } from '../../core/services/notification.service';
import { MoneyPipe } from '../../shared/money.pipe';
import {
  TransactionsService,
  TransactionListQuery,
} from './transactions.service';

const FLOW_TYPES: { value: FlowType; label: string }[] = [
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
];

const PAGE_SIZE = 20;

/** Transactions ledger: filter bar, inline create form and a paginated table. */
@Component({
  selector: 'fh-transactions',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatProgressSpinnerModule,
    DatePipe,
    MoneyPipe,
  ],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss',
})
export class Transactions {
  private readonly api = inject(TransactionsService);
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);

  protected readonly flowTypes = FLOW_TYPES;
  protected readonly displayedColumns = [
    'date',
    'description',
    'category',
    'account',
    'amount',
    'actions',
  ];

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly transactions = signal<Transaction[]>([]);
  protected readonly meta = signal<PaginationMeta | null>(null);
  protected readonly page = signal(1);
  protected readonly accounts = signal<Account[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly formOpen = signal(false);

  private readonly accountsById = computed(() => {
    const map = new Map<string, Account>();
    for (const account of this.accounts()) {
      map.set(account.id, account);
    }
    return map;
  });

  private readonly categoriesById = computed(() => {
    const map = new Map<string, Category>();
    for (const category of this.categories()) {
      map.set(category.id, category);
    }
    return map;
  });

  protected readonly form = this.fb.nonNullable.group({
    accountId: ['', [Validators.required]],
    type: ['EXPENSE' as FlowType, [Validators.required]],
    categoryId: [''],
    amountMajor: [0, [Validators.required, Validators.min(0)]],
    description: ['', [Validators.required, Validators.maxLength(200)]],
    date: [new Date().toISOString().slice(0, 10), [Validators.required]],
    installmentTotal: [1, [Validators.min(1)]],
  });

  protected readonly filters = this.fb.nonNullable.group({
    accountId: [''],
    type: ['' as '' | FlowType],
    search: [''],
  });

  /** Categories matching the flow type currently selected in the create form. */
  protected readonly formType = signal<FlowType>('EXPENSE');
  protected readonly formCategories = computed(() =>
    this.categories().filter((c) => !c.archived && c.type === this.formType()),
  );

  constructor() {
    this.loadReferenceData();
    this.load();
  }

  protected accountName(id: string): string {
    return this.accountsById().get(id)?.name ?? 'Unknown account';
  }

  protected accountCurrency(id: string): string {
    return this.accountsById().get(id)?.currency ?? 'USD';
  }

  protected categoryName(id: string | null): string {
    if (!id) {
      return 'Uncategorized';
    }
    return this.categoriesById().get(id)?.name ?? 'Uncategorized';
  }

  /** Signed minor amount: income positive, expense negative. */
  protected signedMinor(tx: Transaction): number {
    return tx.type === 'EXPENSE' ? -tx.amountMinor : tx.amountMinor;
  }

  private loadReferenceData(): void {
    this.api.listAccounts().subscribe({
      next: (accounts) => this.accounts.set(accounts),
    });
    this.api.listCategories().subscribe({
      next: (categories) => this.categories.set(categories),
    });
  }

  protected load(): void {
    this.loading.set(true);
    const raw = this.filters.getRawValue();
    const query: TransactionListQuery = {
      page: this.page(),
      pageSize: PAGE_SIZE,
      sortBy: 'date',
      sortOrder: 'desc',
    };
    if (raw.search) {
      query.search = raw.search;
    }
    if (raw.accountId) {
      query.accountId = raw.accountId;
    }
    if (raw.type) {
      query.type = raw.type;
    }

    this.api.list(query).subscribe({
      next: (result) => {
        this.transactions.set(result.items);
        this.meta.set(result.meta);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  protected previousPage(): void {
    if (this.meta()?.hasPreviousPage) {
      this.page.update((p) => p - 1);
      this.load();
    }
  }

  protected nextPage(): void {
    if (this.meta()?.hasNextPage) {
      this.page.update((p) => p + 1);
      this.load();
    }
  }

  protected openCreate(): void {
    this.formType.set('EXPENSE');
    this.form.reset({
      accountId: '',
      type: 'EXPENSE',
      categoryId: '',
      amountMajor: 0,
      description: '',
      date: new Date().toISOString().slice(0, 10),
      installmentTotal: 1,
    });
    this.formOpen.set(true);
  }

  protected cancel(): void {
    this.formOpen.set(false);
  }

  protected onTypeChange(type: FlowType): void {
    this.formType.set(type);
    this.form.controls.categoryId.setValue('');
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const installmentTotal =
      raw.installmentTotal && raw.installmentTotal > 1
        ? raw.installmentTotal
        : undefined;

    this.api
      .create({
        accountId: raw.accountId,
        categoryId: raw.categoryId || null,
        type: raw.type,
        amountMinor: majorToMinor(
          raw.amountMajor,
          this.accountCurrency(raw.accountId),
        ),
        description: raw.description,
        date: new Date(raw.date).toISOString(),
        installmentTotal,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.formOpen.set(false);
          this.notifications.success('Transaction created');
          this.page.set(1);
          this.load();
        },
        error: () => this.saving.set(false),
      });
  }

  protected remove(tx: Transaction): void {
    this.api.remove(tx.id).subscribe({
      next: () => {
        this.notifications.info(`Deleted ${tx.description}`);
        this.load();
      },
    });
  }
}

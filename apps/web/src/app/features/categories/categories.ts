import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import type { Category, FlowType } from '@financehub/shared-types';

import { NotificationService } from '../../core/services/notification.service';
import { CategoriesService } from './categories.service';

const FLOW_TYPES: { value: FlowType; label: string; icon: string }[] = [
  { value: 'INCOME', label: 'Income', icon: 'trending_up' },
  { value: 'EXPENSE', label: 'Expense', icon: 'trending_down' },
];

const DEFAULT_COLOR = '#1565c0';

/** Categories manager: Income and Expense columns with an inline create/edit form. */
@Component({
  selector: 'fh-categories',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class Categories {
  private readonly api = inject(CategoriesService);
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);

  protected readonly flowTypes = FLOW_TYPES;
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly categories = signal<Category[]>([]);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formOpen = signal(false);

  protected readonly incomeCategories = computed(() =>
    this.categories().filter((c) => c.type === 'INCOME'),
  );
  protected readonly expenseCategories = computed(() =>
    this.categories().filter((c) => c.type === 'EXPENSE'),
  );

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    type: ['EXPENSE' as FlowType, [Validators.required]],
    color: [DEFAULT_COLOR],
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected openCreate(type: FlowType = 'EXPENSE'): void {
    this.editingId.set(null);
    this.form.reset({ name: '', type, color: DEFAULT_COLOR });
    this.form.controls.type.enable();
    this.formOpen.set(true);
  }

  protected openEdit(category: Category): void {
    this.editingId.set(category.id);
    this.form.reset({
      name: category.name,
      type: category.type,
      color: category.color ?? DEFAULT_COLOR,
    });
    // Type is immutable on edit (API only accepts name/color/icon).
    this.form.controls.type.disable();
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
        this.notifications.success(
          id ? 'Category updated' : 'Category created',
        );
        this.load();
      },
      error: () => this.saving.set(false),
    };

    if (id) {
      this.api
        .update(id, { name: raw.name, color: raw.color || null })
        .subscribe(done);
    } else {
      this.api
        .create({ name: raw.name, type: raw.type, color: raw.color || null })
        .subscribe(done);
    }
  }

  protected archive(category: Category): void {
    this.api.archive(category.id).subscribe({
      next: () => {
        this.notifications.info(`Archived ${category.name}`);
        this.load();
      },
    });
  }
}

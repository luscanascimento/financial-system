import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  BudgetPeriod,
  BudgetProgress,
  Category,
} from '@financehub/shared-types';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface BudgetInput {
  name: string;
  amountMinor: number;
  categoryId?: string | null;
  period?: BudgetPeriod;
  startDate: string;
  rollover?: boolean;
}

/** REST gateway for the budgets feature. */
@Injectable({ providedIn: 'root' })
export class BudgetsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/budgets`;
  private readonly categoriesUrl = `${environment.apiBaseUrl}/categories`;

  list(): Observable<BudgetProgress[]> {
    return this.http.get<BudgetProgress[]>(this.url);
  }

  expenseCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.categoriesUrl, {
      params: { type: 'EXPENSE' },
    });
  }

  create(input: BudgetInput): Observable<BudgetProgress> {
    return this.http.post<BudgetProgress>(this.url, input);
  }

  update(id: string, input: Partial<BudgetInput>): Observable<BudgetProgress> {
    return this.http.patch<BudgetProgress>(`${this.url}/${id}`, input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}

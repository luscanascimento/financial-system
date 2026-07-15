import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  Account,
  Category,
  FlowType,
  Paginated,
  SortOrder,
  Transaction,
  TransactionStatus,
} from '@financehub/shared-types';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface TransactionInput {
  accountId: string;
  categoryId?: string | null;
  type: FlowType;
  amountMinor: number;
  description: string;
  notes?: string | null;
  date: string;
  status?: TransactionStatus;
  installmentTotal?: number | null;
}

export interface TransactionListQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  search?: string;
  accountId?: string;
  categoryId?: string;
  type?: FlowType;
  status?: TransactionStatus;
  from?: string;
  to?: string;
}

/** REST gateway for the transactions feature. */
@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/transactions`;

  list(query: TransactionListQuery = {}): Observable<Paginated<Transaction>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<Paginated<Transaction>>(this.url, { params });
  }

  create(input: TransactionInput): Observable<Transaction> {
    return this.http.post<Transaction>(this.url, input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  listAccounts(): Observable<Account[]> {
    return this.http.get<Account[]>(`${environment.apiBaseUrl}/accounts`);
  }

  listCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${environment.apiBaseUrl}/categories`);
  }
}

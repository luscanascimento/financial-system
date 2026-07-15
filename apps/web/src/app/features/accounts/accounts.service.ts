import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Account, AccountType } from '@financehub/shared-types';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface AccountInput {
  name: string;
  type: AccountType;
  currency: string;
  initialBalanceMinor: number;
  creditLimitMinor?: number | null;
  institution?: string | null;
  color?: string | null;
  icon?: string | null;
}

/** REST gateway for the accounts feature. */
@Injectable({ providedIn: 'root' })
export class AccountsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/accounts`;

  list(includeArchived = false): Observable<Account[]> {
    return this.http.get<Account[]>(this.url, {
      params: { includeArchived: String(includeArchived) },
    });
  }

  create(input: AccountInput): Observable<Account> {
    return this.http.post<Account>(this.url, input);
  }

  update(id: string, input: Partial<AccountInput>): Observable<Account> {
    return this.http.patch<Account>(`${this.url}/${id}`, input);
  }

  archive(id: string): Observable<Account> {
    return this.http.delete<Account>(`${this.url}/${id}`);
  }
}

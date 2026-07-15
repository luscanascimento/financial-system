import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  CashFlowPoint,
  CategoryBreakdownItem,
  FinancialOverview,
  FlowType,
} from '@financehub/shared-types';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

/** REST gateway for the dashboard reports feature. */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/reports`;

  overview(): Observable<FinancialOverview> {
    return this.http.get<FinancialOverview>(`${this.url}/overview`);
  }

  cashFlow(months = 6): Observable<CashFlowPoint[]> {
    return this.http.get<CashFlowPoint[]>(`${this.url}/cash-flow`, {
      params: { months: String(months) },
    });
  }

  categoryBreakdown(
    type: FlowType = 'EXPENSE',
  ): Observable<CategoryBreakdownItem[]> {
    return this.http.get<CategoryBreakdownItem[]>(
      `${this.url}/category-breakdown`,
      {
        params: { type },
      },
    );
  }
}

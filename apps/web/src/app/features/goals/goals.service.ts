import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  Goal,
  GoalContribution,
  Paginated,
} from '@financehub/shared-types';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

export interface GoalInput {
  name: string;
  targetAmountMinor: number;
  currency?: string;
  targetDate?: string | null;
  accountId?: string | null;
  color?: string | null;
  icon?: string | null;
}

export interface ContributionInput {
  amountMinor: number;
  date: string;
  note?: string | null;
}

/** REST gateway for the goals feature. */
@Injectable({ providedIn: 'root' })
export class GoalsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/goals`;

  list(): Observable<Goal[]> {
    return this.http
      .get<Paginated<Goal>>(this.url)
      .pipe(map((page) => page.items));
  }

  create(input: GoalInput): Observable<Goal> {
    return this.http.post<Goal>(this.url, input);
  }

  update(id: string, input: Partial<GoalInput>): Observable<Goal> {
    return this.http.patch<Goal>(`${this.url}/${id}`, input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  contribute(
    id: string,
    input: ContributionInput,
  ): Observable<GoalContribution> {
    return this.http.post<GoalContribution>(
      `${this.url}/${id}/contributions`,
      input,
    );
  }

  contributions(id: string): Observable<GoalContribution[]> {
    return this.http.get<GoalContribution[]>(`${this.url}/${id}/contributions`);
  }
}

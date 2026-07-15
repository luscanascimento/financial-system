import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Category, FlowType } from '@financehub/shared-types';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface CategoryInput {
  name: string;
  type: FlowType;
  parentId?: string | null;
  color?: string | null;
  icon?: string | null;
}

/** REST gateway for the categories feature. */
@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/categories`;

  list(type?: FlowType): Observable<Category[]> {
    return this.http.get<Category[]>(this.url, {
      params: type ? { type } : {},
    });
  }

  create(input: CategoryInput): Observable<Category> {
    return this.http.post<Category>(this.url, input);
  }

  update(
    id: string,
    input: Pick<Partial<CategoryInput>, 'name' | 'color' | 'icon'>,
  ): Observable<Category> {
    return this.http.patch<Category>(`${this.url}/${id}`, input);
  }

  archive(id: string): Observable<Category> {
    return this.http.delete<Category>(`${this.url}/${id}`);
  }
}

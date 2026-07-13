/**
 * Cross-cutting API contracts shared between the NestJS backend and the Angular
 * frontend. Keeping these in one place guarantees both sides agree on the shape
 * of paginated responses, errors and sorting.
 */

export type SortOrder = 'asc' | 'desc';

/** Query parameters accepted by every list endpoint. */
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  search?: string;
}

/** Metadata describing a page of results. */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/** Envelope returned by every paginated endpoint. */
export interface Paginated<TItem> {
  items: TItem[];
  meta: PaginationMeta;
}

/** Canonical error body produced by the API's global exception filter. */
export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

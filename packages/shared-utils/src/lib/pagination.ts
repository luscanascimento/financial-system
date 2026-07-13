import type { PaginationMeta, PaginationQuery } from '@financehub/shared-types';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface ResolvedPagination {
  page: number;
  pageSize: number;
  /** Offset for the underlying data source (`skip`/`OFFSET`). */
  skip: number;
  /** Limit for the underlying data source (`take`/`LIMIT`). */
  take: number;
}

/**
 * Normalizes raw pagination input into safe, bounded values. Guards against
 * negative pages, zero page sizes and unbounded queries.
 */
export function resolvePagination(
  query: Pick<PaginationQuery, 'page' | 'pageSize'> = {},
): ResolvedPagination {
  const page = Math.max(DEFAULT_PAGE, Math.trunc(query.page ?? DEFAULT_PAGE));
  const requestedSize = Math.trunc(query.pageSize ?? DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, requestedSize || DEFAULT_PAGE_SIZE),
  );

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/**
 * Builds the {@link PaginationMeta} envelope for a page of results.
 */
export function buildPaginationMeta(
  totalItems: number,
  page: number,
  pageSize: number,
): PaginationMeta {
  const safeTotal = Math.max(0, Math.trunc(totalItems));
  const totalPages = pageSize > 0 ? Math.ceil(safeTotal / pageSize) : 0;

  return {
    page,
    pageSize,
    totalItems: safeTotal,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  buildPaginationMeta,
  resolvePagination,
} from './pagination';

describe('resolvePagination', () => {
  it('applies defaults when nothing is provided', () => {
    expect(resolvePagination()).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      skip: 0,
      take: DEFAULT_PAGE_SIZE,
    });
  });

  it('computes skip/take from page and pageSize', () => {
    expect(resolvePagination({ page: 3, pageSize: 10 })).toEqual({
      page: 3,
      pageSize: 10,
      skip: 20,
      take: 10,
    });
  });

  it('clamps page size to the maximum and floors page at 1', () => {
    const resolved = resolvePagination({ page: -5, pageSize: 1000 });
    expect(resolved.page).toBe(1);
    expect(resolved.pageSize).toBe(MAX_PAGE_SIZE);
  });
});

describe('buildPaginationMeta', () => {
  it('derives page counts and navigation flags', () => {
    const meta = buildPaginationMeta(45, 2, 20);
    expect(meta).toEqual({
      page: 2,
      pageSize: 20,
      totalItems: 45,
      totalPages: 3,
      hasPreviousPage: true,
      hasNextPage: true,
    });
  });

  it('handles an empty result set', () => {
    const meta = buildPaginationMeta(0, 1, 20);
    expect(meta.totalPages).toBe(0);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPreviousPage).toBe(false);
  });
});

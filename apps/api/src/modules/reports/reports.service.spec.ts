import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

const USER_ID = '11111111-1111-1111-1111-111111111111';

function setup() {
  const reports = {
    findAccounts: vi.fn(),
    countAccounts: vi.fn(),
    countTransactions: vi.fn(),
    sumFlowsInRange: vi.fn(),
    sumByCategory: vi.fn(),
    findCategoryMeta: vi.fn(),
  } as unknown as ReportsRepository;

  return { service: new ReportsService(reports), reports };
}

describe('ReportsService', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  describe('getCashFlow', () => {
    it('produces one oldest-first point per month with net = income - expense', async () => {
      vi.mocked(ctx.reports.sumFlowsInRange)
        .mockResolvedValueOnce({ incomeMinor: 1000, expenseMinor: 400 })
        .mockResolvedValueOnce({ incomeMinor: 500, expenseMinor: 900 });

      const points = await ctx.service.getCashFlow(USER_ID, 2);

      expect(ctx.reports.sumFlowsInRange).toHaveBeenCalledTimes(2);
      expect(points).toHaveLength(2);
      expect(points[0]).toMatchObject({
        incomeMinor: 1000,
        expenseMinor: 400,
        netMinor: 600,
      });
      expect(points[1]).toMatchObject({
        incomeMinor: 500,
        expenseMinor: 900,
        netMinor: -400,
      });
      // Oldest bucket comes first.
      expect(new Date(points[0].period).getTime()).toBeLessThan(
        new Date(points[1].period).getTime(),
      );
    });
  });

  describe('getCategoryBreakdown', () => {
    it('computes ratios against the flow total and labels uncategorized rows', async () => {
      vi.mocked(ctx.reports.sumByCategory).mockResolvedValue([
        { categoryId: 'cat-a', amountMinor: 7500 },
        { categoryId: null, amountMinor: 2500 },
      ]);
      vi.mocked(ctx.reports.findCategoryMeta).mockResolvedValue(
        new Map([['cat-a', { name: 'Food', color: '#ff0000' }]]),
      );

      const items = await ctx.service.getCategoryBreakdown(USER_ID, {
        type: 'EXPENSE',
      });

      expect(ctx.reports.sumByCategory).toHaveBeenCalledWith(
        USER_ID,
        'EXPENSE',
        undefined,
        undefined,
      );
      // Sorted by amount descending.
      expect(items[0]).toEqual({
        categoryId: 'cat-a',
        categoryName: 'Food',
        color: '#ff0000',
        type: 'EXPENSE',
        amountMinor: 7500,
        ratio: 0.75,
      });
      expect(items[1]).toEqual({
        categoryId: null,
        categoryName: 'Uncategorized',
        color: null,
        type: 'EXPENSE',
        amountMinor: 2500,
        ratio: 0.25,
      });
    });

    it('defaults ratios to 0 when the flow total is zero', async () => {
      vi.mocked(ctx.reports.sumByCategory).mockResolvedValue([
        { categoryId: 'cat-a', amountMinor: 0 },
      ]);
      vi.mocked(ctx.reports.findCategoryMeta).mockResolvedValue(
        new Map([['cat-a', { name: 'Food', color: null }]]),
      );

      const items = await ctx.service.getCategoryBreakdown(USER_ID, {});

      expect(items[0].ratio).toBe(0);
      // Defaults the flow type to EXPENSE.
      expect(items[0].type).toBe('EXPENSE');
    });
  });
});

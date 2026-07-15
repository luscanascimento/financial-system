import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Budget, Category } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BudgetsRepository } from './budgets.repository';
import { BudgetsService } from './budgets.service';

const USER_ID = '11111111-1111-1111-1111-111111111111';

const demoBudget: Budget = {
  id: '22222222-2222-2222-2222-222222222222',
  userId: USER_ID,
  categoryId: '33333333-3333-3333-3333-333333333333',
  name: 'Groceries',
  amountMinor: 50_000,
  period: 'MONTHLY',
  startDate: new Date('2026-07-01T00:00:00.000Z'),
  rollover: false,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z'),
};

const expenseCategory: Category = {
  id: '33333333-3333-3333-3333-333333333333',
  userId: USER_ID,
  name: 'Food',
  type: 'EXPENSE',
  parentId: null,
  color: null,
  icon: null,
  system: false,
  archived: false,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z'),
};

function setup() {
  const budgets = {
    create: vi.fn(),
    findMany: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    sumExpenses: vi.fn(),
    findCategory: vi.fn(),
  } as unknown as BudgetsRepository;

  return { service: new BudgetsService(budgets), budgets };
}

describe('BudgetsService', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  describe('progress math', () => {
    it('computes spent, remaining and ratio from the summed expenses', async () => {
      vi.mocked(ctx.budgets.findById).mockResolvedValue(demoBudget);
      vi.mocked(ctx.budgets.sumExpenses).mockResolvedValue(20_000);

      const progress = await ctx.service.get(USER_ID, demoBudget.id);

      expect(progress.spentMinor).toBe(20_000);
      expect(progress.remainingMinor).toBe(30_000);
      expect(progress.ratio).toBeCloseTo(0.4);
      expect(progress.categoryId).toBe(demoBudget.categoryId);
    });

    it('scopes the expense sum by user, category and the computed period bounds', async () => {
      vi.mocked(ctx.budgets.findById).mockResolvedValue(demoBudget);
      vi.mocked(ctx.budgets.sumExpenses).mockResolvedValue(0);

      const progress = await ctx.service.get(USER_ID, demoBudget.id);

      const [userId, categoryId, from, to] = vi.mocked(ctx.budgets.sumExpenses)
        .mock.calls[0];
      expect(userId).toBe(USER_ID);
      expect(categoryId).toBe(demoBudget.categoryId);
      expect((from as Date).toISOString()).toBe(progress.periodStart);
      expect((to as Date).toISOString()).toBe(progress.periodEnd);
      // Exclusive end must sit strictly after the inclusive start.
      expect((to as Date).getTime()).toBeGreaterThan((from as Date).getTime());
    });

    it('over-budget spend yields a negative remaining and a ratio above 1', async () => {
      vi.mocked(ctx.budgets.findById).mockResolvedValue(demoBudget);
      vi.mocked(ctx.budgets.sumExpenses).mockResolvedValue(60_000);

      const progress = await ctx.service.get(USER_ID, demoBudget.id);

      expect(progress.remainingMinor).toBe(-10_000);
      expect(progress.ratio).toBeCloseTo(1.2);
    });

    it('guards against divide-by-zero when the budgeted amount is 0', async () => {
      vi.mocked(ctx.budgets.findById).mockResolvedValue({
        ...demoBudget,
        amountMinor: 0,
      });
      vi.mocked(ctx.budgets.sumExpenses).mockResolvedValue(1_000);

      const progress = await ctx.service.get(USER_ID, demoBudget.id);

      expect(progress.ratio).toBe(0);
      expect(progress.remainingMinor).toBe(-1_000);
    });

    it('passes a null categoryId through for an overall budget', async () => {
      vi.mocked(ctx.budgets.findById).mockResolvedValue({
        ...demoBudget,
        categoryId: null,
      });
      vi.mocked(ctx.budgets.sumExpenses).mockResolvedValue(5_000);

      const progress = await ctx.service.get(USER_ID, demoBudget.id);

      expect(vi.mocked(ctx.budgets.sumExpenses).mock.calls[0][1]).toBeNull();
      expect(progress.categoryId).toBeNull();
    });
  });

  describe('list', () => {
    it('returns progress for every budget the user owns', async () => {
      vi.mocked(ctx.budgets.findMany).mockResolvedValue([
        demoBudget,
        { ...demoBudget, id: 'b2', categoryId: null },
      ]);
      vi.mocked(ctx.budgets.sumExpenses)
        .mockResolvedValueOnce(10_000)
        .mockResolvedValueOnce(0);

      const result = await ctx.service.list(USER_ID);

      expect(result).toHaveLength(2);
      expect(result[0].spentMinor).toBe(10_000);
      expect(result[1].remainingMinor).toBe(50_000);
    });
  });

  describe('get', () => {
    it("throws NotFound when the budget is not the caller's", async () => {
      vi.mocked(ctx.budgets.findById).mockResolvedValue(null);

      await expect(
        ctx.service.get(USER_ID, demoBudget.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('rejects a category that is not an expense category', async () => {
      vi.mocked(ctx.budgets.findCategory).mockResolvedValue({
        ...expenseCategory,
        type: 'INCOME',
      });

      await expect(
        ctx.service.create(USER_ID, {
          name: 'Salary',
          amountMinor: 1_000,
          categoryId: expenseCategory.id,
          startDate: '2026-07-01T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a category owned by another user', async () => {
      vi.mocked(ctx.budgets.findCategory).mockResolvedValue(null);

      await expect(
        ctx.service.create(USER_ID, {
          name: 'Groceries',
          amountMinor: 1_000,
          categoryId: expenseCategory.id,
          startDate: '2026-07-01T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('persists a valid budget and returns its progress', async () => {
      vi.mocked(ctx.budgets.findCategory).mockResolvedValue(expenseCategory);
      vi.mocked(ctx.budgets.create).mockResolvedValue(demoBudget);
      vi.mocked(ctx.budgets.sumExpenses).mockResolvedValue(0);

      const progress = await ctx.service.create(USER_ID, {
        name: 'Groceries',
        amountMinor: 50_000,
        categoryId: expenseCategory.id,
        startDate: '2026-07-01T00:00:00.000Z',
      });

      expect(ctx.budgets.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, amountMinor: 50_000 }),
      );
      expect(progress.remainingMinor).toBe(50_000);
    });
  });

  describe('delete', () => {
    it('throws NotFound before deleting when the budget is not owned', async () => {
      vi.mocked(ctx.budgets.findById).mockResolvedValue(null);

      await expect(
        ctx.service.delete(USER_ID, demoBudget.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(ctx.budgets.delete).not.toHaveBeenCalled();
    });
  });
});

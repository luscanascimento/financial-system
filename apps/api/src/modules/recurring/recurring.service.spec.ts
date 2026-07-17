import { NotFoundException } from '@nestjs/common';
import type { Account, RecurringTransaction } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccountsRepository } from '../accounts/accounts.repository';
import type { TransactionsService } from '../transactions/transactions.service';
import { RecurringService } from './recurring.service';
import type { RecurringRepository } from './recurring.repository';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const ACCOUNT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function template(
  overrides: Partial<RecurringTransaction> = {},
): RecurringTransaction {
  return {
    id: 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr',
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    categoryId: null,
    type: 'EXPENSE',
    amountMinor: 1299,
    description: 'Streaming',
    frequency: 'MONTHLY',
    interval: 1,
    startDate: new Date('2026-06-15T00:00:00.000Z'),
    nextRunDate: new Date('2026-06-15T00:00:00.000Z'),
    endDate: null,
    active: true,
    lastRunAt: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

function setup() {
  const recurring = {
    findMany: vi.fn(),
    findById: vi.fn(),
    findDue: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as RecurringRepository;

  const transactions = {
    create: vi.fn(),
  } as unknown as TransactionsService;

  const accounts = {
    findById: vi.fn().mockResolvedValue({ id: ACCOUNT_ID } as Account),
  } as unknown as AccountsRepository;

  return {
    service: new RecurringService(recurring, transactions, accounts),
    recurring,
    transactions,
    accounts,
  };
}

describe('RecurringService', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  describe('create', () => {
    it('seeds nextRunDate from startDate', async () => {
      vi.mocked(ctx.recurring.create).mockImplementation(async (data) =>
        template({
          startDate: new Date(data.startDate as string),
          nextRunDate: new Date(data.nextRunDate as string),
        }),
      );

      await ctx.service.create(USER_ID, {
        accountId: ACCOUNT_ID,
        type: 'EXPENSE',
        amountMinor: 1299,
        description: 'Streaming',
        frequency: 'MONTHLY',
        startDate: '2026-07-15T00:00:00.000Z',
      });

      const [data] = vi.mocked(ctx.recurring.create).mock.calls[0];
      expect(data.nextRunDate).toEqual(data.startDate);
    });

    it('rejects an account the user does not own', async () => {
      vi.mocked(ctx.accounts.findById).mockResolvedValue(null);
      await expect(
        ctx.service.create(USER_ID, {
          accountId: ACCOUNT_ID,
          type: 'EXPENSE',
          amountMinor: 1299,
          description: 'Streaming',
          frequency: 'MONTHLY',
          startDate: '2026-07-15T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('runDue', () => {
    it('generates a transaction and advances the schedule by one month', async () => {
      const now = new Date('2026-07-20T00:00:00.000Z');
      vi.mocked(ctx.recurring.findDue).mockResolvedValue([template()]);

      const result = await ctx.service.runDue(USER_ID, now);

      expect(ctx.transactions.create).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ accountId: ACCOUNT_ID, amountMinor: 1299 }),
      );
      const [, updateData] = vi.mocked(ctx.recurring.update).mock.calls[0];
      expect((updateData.nextRunDate as Date).toISOString()).toBe(
        '2026-07-15T00:00:00.000Z',
      );
      expect(updateData.lastRunAt).toEqual(now);
      expect(result).toEqual({ processed: 1, generated: 1, failed: 0 });
    });

    it('advances a weekly template by interval weeks', async () => {
      const now = new Date('2026-07-20T00:00:00.000Z');
      vi.mocked(ctx.recurring.findDue).mockResolvedValue([
        template({
          frequency: 'WEEKLY',
          interval: 2,
          nextRunDate: new Date('2026-07-01T00:00:00.000Z'),
        }),
      ]);

      await ctx.service.runDue(USER_ID, now);

      const [, updateData] = vi.mocked(ctx.recurring.update).mock.calls[0];
      expect((updateData.nextRunDate as Date).toISOString()).toBe(
        '2026-07-15T00:00:00.000Z',
      );
    });

    it('does nothing when no templates are due', async () => {
      vi.mocked(ctx.recurring.findDue).mockResolvedValue([]);
      const result = await ctx.service.runDue(USER_ID);
      expect(ctx.transactions.create).not.toHaveBeenCalled();
      expect(result).toEqual({ processed: 0, generated: 0, failed: 0 });
    });

    it('isolates a failing template so the rest of the batch still runs', async () => {
      const now = new Date('2026-07-20T00:00:00.000Z');
      vi.mocked(ctx.recurring.findDue).mockResolvedValue([
        template({ id: 'bad' }),
        template({ id: 'good' }),
      ]);
      vi.mocked(ctx.transactions.create)
        .mockRejectedValueOnce(new Error('insufficient funds'))
        .mockResolvedValueOnce(undefined as never);

      const result = await ctx.service.runDue(USER_ID, now);

      // The good template is still processed despite the earlier failure.
      expect(result).toEqual({ processed: 2, generated: 1, failed: 1 });
      // The failing template's schedule is NOT advanced (it retries next run).
      expect(ctx.recurring.update).toHaveBeenCalledTimes(1);
    });
  });
});

import { NotFoundException } from '@nestjs/common';
import type { Account, Category, Transaction } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { AccountsRepository } from '../accounts/accounts.repository';
import type { CategoriesRepository } from '../categories/categories.repository';
import { TransactionsService } from './transactions.service';
import type { TransactionsRepository } from './transactions.repository';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const ACCOUNT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CATEGORY_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function account(): Account {
  return {
    id: ACCOUNT_ID,
    userId: USER_ID,
    name: 'Checking',
    type: 'CHECKING',
    currency: 'USD',
    balanceMinor: 0,
    initialBalanceMinor: 0,
    creditLimitMinor: null,
    institution: null,
    color: null,
    icon: null,
    archived: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tttttttt-tttt-tttt-tttt-tttttttttttt',
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    categoryId: null,
    type: 'EXPENSE',
    amountMinor: 5000,
    description: 'Coffee',
    notes: null,
    date: new Date('2026-07-15T00:00:00.000Z'),
    status: 'CLEARED',
    installmentGroupId: null,
    installmentNumber: null,
    installmentTotal: null,
    recurringTransactionId: null,
    createdAt: new Date('2026-07-15T00:00:00.000Z'),
    updatedAt: new Date('2026-07-15T00:00:00.000Z'),
    ...overrides,
  };
}

function setup() {
  const tx = {} as never;
  const prisma = {
    $transaction: vi.fn(async (cb: (t: never) => unknown) => cb(tx)),
  } as unknown as PrismaService;

  const transactions = {
    findManyPaginated: vi.fn(),
    count: vi.fn(),
    findById: vi.fn(),
    findByGroup: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteByGroup: vi.fn(),
  } as unknown as TransactionsRepository;

  const accounts = {
    findById: vi.fn().mockResolvedValue(account()),
    adjustBalance: vi.fn(),
  } as unknown as AccountsRepository;

  const categories = {
    findById: vi.fn(),
  } as unknown as CategoriesRepository;

  return {
    service: new TransactionsService(
      prisma,
      transactions,
      accounts,
      categories,
    ),
    prisma,
    transactions,
    accounts,
    categories,
    tx,
  };
}

describe('TransactionsService', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  describe('create', () => {
    it('subtracts the amount for an EXPENSE', async () => {
      vi.mocked(ctx.transactions.create).mockResolvedValue(transaction());

      await ctx.service.create(USER_ID, {
        accountId: ACCOUNT_ID,
        type: 'EXPENSE',
        amountMinor: 5000,
        description: 'Coffee',
        date: '2026-07-15T00:00:00.000Z',
      });

      expect(ctx.accounts.adjustBalance).toHaveBeenCalledWith(
        ACCOUNT_ID,
        -5000,
        ctx.tx,
      );
    });

    it('adds the amount for an INCOME', async () => {
      vi.mocked(ctx.transactions.create).mockResolvedValue(
        transaction({ type: 'INCOME', amountMinor: 250000 }),
      );

      await ctx.service.create(USER_ID, {
        accountId: ACCOUNT_ID,
        type: 'INCOME',
        amountMinor: 250000,
        description: 'Salary',
        date: '2026-07-15T00:00:00.000Z',
      });

      expect(ctx.accounts.adjustBalance).toHaveBeenCalledWith(
        ACCOUNT_ID,
        250000,
        ctx.tx,
      );
    });

    it('splits into N legs and adjusts the balance per leg', async () => {
      vi.mocked(ctx.transactions.create).mockImplementation(async () =>
        transaction({ installmentTotal: 3 }),
      );

      await ctx.service.create(USER_ID, {
        accountId: ACCOUNT_ID,
        type: 'EXPENSE',
        amountMinor: 3000,
        description: 'TV',
        date: '2026-07-15T00:00:00.000Z',
        installmentTotal: 3,
      });

      expect(ctx.transactions.create).toHaveBeenCalledTimes(3);
      expect(ctx.accounts.adjustBalance).toHaveBeenCalledTimes(3);
      expect(ctx.accounts.adjustBalance).toHaveBeenLastCalledWith(
        ACCOUNT_ID,
        -3000,
        ctx.tx,
      );
    });

    it('rejects a category whose type does not match', async () => {
      vi.mocked(ctx.categories.findById).mockResolvedValue({
        id: CATEGORY_ID,
        type: 'INCOME',
      } as Category);

      await expect(
        ctx.service.create(USER_ID, {
          accountId: ACCOUNT_ID,
          categoryId: CATEGORY_ID,
          type: 'EXPENSE',
          amountMinor: 5000,
          description: 'Coffee',
          date: '2026-07-15T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an account the user does not own', async () => {
      vi.mocked(ctx.accounts.findById).mockResolvedValue(null);

      await expect(
        ctx.service.create(USER_ID, {
          accountId: ACCOUNT_ID,
          type: 'EXPENSE',
          amountMinor: 5000,
          description: 'Coffee',
          date: '2026-07-15T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('reverses the old effect and applies the new one', async () => {
      vi.mocked(ctx.transactions.findById).mockResolvedValue(
        transaction({ type: 'EXPENSE', amountMinor: 5000 }),
      );
      vi.mocked(ctx.transactions.update).mockResolvedValue(
        transaction({ type: 'EXPENSE', amountMinor: 8000 }),
      );

      await ctx.service.update(USER_ID, transaction().id, {
        amountMinor: 8000,
      });

      // reverse old EXPENSE 5000 -> +5000
      expect(ctx.accounts.adjustBalance).toHaveBeenCalledWith(
        ACCOUNT_ID,
        5000,
        ctx.tx,
      );
      // apply new EXPENSE 8000 -> -8000
      expect(ctx.accounts.adjustBalance).toHaveBeenCalledWith(
        ACCOUNT_ID,
        -8000,
        ctx.tx,
      );
    });
  });

  describe('delete', () => {
    it('reverses the balance effect of a single transaction', async () => {
      vi.mocked(ctx.transactions.findById).mockResolvedValue(
        transaction({ type: 'EXPENSE', amountMinor: 5000 }),
      );

      await ctx.service.delete(USER_ID, transaction().id);

      expect(ctx.accounts.adjustBalance).toHaveBeenCalledWith(
        ACCOUNT_ID,
        5000,
        ctx.tx,
      );
      expect(ctx.transactions.delete).toHaveBeenCalled();
    });

    it('reverses every leg of an installment group', async () => {
      vi.mocked(ctx.transactions.findById).mockResolvedValue(
        transaction({
          installmentGroupId: 'gggggggg-gggg-gggg-gggg-gggggggggggg',
        }),
      );
      vi.mocked(ctx.transactions.findByGroup).mockResolvedValue([
        transaction({ id: 'l1', amountMinor: 1000 }),
        transaction({ id: 'l2', amountMinor: 1000 }),
      ]);

      await ctx.service.delete(USER_ID, transaction().id);

      expect(ctx.accounts.adjustBalance).toHaveBeenCalledTimes(2);
      expect(ctx.transactions.deleteByGroup).toHaveBeenCalled();
    });
  });
});

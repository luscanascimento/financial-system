import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Account, Transfer } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { AccountsRepository } from '../accounts/accounts.repository';
import { TransfersService } from './transfers.service';
import type { TransfersRepository } from './transfers.repository';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const FROM_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const TO_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function account(id: string): Account {
  return {
    id,
    userId: USER_ID,
    name: 'Account',
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

function transfer(overrides: Partial<Transfer> = {}): Transfer {
  return {
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    userId: USER_ID,
    fromAccountId: FROM_ID,
    toAccountId: TO_ID,
    fromAmountMinor: 50000,
    toAmountMinor: 50000,
    description: null,
    date: new Date('2026-07-15T00:00:00.000Z'),
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

  const transfers = {
    findManyPaginated: vi.fn(),
    count: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  } as unknown as TransfersRepository;

  const accounts = {
    findById: vi.fn(async (_userId: string, id: string) => account(id)),
    adjustBalance: vi.fn(),
  } as unknown as AccountsRepository;

  return {
    service: new TransfersService(prisma, transfers, accounts),
    prisma,
    transfers,
    accounts,
    tx,
  };
}

describe('TransfersService', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  describe('create', () => {
    it('rejects a transfer to the same account', async () => {
      await expect(
        ctx.service.create(USER_ID, {
          fromAccountId: FROM_ID,
          toAccountId: FROM_ID,
          fromAmountMinor: 1000,
          date: '2026-07-15T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when an account is not owned', async () => {
      vi.mocked(ctx.accounts.findById).mockResolvedValueOnce(null);
      await expect(
        ctx.service.create(USER_ID, {
          fromAccountId: FROM_ID,
          toAccountId: TO_ID,
          fromAmountMinor: 1000,
          date: '2026-07-15T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('debits source and credits destination; defaults toAmount', async () => {
      vi.mocked(ctx.transfers.create).mockResolvedValue(transfer());

      await ctx.service.create(USER_ID, {
        fromAccountId: FROM_ID,
        toAccountId: TO_ID,
        fromAmountMinor: 50000,
        date: '2026-07-15T00:00:00.000Z',
      });

      expect(ctx.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({ toAmountMinor: 50000 }),
        ctx.tx,
      );
      expect(ctx.accounts.adjustBalance).toHaveBeenCalledWith(
        FROM_ID,
        -50000,
        ctx.tx,
      );
      expect(ctx.accounts.adjustBalance).toHaveBeenCalledWith(
        TO_ID,
        50000,
        ctx.tx,
      );
    });

    it('honours a distinct toAmountMinor for cross-currency transfers', async () => {
      vi.mocked(ctx.transfers.create).mockResolvedValue(
        transfer({ fromAmountMinor: 10000, toAmountMinor: 9200 }),
      );

      await ctx.service.create(USER_ID, {
        fromAccountId: FROM_ID,
        toAccountId: TO_ID,
        fromAmountMinor: 10000,
        toAmountMinor: 9200,
        date: '2026-07-15T00:00:00.000Z',
      });

      expect(ctx.accounts.adjustBalance).toHaveBeenCalledWith(
        FROM_ID,
        -10000,
        ctx.tx,
      );
      expect(ctx.accounts.adjustBalance).toHaveBeenCalledWith(
        TO_ID,
        9200,
        ctx.tx,
      );
    });
  });

  describe('delete', () => {
    it('reverses both legs', async () => {
      vi.mocked(ctx.transfers.findById).mockResolvedValue(
        transfer({ fromAmountMinor: 50000, toAmountMinor: 50000 }),
      );

      await ctx.service.delete(USER_ID, transfer().id);

      expect(ctx.accounts.adjustBalance).toHaveBeenCalledWith(
        FROM_ID,
        50000,
        ctx.tx,
      );
      expect(ctx.accounts.adjustBalance).toHaveBeenCalledWith(
        TO_ID,
        -50000,
        ctx.tx,
      );
      expect(ctx.transfers.delete).toHaveBeenCalled();
    });
  });
});

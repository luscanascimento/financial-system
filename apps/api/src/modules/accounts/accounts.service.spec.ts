import { NotFoundException } from '@nestjs/common';
import type { Account } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountsService } from './accounts.service';
import type { AccountsRepository } from './accounts.repository';

const USER_ID = '11111111-1111-1111-1111-111111111111';

const demoAccount: Account = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  userId: USER_ID,
  name: 'Everyday Checking',
  type: 'CHECKING',
  currency: 'USD',
  balanceMinor: 100000,
  initialBalanceMinor: 100000,
  creditLimitMinor: null,
  institution: null,
  color: null,
  icon: null,
  archived: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function setup() {
  const accounts = {
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    adjustBalance: vi.fn(),
  } as unknown as AccountsRepository;

  return { service: new AccountsService(accounts), accounts };
}

describe('AccountsService', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  describe('create', () => {
    it('seeds balanceMinor from initialBalanceMinor', async () => {
      vi.mocked(ctx.accounts.create).mockResolvedValue(demoAccount);

      const dto = await ctx.service.create(USER_ID, {
        name: 'Everyday Checking',
        type: 'CHECKING',
        initialBalanceMinor: 100000,
      });

      expect(ctx.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          balanceMinor: 100000,
          initialBalanceMinor: 100000,
          currency: 'USD',
        }),
      );
      expect(dto.balanceMinor).toBe(100000);
    });
  });

  describe('get', () => {
    it('maps an owned account to the DTO', async () => {
      vi.mocked(ctx.accounts.findById).mockResolvedValue(demoAccount);
      const dto = await ctx.service.get(USER_ID, demoAccount.id);
      expect(dto.id).toBe(demoAccount.id);
      expect(dto.createdAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('throws NotFound for a foreign or missing account', async () => {
      vi.mocked(ctx.accounts.findById).mockResolvedValue(null);
      await expect(
        ctx.service.get(USER_ID, demoAccount.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('archive', () => {
    it('rejects archiving an account the user does not own', async () => {
      vi.mocked(ctx.accounts.findById).mockResolvedValue(null);
      await expect(
        ctx.service.archive(USER_ID, demoAccount.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(ctx.accounts.archive).not.toHaveBeenCalled();
    });
  });
});

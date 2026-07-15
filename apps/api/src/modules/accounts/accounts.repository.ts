import { Injectable } from '@nestjs/common';
import type { Account, Prisma } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/**
 * Persistence gateway for accounts. The only place feature code touches the
 * Prisma `account` model. Balance-mutating methods accept an optional
 * transaction client so the ledger services can adjust balances atomically.
 *
 * `update`/`archive` key by `id` alone (Prisma requires a unique selector);
 * the service verifies ownership via {@link findById} before calling them.
 */
@Injectable()
export class AccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    userId: string,
    options: { includeArchived?: boolean } = {},
  ): Promise<Account[]> {
    return this.prisma.account.findMany({
      where: {
        userId,
        ...(options.includeArchived ? {} : { archived: false }),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findById(
    userId: string,
    id: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Account | null> {
    return tx.account.findFirst({ where: { id, userId } });
  }

  create(data: Prisma.AccountUncheckedCreateInput): Promise<Account> {
    return this.prisma.account.create({ data });
  }

  async update(
    userId: string,
    id: string,
    data: Prisma.AccountUncheckedUpdateInput,
  ): Promise<Account> {
    const result = await this.prisma.account.updateMany({
      where: { id, userId },
      data,
    });
    return result.count > 0
      ? this.prisma.account.findUniqueOrThrow({ where: { id } })
      : (null as unknown as Account);
  }

  async archive(userId: string, id: string): Promise<Account> {
    const result = await this.prisma.account.updateMany({
      where: { id, userId },
      data: { archived: true },
    });
    return result.count > 0
      ? this.prisma.account.findUniqueOrThrow({ where: { id } })
      : (null as unknown as Account);
  }

  /**
   * Increments an account's running balance by `deltaMinor` (may be negative).
   * Always called inside a caller-owned `$transaction` so balances never drift.
   */
  async adjustBalance(
    id: string,
    deltaMinor: number,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await tx.account.update({
      where: { id },
      data: { balanceMinor: { increment: deltaMinor } },
    });
  }
}

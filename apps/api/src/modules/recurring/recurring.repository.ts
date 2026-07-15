import { Injectable } from '@nestjs/common';
import type { Prisma, RecurringTransaction } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/**
 * Persistence gateway for recurring-transaction templates. The only place
 * feature code touches the Prisma `recurringTransaction` model.
 */
@Injectable()
export class RecurringRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(userId: string): Promise<RecurringTransaction[]> {
    return this.prisma.recurringTransaction.findMany({
      where: { userId },
      orderBy: { nextRunDate: 'asc' },
    });
  }

  findById(
    userId: string,
    id: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<RecurringTransaction | null> {
    return tx.recurringTransaction.findFirst({ where: { id, userId } });
  }

  /**
   * Active templates that are due to run: `nextRunDate <= now` and not past
   * their `endDate`. Optionally scoped to a single user.
   */
  findDue(now: Date, userId?: string): Promise<RecurringTransaction[]> {
    return this.prisma.recurringTransaction.findMany({
      where: {
        active: true,
        nextRunDate: { lte: now },
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
        ...(userId ? { userId } : {}),
      },
      orderBy: { nextRunDate: 'asc' },
    });
  }

  create(
    data: Prisma.RecurringTransactionUncheckedCreateInput,
  ): Promise<RecurringTransaction> {
    return this.prisma.recurringTransaction.create({ data });
  }

  update(
    id: string,
    data: Prisma.RecurringTransactionUncheckedUpdateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<RecurringTransaction> {
    return tx.recurringTransaction.update({ where: { id }, data });
  }

  delete(id: string): Promise<RecurringTransaction> {
    return this.prisma.recurringTransaction.delete({ where: { id } });
  }
}

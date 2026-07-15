import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Budget, Category } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/**
 * Persistence gateway for budgets. The only place feature code touches the
 * Prisma `budget` model, and the source of the actual-spend aggregation read
 * off the transactions ledger.
 */
@Injectable()
export class BudgetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.BudgetUncheckedCreateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Budget> {
    return tx.budget.create({ data });
  }

  findMany(userId: string): Promise<Budget[]> {
    return this.prisma.budget.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Fetches a budget owned by `userId`, or `null` when it belongs to someone else. */
  findById(userId: string, id: string): Promise<Budget | null> {
    return this.prisma.budget.findFirst({ where: { id, userId } });
  }

  /**
   * Resolves a category the user owns, used to validate that a budget's
   * `categoryId` exists, belongs to the caller and classifies expenses.
   */
  findCategory(userId: string, categoryId: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { id: categoryId, userId },
    });
  }

  update(
    id: string,
    data: Prisma.BudgetUncheckedUpdateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Budget> {
    return tx.budget.update({ where: { id }, data });
  }

  async delete(
    id: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await tx.budget.delete({ where: { id } });
  }

  /**
   * Sums cleared and pending EXPENSE transactions for `userId` in the
   * `[from, to)` window. When `categoryId` is null the sum spans every expense
   * category (an overall budget); otherwise it is scoped to that category.
   */
  async sumExpenses(
    userId: string,
    categoryId: string | null,
    from: Date,
    to: Date,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<number> {
    const aggregate = await tx.transaction.aggregate({
      _sum: { amountMinor: true },
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: from, lt: to },
        ...(categoryId ? { categoryId } : {}),
      },
    });
    return aggregate._sum.amountMinor ?? 0;
  }
}

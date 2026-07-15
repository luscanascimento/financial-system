import { Injectable } from '@nestjs/common';
import type { Account, FlowType, Prisma } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/** A flow total (income or expense) summed over some window. */
export interface FlowTotals {
  incomeMinor: number;
  expenseMinor: number;
}

/** A single category's aggregated amount for a flow type. */
export interface CategoryAmount {
  categoryId: string | null;
  amountMinor: number;
}

/**
 * Persistence gateway for read-only reporting aggregations. The only place the
 * reports feature touches the Prisma `account`, `transaction` and `category`
 * models; every query is scoped by `userId`.
 */
@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Every non-archived account belonging to the user. */
  findAccounts(
    userId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Account[]> {
    return tx.account.findMany({ where: { userId, archived: false } });
  }

  /** Total number of accounts (including archived) for the user. */
  countAccounts(
    userId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<number> {
    return tx.account.count({ where: { userId } });
  }

  /** Total number of transactions for the user. */
  countTransactions(
    userId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<number> {
    return tx.transaction.count({ where: { userId } });
  }

  /**
   * Sums income and expense amounts over the half-open date range
   * `[from, to)`. Both totals are returned as positive minor units.
   */
  async sumFlowsInRange(
    userId: string,
    from: Date,
    to: Date,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<FlowTotals> {
    const grouped = await tx.transaction.groupBy({
      by: ['type'],
      where: { userId, date: { gte: from, lt: to } },
      _sum: { amountMinor: true },
    });

    return {
      incomeMinor: sumForType(grouped, 'INCOME'),
      expenseMinor: sumForType(grouped, 'EXPENSE'),
    };
  }

  /**
   * Sums the given flow `type` grouped by category over the half-open range
   * `[from, to)`. Uncategorized transactions surface as `categoryId: null`.
   */
  async sumByCategory(
    userId: string,
    type: FlowType,
    from: Date | undefined,
    to: Date | undefined,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<CategoryAmount[]> {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (from) {
      dateFilter.gte = from;
    }
    if (to) {
      dateFilter.lt = to;
    }

    const grouped = await tx.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type,
        ...(from || to ? { date: dateFilter } : {}),
      },
      _sum: { amountMinor: true },
    });

    return grouped.map((row) => ({
      categoryId: row.categoryId,
      amountMinor: row._sum.amountMinor ?? 0,
    }));
  }

  /** Loads name/color for the given category ids, keyed by id. */
  async findCategoryMeta(
    userId: string,
    categoryIds: string[],
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Map<string, { name: string; color: string | null }>> {
    if (categoryIds.length === 0) {
      return new Map();
    }
    const categories = await tx.category.findMany({
      where: { userId, id: { in: categoryIds } },
      select: { id: true, name: true, color: true },
    });
    return new Map(
      categories.map((category) => [
        category.id,
        { name: category.name, color: category.color },
      ]),
    );
  }
}

/** Extracts a single flow type's summed amount from a groupBy-on-type result. */
function sumForType(
  grouped: Array<{ type: FlowType; _sum: { amountMinor: number | null } }>,
  type: FlowType,
): number {
  const row = grouped.find((entry) => entry.type === type);
  return row?._sum.amountMinor ?? 0;
}

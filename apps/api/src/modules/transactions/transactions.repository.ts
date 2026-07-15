import { Injectable } from '@nestjs/common';
import type { Prisma, Transaction } from '@prisma/client';

import type { ResolvedPagination } from '@financehub/shared-utils';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { TransactionListFilters } from './transactions.types';

/**
 * Persistence gateway for transactions. The only place feature code touches the
 * Prisma `transaction` model. Write methods accept an optional transaction
 * client so the service can adjust account balances atomically.
 */
@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns one page of the user's transactions matching `filters`. */
  findManyPaginated(
    userId: string,
    filters: TransactionListFilters,
    pagination: ResolvedPagination,
    sort: { field: string; order: Prisma.SortOrder },
  ): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: this.buildWhere(userId, filters),
      orderBy: { [sort.field]: sort.order },
      skip: pagination.skip,
      take: pagination.take,
    });
  }

  count(userId: string, filters: TransactionListFilters): Promise<number> {
    return this.prisma.transaction.count({
      where: this.buildWhere(userId, filters),
    });
  }

  findById(
    userId: string,
    id: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Transaction | null> {
    return tx.transaction.findFirst({ where: { id, userId } });
  }

  /** Loads every leg of an installment group owned by the user. */
  findByGroup(
    userId: string,
    installmentGroupId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Transaction[]> {
    return tx.transaction.findMany({
      where: { userId, installmentGroupId },
    });
  }

  create(
    data: Prisma.TransactionUncheckedCreateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Transaction> {
    return tx.transaction.create({ data });
  }

  createMany(
    data: Prisma.TransactionUncheckedCreateInput[],
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Prisma.BatchPayload> {
    return tx.transaction.createMany({ data });
  }

  update(
    id: string,
    data: Prisma.TransactionUncheckedUpdateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Transaction> {
    return tx.transaction.update({ where: { id }, data });
  }

  delete(
    id: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Transaction> {
    return tx.transaction.delete({ where: { id } });
  }

  deleteByGroup(
    installmentGroupId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Prisma.BatchPayload> {
    return tx.transaction.deleteMany({ where: { installmentGroupId } });
  }

  private buildWhere(
    userId: string,
    filters: TransactionListFilters,
  ): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = { userId };

    if (filters.accountId) where.accountId = filters.accountId;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    if (filters.from || filters.to) {
      where.date = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }

    if (
      filters.minAmountMinor !== undefined ||
      filters.maxAmountMinor !== undefined
    ) {
      where.amountMinor = {
        ...(filters.minAmountMinor !== undefined
          ? { gte: filters.minAmountMinor }
          : {}),
        ...(filters.maxAmountMinor !== undefined
          ? { lte: filters.maxAmountMinor }
          : {}),
      };
    }

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}

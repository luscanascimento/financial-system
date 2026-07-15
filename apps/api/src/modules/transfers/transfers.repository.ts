import { Injectable } from '@nestjs/common';
import type { Prisma, Transfer } from '@prisma/client';

import type { ResolvedPagination } from '@financehub/shared-utils';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/** Normalised filter set the transfers repository understands. */
export interface TransferListFilters {
  fromAccountId?: string;
  toAccountId?: string;
  from?: Date;
  to?: Date;
  search?: string;
}

/**
 * Persistence gateway for transfers. The only place feature code touches the
 * Prisma `transfer` model. Write methods accept an optional transaction client
 * so the service can debit/credit account balances atomically.
 */
@Injectable()
export class TransfersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyPaginated(
    userId: string,
    filters: TransferListFilters,
    pagination: ResolvedPagination,
    sort: { field: string; order: Prisma.SortOrder },
  ): Promise<Transfer[]> {
    return this.prisma.transfer.findMany({
      where: this.buildWhere(userId, filters),
      orderBy: { [sort.field]: sort.order },
      skip: pagination.skip,
      take: pagination.take,
    });
  }

  count(userId: string, filters: TransferListFilters): Promise<number> {
    return this.prisma.transfer.count({
      where: this.buildWhere(userId, filters),
    });
  }

  findById(
    userId: string,
    id: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Transfer | null> {
    return tx.transfer.findFirst({ where: { id, userId } });
  }

  create(
    data: Prisma.TransferUncheckedCreateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Transfer> {
    return tx.transfer.create({ data });
  }

  delete(
    id: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Transfer> {
    return tx.transfer.delete({ where: { id } });
  }

  private buildWhere(
    userId: string,
    filters: TransferListFilters,
  ): Prisma.TransferWhereInput {
    const where: Prisma.TransferWhereInput = { userId };

    if (filters.fromAccountId) where.fromAccountId = filters.fromAccountId;
    if (filters.toAccountId) where.toAccountId = filters.toAccountId;

    if (filters.from || filters.to) {
      where.date = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }

    if (filters.search) {
      where.description = { contains: filters.search, mode: 'insensitive' };
    }

    return where;
  }
}

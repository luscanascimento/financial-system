import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Paginated,
  Transaction as TransactionDto,
} from '@financehub/shared-types';
import {
  addMonths,
  buildPaginationMeta,
  resolvePagination,
} from '@financehub/shared-utils';
import type { Prisma, Transaction } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AccountsRepository } from '../accounts/accounts.repository';
import { CategoriesRepository } from '../categories/categories.repository';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { toTransactionDto } from './mappers/transaction.mapper';
import { TransactionsRepository } from './transactions.repository';
import type { TransactionListFilters } from './transactions.types';

const SORTABLE_FIELDS = new Set(['date', 'amountMinor', 'createdAt']);

/**
 * The income/expense ledger. Every balance mutation runs inside a
 * `prisma.$transaction` alongside the row write so account balances never
 * drift. All reads and writes are scoped by `userId`.
 */
@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionsRepository,
    private readonly accounts: AccountsRepository,
    private readonly categories: CategoriesRepository,
  ) {}

  async list(
    userId: string,
    query: QueryTransactionsDto,
  ): Promise<Paginated<TransactionDto>> {
    const pagination = resolvePagination(query);
    const filters = this.toFilters(query);
    const sortField = SORTABLE_FIELDS.has(query.sortBy ?? '')
      ? (query.sortBy as string)
      : 'date';
    const sortOrder: Prisma.SortOrder =
      query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [rows, totalItems] = await Promise.all([
      this.transactions.findManyPaginated(userId, filters, pagination, {
        field: sortField,
        order: sortOrder,
      }),
      this.transactions.count(userId, filters),
    ]);

    return {
      items: rows.map(toTransactionDto),
      meta: buildPaginationMeta(
        totalItems,
        pagination.page,
        pagination.pageSize,
      ),
    };
  }

  async get(userId: string, id: string): Promise<TransactionDto> {
    return toTransactionDto(await this.getOwnedOrThrow(userId, id));
  }

  /**
   * Records a transaction. When `installmentTotal > 1` the amount is treated as
   * the per-leg amount and N monthly legs are created (dates advancing one
   * month each), every leg adjusting the account balance.
   */
  async create(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<TransactionDto> {
    await this.assertAccountOwned(userId, dto.accountId);
    await this.assertCategoryCompatible(userId, dto.categoryId, dto.type);

    const legs = Math.max(1, dto.installmentTotal ?? 1);
    const baseDate = new Date(dto.date);
    const created = await this.prisma.$transaction(async (tx) => {
      if (legs === 1) {
        const row = await this.transactions.create(
          {
            userId,
            accountId: dto.accountId,
            categoryId: dto.categoryId ?? null,
            type: dto.type,
            amountMinor: dto.amountMinor,
            description: dto.description,
            notes: dto.notes ?? null,
            date: baseDate,
            status: dto.status ?? 'CLEARED',
          },
          tx,
        );
        await this.accounts.adjustBalance(
          dto.accountId,
          this.signedDelta(dto.type, dto.amountMinor),
          tx,
        );
        return row;
      }

      const groupId = randomUUID();
      let first: Transaction | null = null;
      for (let i = 0; i < legs; i += 1) {
        const row = await this.transactions.create(
          {
            userId,
            accountId: dto.accountId,
            categoryId: dto.categoryId ?? null,
            type: dto.type,
            amountMinor: dto.amountMinor,
            description: dto.description,
            notes: dto.notes ?? null,
            date: addMonths(baseDate, i),
            status: dto.status ?? 'CLEARED',
            installmentGroupId: groupId,
            installmentNumber: i + 1,
            installmentTotal: legs,
          },
          tx,
        );
        first ??= row;
        await this.accounts.adjustBalance(
          dto.accountId,
          this.signedDelta(dto.type, dto.amountMinor),
          tx,
        );
      }
      return first as Transaction;
    });

    return toTransactionDto(created);
  }

  /**
   * Updates a transaction, reversing the previous balance effect and applying
   * the new one atomically. Installment legs are updated individually.
   */
  async update(
    userId: string,
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<TransactionDto> {
    const existing = await this.getOwnedOrThrow(userId, id);

    const nextAccountId = dto.accountId ?? existing.accountId;
    const nextType = dto.type ?? existing.type;
    const nextAmount = dto.amountMinor ?? existing.amountMinor;

    if (dto.accountId && dto.accountId !== existing.accountId) {
      await this.assertAccountOwned(userId, dto.accountId);
    }
    if (dto.categoryId !== undefined && dto.categoryId !== null) {
      await this.assertCategoryCompatible(userId, dto.categoryId, nextType);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Reverse the old effect.
      await this.accounts.adjustBalance(
        existing.accountId,
        -this.signedDelta(existing.type, existing.amountMinor),
        tx,
      );
      // Apply the new effect.
      await this.accounts.adjustBalance(
        nextAccountId,
        this.signedDelta(nextType, nextAmount),
        tx,
      );

      return this.transactions.update(
        id,
        {
          accountId: dto.accountId,
          categoryId: dto.categoryId,
          type: dto.type,
          amountMinor: dto.amountMinor,
          description: dto.description,
          notes: dto.notes,
          date: dto.date ? new Date(dto.date) : undefined,
          status: dto.status,
        },
        tx,
      );
    });

    return toTransactionDto(updated);
  }

  /**
   * Deletes a transaction and reverses its balance effect. When the row is part
   * of an installment group, every leg is deleted and reversed together.
   */
  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.getOwnedOrThrow(userId, id);

    await this.prisma.$transaction(async (tx) => {
      if (existing.installmentGroupId) {
        const legs = await this.transactions.findByGroup(
          userId,
          existing.installmentGroupId,
          tx,
        );
        for (const leg of legs) {
          await this.accounts.adjustBalance(
            leg.accountId,
            -this.signedDelta(leg.type, leg.amountMinor),
            tx,
          );
        }
        await this.transactions.deleteByGroup(existing.installmentGroupId, tx);
        return;
      }

      await this.accounts.adjustBalance(
        existing.accountId,
        -this.signedDelta(existing.type, existing.amountMinor),
        tx,
      );
      await this.transactions.delete(id, tx);
    });
  }

  /** Signed balance delta for a flow: INCOME adds, EXPENSE subtracts. */
  private signedDelta(type: Transaction['type'], amountMinor: number): number {
    return type === 'INCOME' ? amountMinor : -amountMinor;
  }

  private toFilters(query: QueryTransactionsDto): TransactionListFilters {
    return {
      accountId: query.accountId,
      categoryId: query.categoryId,
      type: query.type,
      status: query.status,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      minAmountMinor: query.minAmountMinor,
      maxAmountMinor: query.maxAmountMinor,
      search: query.search,
    };
  }

  private async assertAccountOwned(
    userId: string,
    accountId: string,
  ): Promise<void> {
    const account = await this.accounts.findById(userId, accountId);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
  }

  private async assertCategoryCompatible(
    userId: string,
    categoryId: string | undefined | null,
    type: Transaction['type'],
  ): Promise<void> {
    if (!categoryId) {
      return;
    }
    const category = await this.categories.findById(userId, categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (category.type !== type) {
      throw new NotFoundException(
        'Category does not match the transaction type',
      );
    }
  }

  private async getOwnedOrThrow(
    userId: string,
    id: string,
  ): Promise<Transaction> {
    const transaction = await this.transactions.findById(userId, id);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }
}

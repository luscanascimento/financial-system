import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Paginated,
  Transfer as TransferDto,
} from '@financehub/shared-types';
import {
  buildPaginationMeta,
  resolvePagination,
} from '@financehub/shared-utils';
import type { Prisma, Transfer } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AccountsRepository } from '../accounts/accounts.repository';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { QueryTransfersDto } from './dto/query-transfers.dto';
import { toTransferDto } from './mappers/transfer.mapper';
import {
  TransfersRepository,
  type TransferListFilters,
} from './transfers.repository';

const SORTABLE_FIELDS = new Set(['date', 'fromAmountMinor', 'createdAt']);

/**
 * Account-to-account transfers. Debits the source and credits the destination
 * inside a single `prisma.$transaction` so paired balances never drift. All
 * reads and writes are scoped by `userId`.
 */
@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transfers: TransfersRepository,
    private readonly accounts: AccountsRepository,
  ) {}

  async list(
    userId: string,
    query: QueryTransfersDto,
  ): Promise<Paginated<TransferDto>> {
    const pagination = resolvePagination(query);
    const filters: TransferListFilters = {
      fromAccountId: query.fromAccountId,
      toAccountId: query.toAccountId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      search: query.search,
    };
    const sortField = SORTABLE_FIELDS.has(query.sortBy ?? '')
      ? (query.sortBy as string)
      : 'date';
    const sortOrder: Prisma.SortOrder =
      query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [rows, totalItems] = await Promise.all([
      this.transfers.findManyPaginated(userId, filters, pagination, {
        field: sortField,
        order: sortOrder,
      }),
      this.transfers.count(userId, filters),
    ]);

    return {
      items: rows.map(toTransferDto),
      meta: buildPaginationMeta(
        totalItems,
        pagination.page,
        pagination.pageSize,
      ),
    };
  }

  async get(userId: string, id: string): Promise<TransferDto> {
    return toTransferDto(await this.getOwnedOrThrow(userId, id));
  }

  /**
   * Records a transfer, debiting the source and crediting the destination.
   * `toAmountMinor` defaults to `fromAmountMinor` (same-currency transfer).
   */
  async create(userId: string, dto: CreateTransferDto): Promise<TransferDto> {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Source and destination must differ');
    }
    await this.assertAccountOwned(userId, dto.fromAccountId);
    await this.assertAccountOwned(userId, dto.toAccountId);

    const toAmountMinor = dto.toAmountMinor ?? dto.fromAmountMinor;

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await this.transfers.create(
        {
          userId,
          fromAccountId: dto.fromAccountId,
          toAccountId: dto.toAccountId,
          fromAmountMinor: dto.fromAmountMinor,
          toAmountMinor,
          description: dto.description ?? null,
          date: new Date(dto.date),
        },
        tx,
      );
      await this.accounts.adjustBalance(
        dto.fromAccountId,
        -dto.fromAmountMinor,
        tx,
      );
      await this.accounts.adjustBalance(dto.toAccountId, toAmountMinor, tx);
      return row;
    });

    return toTransferDto(created);
  }

  /** Deletes a transfer and reverses both balance legs atomically. */
  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.getOwnedOrThrow(userId, id);

    await this.prisma.$transaction(async (tx) => {
      await this.accounts.adjustBalance(
        existing.fromAccountId,
        existing.fromAmountMinor,
        tx,
      );
      await this.accounts.adjustBalance(
        existing.toAccountId,
        -existing.toAmountMinor,
        tx,
      );
      await this.transfers.delete(id, tx);
    });
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

  private async getOwnedOrThrow(userId: string, id: string): Promise<Transfer> {
    const transfer = await this.transfers.findById(userId, id);
    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }
    return transfer;
  }
}

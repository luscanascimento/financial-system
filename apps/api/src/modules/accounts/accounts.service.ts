import { Injectable, NotFoundException } from '@nestjs/common';
import type { Account as AccountDto } from '@financehub/shared-types';
import type { Account } from '@prisma/client';

import { AccountsRepository } from './accounts.repository';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { toAccountDto } from './mappers/account.mapper';

/**
 * Account lifecycle operations for the authenticated user. Every query is
 * scoped by `userId` so a user can never see or mutate another user's accounts.
 */
@Injectable()
export class AccountsService {
  constructor(private readonly accounts: AccountsRepository) {}

  async list(userId: string, includeArchived = false): Promise<AccountDto[]> {
    const rows = await this.accounts.findMany(userId, { includeArchived });
    return rows.map(toAccountDto);
  }

  async get(userId: string, id: string): Promise<AccountDto> {
    return toAccountDto(await this.getOwnedOrThrow(userId, id));
  }

  async create(userId: string, dto: CreateAccountDto): Promise<AccountDto> {
    const created = await this.accounts.create({
      userId,
      name: dto.name,
      type: dto.type,
      currency: dto.currency ?? 'USD',
      balanceMinor: dto.initialBalanceMinor,
      initialBalanceMinor: dto.initialBalanceMinor,
      creditLimitMinor: dto.creditLimitMinor ?? null,
      institution: dto.institution ?? null,
      color: dto.color ?? null,
      icon: dto.icon ?? null,
    });
    return toAccountDto(created);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAccountDto,
  ): Promise<AccountDto> {
    await this.getOwnedOrThrow(userId, id);
    const updated = await this.accounts.update(userId, id, {
      name: dto.name,
      type: dto.type,
      currency: dto.currency,
      creditLimitMinor: dto.creditLimitMinor,
      institution: dto.institution,
      color: dto.color,
      icon: dto.icon,
    });
    return toAccountDto(updated);
  }

  async archive(userId: string, id: string): Promise<AccountDto> {
    await this.getOwnedOrThrow(userId, id);
    return toAccountDto(await this.accounts.archive(userId, id));
  }

  /** Loads an account, enforcing ownership; throws when it isn't the user's. */
  private async getOwnedOrThrow(userId: string, id: string): Promise<Account> {
    const account = await this.accounts.findById(userId, id);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  RecurrenceFrequency,
  RecurringTransaction as RecurringDto,
} from '@financehub/shared-types';
import { addDays, addMonths } from '@financehub/shared-utils';
import type { RecurringTransaction } from '@prisma/client';

import { AccountsRepository } from '../accounts/accounts.repository';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
import { toRecurringDto } from './mappers/recurring.mapper';
import { RecurringRepository } from './recurring.repository';

/** Outcome of a {@link RecurringService.runDue} pass. */
export interface RunDueResult {
  processed: number;
  generated: number;
  /** Templates that threw and were skipped without aborting the batch. */
  failed: number;
}

/**
 * Recurring-transaction templates. On each due run a template spawns a real
 * transaction (delegating balance math to the transactions service) and
 * advances its `nextRunDate` by `interval` periods. Every query is scoped by
 * `userId`.
 */
@Injectable()
export class RecurringService {
  /**
   * Cap on occurrences generated per template per pass. Bounds the blast radius
   * of a very old daily template (or a clock jump) to one batch instead of
   * thousands of rows; the remainder is caught up on the next run.
   */
  private static readonly MAX_CATCHUP_RUNS = 60;

  private readonly logger = new Logger(RecurringService.name);

  constructor(
    private readonly recurring: RecurringRepository,
    private readonly transactions: TransactionsService,
    private readonly accounts: AccountsRepository,
  ) {}

  async list(userId: string): Promise<RecurringDto[]> {
    const rows = await this.recurring.findMany(userId);
    return rows.map(toRecurringDto);
  }

  async get(userId: string, id: string): Promise<RecurringDto> {
    return toRecurringDto(await this.getOwnedOrThrow(userId, id));
  }

  async create(userId: string, dto: CreateRecurringDto): Promise<RecurringDto> {
    await this.assertAccountOwned(userId, dto.accountId);

    const startDate = new Date(dto.startDate);
    const created = await this.recurring.create({
      userId,
      accountId: dto.accountId,
      categoryId: dto.categoryId ?? null,
      type: dto.type,
      amountMinor: dto.amountMinor,
      description: dto.description,
      frequency: dto.frequency,
      interval: dto.interval ?? 1,
      startDate,
      nextRunDate: startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });
    return toRecurringDto(created);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateRecurringDto,
  ): Promise<RecurringDto> {
    await this.getOwnedOrThrow(userId, id);
    if (dto.accountId) {
      await this.assertAccountOwned(userId, dto.accountId);
    }

    const updated = await this.recurring.update(id, {
      accountId: dto.accountId,
      categoryId: dto.categoryId,
      type: dto.type,
      amountMinor: dto.amountMinor,
      description: dto.description,
      frequency: dto.frequency,
      interval: dto.interval,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      active: dto.active,
    });
    return toRecurringDto(updated);
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.getOwnedOrThrow(userId, id);
    await this.recurring.delete(id);
  }

  /**
   * Generates transactions for every active template whose `nextRunDate` has
   * passed (and that hasn't ended), then advances each template's schedule and
   * stamps `lastRunAt`. Optionally scoped to a single user.
   *
   * There is no scheduler in the repo: this is driven by
   * `POST /recurring-transactions/run` (or a cron calling it), so a template
   * can be overdue by several periods and every missed occurrence is generated
   * in one pass.
   */
  async runDue(userId?: string, now: Date = new Date()): Promise<RunDueResult> {
    const due = await this.recurring.findDue(now, userId);
    let generated = 0;
    let failed = 0;

    // Each template is processed independently: a failure on one is logged and
    // skipped so it can never abort the batch or block every later template.
    for (const template of due) {
      try {
        let next = template.nextRunDate;
        let runs = 0;
        while (
          next <= now &&
          (template.endDate === null || next <= template.endDate) &&
          runs < RecurringService.MAX_CATCHUP_RUNS
        ) {
          await this.transactions.create(template.userId, {
            accountId: template.accountId,
            categoryId: template.categoryId ?? undefined,
            type: template.type,
            amountMinor: template.amountMinor,
            description: template.description,
            date: next.toISOString(),
          });

          next = this.advance(next, template.frequency, template.interval);

          // Only advance the schedule after the transaction is committed, so a
          // failure here re-attempts the same run rather than skipping it —
          // including mid-catch-up, where the earlier runs stay committed.
          await this.recurring.update(template.id, {
            lastRunAt: now,
            nextRunDate: next,
          });
          generated += 1;
          runs += 1;
        }
      } catch (error) {
        failed += 1;
        this.logger.error(
          `Failed to process recurring template ${template.id} for user ${template.userId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return { processed: due.length, generated, failed };
  }

  /** Advances a date by `interval` periods of the given frequency (UTC). */
  private advance(
    from: Date,
    frequency: RecurrenceFrequency,
    interval: number,
  ): Date {
    const steps = Math.max(1, interval);
    switch (frequency) {
      case 'DAILY':
        return addDays(from, steps);
      case 'WEEKLY':
        return addDays(from, steps * 7);
      case 'YEARLY':
        return addMonths(from, steps * 12);
      case 'MONTHLY':
      default:
        return addMonths(from, steps);
    }
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

  private async getOwnedOrThrow(
    userId: string,
    id: string,
  ): Promise<RecurringTransaction> {
    const template = await this.recurring.findById(userId, id);
    if (!template) {
      throw new NotFoundException('Recurring transaction not found');
    }
    return template;
  }
}

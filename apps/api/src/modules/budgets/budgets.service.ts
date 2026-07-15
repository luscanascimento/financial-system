import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { BudgetProgress } from '@financehub/shared-types';
import { periodBounds } from '@financehub/shared-utils';
import type { Budget } from '@prisma/client';

import { BudgetsRepository } from './budgets.repository';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { toBudgetProgress } from './mappers/budget.mapper';

/**
 * Budget operations for the authenticated user: CRUD plus the read-time
 * computation of each budget's actual spend against the current period.
 */
@Injectable()
export class BudgetsService {
  constructor(private readonly budgets: BudgetsRepository) {}

  async create(userId: string, dto: CreateBudgetDto): Promise<BudgetProgress> {
    if (dto.categoryId) {
      await this.assertExpenseCategory(userId, dto.categoryId);
    }

    const budget = await this.budgets.create({
      userId,
      name: dto.name,
      amountMinor: dto.amountMinor,
      categoryId: dto.categoryId ?? null,
      period: dto.period ?? 'MONTHLY',
      startDate: new Date(dto.startDate),
      rollover: dto.rollover ?? false,
    });

    return this.toProgress(userId, budget);
  }

  async list(userId: string): Promise<BudgetProgress[]> {
    const budgets = await this.budgets.findMany(userId);
    return Promise.all(
      budgets.map((budget) => this.toProgress(userId, budget)),
    );
  }

  async get(userId: string, id: string): Promise<BudgetProgress> {
    const budget = await this.getOwned(userId, id);
    return this.toProgress(userId, budget);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateBudgetDto,
  ): Promise<BudgetProgress> {
    const existing = await this.getOwned(userId, id);

    if (dto.categoryId) {
      await this.assertExpenseCategory(userId, dto.categoryId);
    }

    const updated = await this.budgets.update(existing.id, {
      name: dto.name ?? existing.name,
      amountMinor: dto.amountMinor ?? existing.amountMinor,
      categoryId:
        dto.categoryId === undefined ? existing.categoryId : dto.categoryId,
      period: dto.period ?? existing.period,
      startDate:
        dto.startDate === undefined
          ? existing.startDate
          : new Date(dto.startDate),
      rollover: dto.rollover ?? existing.rollover,
    });

    return this.toProgress(userId, updated);
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.getOwned(userId, id);
    await this.budgets.delete(existing.id);
  }

  /** Loads a budget, throwing {@link NotFoundException} when the caller isn't its owner. */
  private async getOwned(userId: string, id: string): Promise<Budget> {
    const budget = await this.budgets.findById(userId, id);
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    return budget;
  }

  /** Validates a category exists, belongs to the user and classifies expenses. */
  private async assertExpenseCategory(
    userId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await this.budgets.findCategory(userId, categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (category.type !== 'EXPENSE') {
      throw new BadRequestException(
        'Budget category must be an expense category',
      );
    }
  }

  /** Computes the current period's spend and wraps the budget as {@link BudgetProgress}. */
  private async toProgress(
    userId: string,
    budget: Budget,
  ): Promise<BudgetProgress> {
    const bounds = periodBounds(budget.period, budget.startDate);
    const spentMinor = await this.budgets.sumExpenses(
      userId,
      budget.categoryId,
      bounds.start,
      bounds.end,
    );
    return toBudgetProgress(budget, bounds, spentMinor);
  }
}

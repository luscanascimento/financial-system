import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Goal as GoalDto,
  GoalContribution as GoalContributionDto,
  Paginated,
} from '@financehub/shared-types';
import {
  buildPaginationMeta,
  resolvePagination,
} from '@financehub/shared-utils';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { ListGoalsQueryDto } from './dto/list-goals-query.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalsRepository } from './goals.repository';
import { toGoal, toGoalContribution } from './mappers/goal.mapper';

const SORTABLE_FIELDS = new Set([
  'name',
  'targetAmountMinor',
  'currentAmountMinor',
  'targetDate',
  'status',
  'createdAt',
  'updatedAt',
]);

/**
 * Savings-goal operations for the authenticated user: goal CRUD plus
 * contribution bookkeeping that keeps `currentAmountMinor` and the `ACHIEVED`
 * status in sync inside a transaction.
 */
@Injectable()
export class GoalsService {
  constructor(
    private readonly goals: GoalsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(userId: string, dto: CreateGoalDto): Promise<GoalDto> {
    if (dto.accountId) {
      await this.assertAccountOwned(userId, dto.accountId);
    }
    const goal = await this.goals.create({
      userId,
      name: dto.name,
      targetAmountMinor: dto.targetAmountMinor,
      currency: dto.currency ?? 'USD',
      targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
      accountId: dto.accountId ?? null,
      color: dto.color ?? null,
      icon: dto.icon ?? null,
    });
    return toGoal(goal);
  }

  async list(
    userId: string,
    query: ListGoalsQueryDto,
  ): Promise<Paginated<GoalDto>> {
    const { page, pageSize, skip, take } = resolvePagination(query);

    const where: Prisma.GoalWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const sortBy =
      query.sortBy && SORTABLE_FIELDS.has(query.sortBy)
        ? query.sortBy
        : 'createdAt';
    const orderBy: Prisma.GoalOrderByWithRelationInput = {
      [sortBy]: query.sortOrder ?? 'desc',
    };

    const [rows, totalItems] = await Promise.all([
      this.goals.findMany(userId, { where, orderBy, skip, take }),
      this.goals.count(userId, where),
    ]);

    return {
      items: rows.map(toGoal),
      meta: buildPaginationMeta(totalItems, page, pageSize),
    };
  }

  async get(userId: string, id: string): Promise<GoalDto> {
    const goal = await this.goals.findById(userId, id);
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    return toGoal(goal);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateGoalDto,
  ): Promise<GoalDto> {
    const existing = await this.goals.findById(userId, id);
    if (!existing) {
      throw new NotFoundException('Goal not found');
    }
    if (dto.accountId) {
      await this.assertAccountOwned(userId, dto.accountId);
    }

    const data: Prisma.GoalUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.targetAmountMinor !== undefined) {
      data.targetAmountMinor = dto.targetAmountMinor;
    }
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.targetDate !== undefined) {
      data.targetDate = dto.targetDate ? new Date(dto.targetDate) : null;
    }
    if (dto.accountId !== undefined) data.accountId = dto.accountId ?? null;
    if (dto.color !== undefined) data.color = dto.color ?? null;
    if (dto.icon !== undefined) data.icon = dto.icon ?? null;
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.goals.update(id, data);
    return toGoal(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.goals.findById(userId, id);
    if (!existing) {
      throw new NotFoundException('Goal not found');
    }
    await this.goals.delete(id);
  }

  /** Upper bound on contributions returned in one call. */
  private static readonly MAX_CONTRIBUTIONS = 500;
  private static readonly DEFAULT_CONTRIBUTIONS = 100;

  async listContributions(
    userId: string,
    goalId: string,
    limit?: number,
  ): Promise<GoalContributionDto[]> {
    const goal = await this.goals.findById(userId, goalId);
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    const take = Math.min(
      Math.max(1, limit ?? GoalsService.DEFAULT_CONTRIBUTIONS),
      GoalsService.MAX_CONTRIBUTIONS,
    );
    const contributions = await this.goals.listContributions(goalId, take);
    return contributions.map(toGoalContribution);
  }

  /**
   * Records a contribution and increments the goal's `currentAmountMinor` in a
   * single transaction, promoting the goal to `ACHIEVED` once it reaches its
   * target.
   */
  async addContribution(
    userId: string,
    goalId: string,
    dto: CreateContributionDto,
  ): Promise<GoalContributionDto> {
    return this.prisma.$transaction(async (tx) => {
      const goal = await this.goals.findById(userId, goalId, tx);
      if (!goal) {
        throw new NotFoundException('Goal not found');
      }

      const contribution = await this.goals.createContribution(
        {
          goalId,
          amountMinor: dto.amountMinor,
          date: new Date(dto.date),
          note: dto.note ?? null,
        },
        tx,
      );

      const nextAmount = goal.currentAmountMinor + dto.amountMinor;
      await this.goals.adjustCurrent(goalId, dto.amountMinor, tx);

      if (goal.status === 'ACTIVE' && nextAmount >= goal.targetAmountMinor) {
        await this.goals.update(goalId, { status: 'ACHIEVED' }, tx);
      }

      return toGoalContribution(contribution);
    });
  }

  /**
   * Deletes a contribution and reverses its effect on the goal's
   * `currentAmountMinor`, demoting an `ACHIEVED` goal back to `ACTIVE` when it
   * no longer meets its target.
   */
  async removeContribution(
    userId: string,
    goalId: string,
    contributionId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const goal = await this.goals.findById(userId, goalId, tx);
      if (!goal) {
        throw new NotFoundException('Goal not found');
      }
      const contribution = await this.goals.findContributionById(
        goalId,
        contributionId,
        tx,
      );
      if (!contribution) {
        throw new NotFoundException('Contribution not found');
      }

      await this.goals.deleteContribution(contributionId, tx);
      const nextAmount = goal.currentAmountMinor - contribution.amountMinor;
      await this.goals.adjustCurrent(goalId, -contribution.amountMinor, tx);

      if (goal.status === 'ACHIEVED' && nextAmount < goal.targetAmountMinor) {
        await this.goals.update(goalId, { status: 'ACTIVE' }, tx);
      }
    });
  }

  private async assertAccountOwned(
    userId: string,
    accountId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const owned = await this.goals.accountBelongsToUser(userId, accountId, tx);
    if (!owned) {
      throw new BadRequestException('Account not found');
    }
  }
}

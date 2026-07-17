import { Injectable } from '@nestjs/common';
import type { Goal, GoalContribution, Prisma } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/**
 * Persistence gateway for goals and their contributions. The only place feature
 * code touches the Prisma `goal` and `goalContribution` models.
 */
@Injectable()
export class GoalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.GoalUncheckedCreateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Goal> {
    return tx.goal.create({ data });
  }

  findMany(
    userId: string,
    args: Pick<Prisma.GoalFindManyArgs, 'where' | 'orderBy' | 'skip' | 'take'>,
  ): Promise<Goal[]> {
    return this.prisma.goal.findMany({
      ...args,
      where: { ...args.where, userId },
    });
  }

  count(userId: string, where?: Prisma.GoalWhereInput): Promise<number> {
    return this.prisma.goal.count({ where: { ...where, userId } });
  }

  /** Fetches a goal owned by `userId`, or `null` when it belongs to someone else. */
  findById(
    userId: string,
    id: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Goal | null> {
    return tx.goal.findFirst({ where: { id, userId } });
  }

  update(
    id: string,
    data: Prisma.GoalUncheckedUpdateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Goal> {
    return tx.goal.update({ where: { id }, data });
  }

  async delete(
    id: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await tx.goal.delete({ where: { id } });
  }

  createContribution(
    data: Prisma.GoalContributionUncheckedCreateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<GoalContribution> {
    return tx.goalContribution.create({ data });
  }

  /** Most recent contributions first, hard-capped by `take` to bound the result. */
  listContributions(goalId: string, take: number): Promise<GoalContribution[]> {
    return this.prisma.goalContribution.findMany({
      where: { goalId },
      orderBy: { date: 'desc' },
      take,
    });
  }

  /** Fetches a contribution belonging to `goalId`, or `null` otherwise. */
  findContributionById(
    goalId: string,
    id: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<GoalContribution | null> {
    return tx.goalContribution.findFirst({ where: { id, goalId } });
  }

  async deleteContribution(
    id: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await tx.goalContribution.delete({ where: { id } });
  }

  /**
   * Read-only ownership guard for an optionally linked account. Kept here so the
   * goals module owns every Prisma access it makes and never leaks a foreign
   * account into a goal.
   */
  async accountBelongsToUser(
    userId: string,
    accountId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<boolean> {
    const count = await tx.account.count({ where: { id: accountId, userId } });
    return count > 0;
  }

  /**
   * Applies `deltaMinor` (may be negative) to a goal's running
   * `currentAmountMinor`, keeping it in sync with its contributions.
   */
  async adjustCurrent(
    goalId: string,
    deltaMinor: number,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Goal> {
    return tx.goal.update({
      where: { id: goalId },
      data: { currentAmountMinor: { increment: deltaMinor } },
    });
  }
}

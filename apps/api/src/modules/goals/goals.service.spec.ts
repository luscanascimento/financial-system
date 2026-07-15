import { NotFoundException } from '@nestjs/common';
import type { Goal, GoalContribution } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { GoalsService } from './goals.service';
import type { GoalsRepository } from './goals.repository';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const GOAL_ID = '22222222-2222-2222-2222-222222222222';

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: GOAL_ID,
    userId: USER_ID,
    name: 'Emergency fund',
    targetAmountMinor: 100000,
    currentAmountMinor: 0,
    currency: 'USD',
    targetDate: null,
    accountId: null,
    color: null,
    icon: null,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeContribution(
  overrides: Partial<GoalContribution> = {},
): GoalContribution {
  return {
    id: '33333333-3333-3333-3333-333333333333',
    goalId: GOAL_ID,
    amountMinor: 40000,
    date: new Date('2026-07-15T00:00:00.000Z'),
    note: null,
    createdAt: new Date('2026-07-15T00:00:00.000Z'),
    ...overrides,
  };
}

function setup() {
  const goals = {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    createContribution: vi.fn(),
    listContributions: vi.fn(),
    findContributionById: vi.fn(),
    deleteContribution: vi.fn(),
    accountBelongsToUser: vi.fn(),
    adjustCurrent: vi.fn(),
  } as unknown as GoalsRepository;

  // $transaction simply runs the callback with a sentinel tx client.
  const prisma = {
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn('tx')),
  } as unknown as PrismaService;

  return { service: new GoalsService(goals, prisma), goals, prisma };
}

describe('GoalsService', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  describe('addContribution', () => {
    it('inserts the contribution and increments the running amount', async () => {
      vi.mocked(ctx.goals.findById).mockResolvedValue(
        makeGoal({ currentAmountMinor: 10000 }),
      );
      vi.mocked(ctx.goals.createContribution).mockResolvedValue(
        makeContribution({ amountMinor: 25000 }),
      );

      const result = await ctx.service.addContribution(USER_ID, GOAL_ID, {
        amountMinor: 25000,
        date: '2026-07-15T00:00:00.000Z',
      });

      expect(ctx.goals.adjustCurrent).toHaveBeenCalledWith(
        GOAL_ID,
        25000,
        'tx',
      );
      // Still short of the 100000 target — no status transition.
      expect(ctx.goals.update).not.toHaveBeenCalled();
      expect(result.amountMinor).toBe(25000);
    });

    it('promotes the goal to ACHIEVED once the target is reached', async () => {
      vi.mocked(ctx.goals.findById).mockResolvedValue(
        makeGoal({ currentAmountMinor: 80000, targetAmountMinor: 100000 }),
      );
      vi.mocked(ctx.goals.createContribution).mockResolvedValue(
        makeContribution({ amountMinor: 20000 }),
      );

      await ctx.service.addContribution(USER_ID, GOAL_ID, {
        amountMinor: 20000,
        date: '2026-07-15T00:00:00.000Z',
      });

      expect(ctx.goals.adjustCurrent).toHaveBeenCalledWith(
        GOAL_ID,
        20000,
        'tx',
      );
      expect(ctx.goals.update).toHaveBeenCalledWith(
        GOAL_ID,
        { status: 'ACHIEVED' },
        'tx',
      );
    });

    it('does not re-promote an already ACHIEVED goal', async () => {
      vi.mocked(ctx.goals.findById).mockResolvedValue(
        makeGoal({ currentAmountMinor: 120000, status: 'ACHIEVED' }),
      );
      vi.mocked(ctx.goals.createContribution).mockResolvedValue(
        makeContribution({ amountMinor: 5000 }),
      );

      await ctx.service.addContribution(USER_ID, GOAL_ID, {
        amountMinor: 5000,
        date: '2026-07-15T00:00:00.000Z',
      });

      expect(ctx.goals.update).not.toHaveBeenCalled();
    });

    it("rejects a goal that doesn't belong to the user", async () => {
      vi.mocked(ctx.goals.findById).mockResolvedValue(null);

      await expect(
        ctx.service.addContribution(USER_ID, GOAL_ID, {
          amountMinor: 5000,
          date: '2026-07-15T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(ctx.goals.createContribution).not.toHaveBeenCalled();
    });
  });

  describe('removeContribution', () => {
    it('reverses the amount and demotes an ACHIEVED goal below target', async () => {
      vi.mocked(ctx.goals.findById).mockResolvedValue(
        makeGoal({ currentAmountMinor: 100000, status: 'ACHIEVED' }),
      );
      vi.mocked(ctx.goals.findContributionById).mockResolvedValue(
        makeContribution({ amountMinor: 40000 }),
      );

      await ctx.service.removeContribution(
        USER_ID,
        GOAL_ID,
        '33333333-3333-3333-3333-333333333333',
      );

      expect(ctx.goals.adjustCurrent).toHaveBeenCalledWith(
        GOAL_ID,
        -40000,
        'tx',
      );
      // 100000 - 40000 = 60000 < 100000 target → back to ACTIVE.
      expect(ctx.goals.update).toHaveBeenCalledWith(
        GOAL_ID,
        { status: 'ACTIVE' },
        'tx',
      );
    });

    it('keeps ACHIEVED when the goal still meets its target after removal', async () => {
      vi.mocked(ctx.goals.findById).mockResolvedValue(
        makeGoal({ currentAmountMinor: 150000, status: 'ACHIEVED' }),
      );
      vi.mocked(ctx.goals.findContributionById).mockResolvedValue(
        makeContribution({ amountMinor: 10000 }),
      );

      await ctx.service.removeContribution(
        USER_ID,
        GOAL_ID,
        '33333333-3333-3333-3333-333333333333',
      );

      expect(ctx.goals.adjustCurrent).toHaveBeenCalledWith(
        GOAL_ID,
        -10000,
        'tx',
      );
      // 150000 - 10000 = 140000 >= 100000 → stays ACHIEVED.
      expect(ctx.goals.update).not.toHaveBeenCalled();
    });

    it('rejects a contribution that does not belong to the goal', async () => {
      vi.mocked(ctx.goals.findById).mockResolvedValue(makeGoal());
      vi.mocked(ctx.goals.findContributionById).mockResolvedValue(null);

      await expect(
        ctx.service.removeContribution(
          USER_ID,
          GOAL_ID,
          '33333333-3333-3333-3333-333333333333',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(ctx.goals.deleteContribution).not.toHaveBeenCalled();
    });
  });
});

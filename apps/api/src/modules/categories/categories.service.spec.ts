import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Category } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoriesService } from './categories.service';
import type { CategoriesRepository } from './categories.repository';

const USER_ID = '11111111-1111-1111-1111-111111111111';

function category(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    userId: USER_ID,
    name: 'Food',
    type: 'EXPENSE',
    parentId: null,
    color: null,
    icon: null,
    system: false,
    archived: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function setup() {
  const categories = {
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  } as unknown as CategoriesRepository;

  return { service: new CategoriesService(categories), categories };
}

describe('CategoriesService', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  describe('create', () => {
    it('rejects a parent with a mismatched flow type', async () => {
      const parent = category({
        id: 'pppppppp-pppp-pppp-pppp-pppppppppppp',
        type: 'INCOME',
      });
      vi.mocked(ctx.categories.findById).mockResolvedValue(parent);

      await expect(
        ctx.service.create(USER_ID, {
          name: 'Groceries',
          type: 'EXPENSE',
          parentId: parent.id,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a parent the user does not own', async () => {
      vi.mocked(ctx.categories.findById).mockResolvedValue(null);
      await expect(
        ctx.service.create(USER_ID, {
          name: 'Groceries',
          type: 'EXPENSE',
          parentId: 'pppppppp-pppp-pppp-pppp-pppppppppppp',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates a top-level category', async () => {
      const created = category({ name: 'Salary', type: 'INCOME' });
      vi.mocked(ctx.categories.create).mockResolvedValue(created);

      const dto = await ctx.service.create(USER_ID, {
        name: 'Salary',
        type: 'INCOME',
      });

      expect(ctx.categories.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, parentId: null }),
      );
      expect(dto.type).toBe('INCOME');
    });
  });

  describe('buildTree', () => {
    it('nests children under their parent', async () => {
      const parent = category({ id: 'p1', name: 'Food' });
      const child = category({ id: 'c1', name: 'Groceries', parentId: 'p1' });
      vi.mocked(ctx.categories.findMany).mockResolvedValue([parent, child]);

      const tree = await ctx.service.buildTree(USER_ID);

      expect(tree).toHaveLength(1);
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].id).toBe('c1');
    });
  });

  describe('seedDefaults', () => {
    it('creates system parents and batches their children', async () => {
      vi.mocked(ctx.categories.create).mockImplementation(async (data) =>
        category({ id: `id-${data.name}`, name: data.name }),
      );

      await ctx.service.seedDefaults(USER_ID);

      const createdSystem = vi
        .mocked(ctx.categories.create)
        .mock.calls.every(([data]) => data.system === true);
      expect(createdSystem).toBe(true);
      expect(ctx.categories.createMany).toHaveBeenCalled();
    });
  });
});

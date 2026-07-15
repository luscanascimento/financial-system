import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Category as CategoryDto,
  CategoryNode,
  FlowType,
} from '@financehub/shared-types';
import type { Category, Prisma } from '@prisma/client';

import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { toCategoryDto, toCategoryTree } from './mappers/category.mapper';

/** A default category with optional children, used by {@link CategoriesService.seedDefaults}. */
interface DefaultCategory {
  name: string;
  icon?: string;
  children?: string[];
}

const DEFAULT_INCOME: DefaultCategory[] = [
  { name: 'Salary', icon: 'briefcase' },
  { name: 'Freelance', icon: 'laptop' },
  { name: 'Investments', icon: 'trending-up' },
  { name: 'Gifts', icon: 'gift' },
  { name: 'Other Income', icon: 'plus-circle' },
];

const DEFAULT_EXPENSE: DefaultCategory[] = [
  {
    name: 'Housing',
    icon: 'home',
    children: ['Rent', 'Mortgage', 'Utilities'],
  },
  { name: 'Food', icon: 'utensils', children: ['Groceries', 'Restaurants'] },
  { name: 'Transport', icon: 'car', children: ['Fuel', 'Public Transit'] },
  { name: 'Shopping', icon: 'shopping-bag' },
  { name: 'Health', icon: 'heart' },
  { name: 'Entertainment', icon: 'film' },
  { name: 'Bills', icon: 'file-text' },
  { name: 'Other Expense', icon: 'minus-circle' },
];

/**
 * Category management for the authenticated user. Enforces that nested
 * categories share the same owner and flow type, and can seed a default set of
 * system categories for onboarding. Every query is scoped by `userId`.
 */
@Injectable()
export class CategoriesService {
  constructor(private readonly categories: CategoriesRepository) {}

  async list(
    userId: string,
    options: { type?: FlowType; includeArchived?: boolean } = {},
  ): Promise<CategoryDto[]> {
    const rows = await this.categories.findMany(userId, options);
    return rows.map(toCategoryDto);
  }

  /** Returns the user's categories as a nested tree of {@link CategoryNode}s. */
  async buildTree(
    userId: string,
    options: { type?: FlowType; includeArchived?: boolean } = {},
  ): Promise<CategoryNode[]> {
    const rows = await this.categories.findMany(userId, options);
    return toCategoryTree(rows);
  }

  async get(userId: string, id: string): Promise<CategoryDto> {
    return toCategoryDto(await this.getOwnedOrThrow(userId, id));
  }

  async create(userId: string, dto: CreateCategoryDto): Promise<CategoryDto> {
    if (dto.parentId) {
      const parent = await this.getOwnedOrThrow(userId, dto.parentId);
      if (parent.type !== dto.type) {
        throw new BadRequestException(
          'Parent category must share the same flow type',
        );
      }
      if (parent.parentId) {
        throw new BadRequestException(
          'Categories support only one level of nesting',
        );
      }
    }

    const created = await this.categories.create({
      userId,
      name: dto.name,
      type: dto.type,
      parentId: dto.parentId ?? null,
      color: dto.color ?? null,
      icon: dto.icon ?? null,
    });
    return toCategoryDto(created);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    const existing = await this.getOwnedOrThrow(userId, id);

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }
      const parent = await this.getOwnedOrThrow(userId, dto.parentId);
      if (parent.type !== existing.type) {
        throw new BadRequestException(
          'Parent category must share the same flow type',
        );
      }
      if (parent.parentId) {
        throw new BadRequestException(
          'Categories support only one level of nesting',
        );
      }
    }

    const updated = await this.categories.update(id, {
      name: dto.name,
      parentId: dto.parentId,
      color: dto.color,
      icon: dto.icon,
    });
    return toCategoryDto(updated);
  }

  async archive(userId: string, id: string): Promise<CategoryDto> {
    await this.getOwnedOrThrow(userId, id);
    return toCategoryDto(await this.categories.archive(id));
  }

  /**
   * Creates a sensible default set of INCOME + EXPENSE categories (flagged
   * `system: true`) for a user. Reused by the seed script and onboarding.
   * Parents are created first so their ids can anchor the children.
   */
  async seedDefaults(userId: string): Promise<void> {
    await this.seedGroup(userId, 'INCOME', DEFAULT_INCOME);
    await this.seedGroup(userId, 'EXPENSE', DEFAULT_EXPENSE);
  }

  private async seedGroup(
    userId: string,
    type: FlowType,
    defaults: DefaultCategory[],
  ): Promise<void> {
    for (const def of defaults) {
      const parent = await this.categories.create({
        userId,
        name: def.name,
        type,
        icon: def.icon ?? null,
        system: true,
      });
      if (def.children?.length) {
        const children: Prisma.CategoryUncheckedCreateInput[] =
          def.children.map((name) => ({
            userId,
            name,
            type,
            parentId: parent.id,
            system: true,
          }));
        await this.categories.createMany(children);
      }
    }
  }

  /** Loads a category, enforcing ownership; throws when it isn't the user's. */
  private async getOwnedOrThrow(userId: string, id: string): Promise<Category> {
    const category = await this.categories.findById(userId, id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }
}

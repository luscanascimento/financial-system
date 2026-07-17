import { Injectable } from '@nestjs/common';
import type { Category, FlowType, Prisma } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/**
 * Persistence gateway for categories. The only place feature code touches the
 * Prisma `category` model.
 */
@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    userId: string,
    options: { type?: FlowType; includeArchived?: boolean } = {},
  ): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: {
        userId,
        ...(options.type ? { type: options.type } : {}),
        ...(options.includeArchived ? {} : { archived: false }),
      },
      orderBy: [{ name: 'asc' }],
    });
  }

  findById(
    userId: string,
    id: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Category | null> {
    return tx.category.findFirst({ where: { id, userId } });
  }

  create(data: Prisma.CategoryUncheckedCreateInput): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  createMany(
    data: Prisma.CategoryUncheckedCreateInput[],
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.category.createMany({ data, skipDuplicates: true });
  }

  /**
   * Applies a partial update, scoping the write to the owner at the DB level
   * (`updateMany` with a `userId` predicate) as defense-in-depth on top of the
   * service's ownership check, then returns the fresh row.
   */
  async update(
    userId: string,
    id: string,
    data: Prisma.CategoryUncheckedUpdateInput,
  ): Promise<Category | null> {
    await this.prisma.category.updateMany({ where: { id, userId }, data });
    return this.findById(userId, id);
  }

  async archive(userId: string, id: string): Promise<Category | null> {
    await this.prisma.category.updateMany({
      where: { id, userId },
      data: { archived: true },
    });
    return this.findById(userId, id);
  }
}

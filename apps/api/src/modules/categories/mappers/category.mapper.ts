import type {
  Category as CategoryDto,
  CategoryNode,
} from '@financehub/shared-types';
import type { Category } from '@prisma/client';

/**
 * Maps the persistence `Category` entity to the shared {@link CategoryDto}
 * contract, serialising dates to ISO strings and preserving nullable fields.
 */
export function toCategoryDto(category: Category): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    parentId: category.parentId,
    color: category.color,
    icon: category.icon,
    system: category.system,
    archived: category.archived,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

/**
 * Builds a nested {@link CategoryNode} forest from a flat list of categories,
 * attaching each row to its parent (roots are those without a parent in the
 * set). Children keep the source ordering.
 */
export function toCategoryTree(categories: Category[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>();
  for (const category of categories) {
    nodes.set(category.id, { ...toCategoryDto(category), children: [] });
  }

  const roots: CategoryNode[] = [];
  for (const category of categories) {
    const node = nodes.get(category.id)!;
    const parent = category.parentId ? nodes.get(category.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

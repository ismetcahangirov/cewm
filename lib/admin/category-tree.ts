import type { Localized } from "@/lib/i18n/localized";
import type { CategoryNodeDto } from "@/lib/validation/categories";

export type CategoryTreeNode = CategoryNodeDto & { depth: number; children: CategoryTreeNode[] };

export function buildCategoryTree(nodes: CategoryNodeDto[]): CategoryTreeNode[] {
  const sorted = [...nodes].sort((a, b) => a.sortOrder - b.sortOrder);
  const byParent = new Map<string | null, CategoryNodeDto[]>();
  for (const node of sorted) {
    const key =
      node.parentId && nodes.some((item) => item.id === node.parentId) ? node.parentId : null;
    byParent.set(key, [...(byParent.get(key) ?? []), node]);
  }
  const build = (parentId: string | null, depth: number): CategoryTreeNode[] =>
    (byParent.get(parentId) ?? []).map((node) => ({
      ...node,
      depth,
      children: build(node.id, depth + 1),
    }));
  return build(null, 0);
}

export function flattenTree(tree: CategoryTreeNode[]): CategoryTreeNode[] {
  return tree.flatMap((node) => [node, ...flattenTree(node.children)]);
}

export function categoryLabel(
  node: CategoryNodeDto,
  nodes: CategoryNodeDto[],
  text: (value: Localized) => string,
): string {
  const parent = node.parentId ? nodes.find((item) => item.id === node.parentId) : undefined;
  return parent ? `${text(parent.name)} / ${text(node.name)}` : text(node.name);
}

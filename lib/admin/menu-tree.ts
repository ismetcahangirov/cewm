import { arrayMove } from "@dnd-kit/sortable";

import type { MessageKey } from "@/lib/admin/i18n";
import type { MessageParams } from "@/lib/admin/i18n/translate";
import type { Localized } from "@/lib/i18n/localized";

import type {
  MenuItemDto,
  MenuItemFields,
  MenuItemInput,
  MenuTargetsDto,
} from "@/lib/validation/menus";

export type EditorItem = MenuItemFields & {
  key: string;
  id: string | null;
  children: EditorItem[];
};

export type FlatEditorItem = {
  key: string;
  parentKey: string | null;
  depth: number;
  item: EditorItem;
};

export function fromDto(items: MenuItemDto[]): EditorItem[] {
  return items.map((item) => ({
    key: item.id,
    id: item.id,
    label: item.label,
    target: item.target,
    categoryId: item.categoryId,
    pageId: item.pageId,
    url: item.url,
    children: fromDto(item.children),
  }));
}

export function toInput(items: EditorItem[]): MenuItemInput[] {
  return items.map((item) => ({
    id: item.id,
    label: {
      az: item.label.az,
      ru: item.label.ru ?? null,
      en: item.label.en ?? null,
      de: item.label.de ?? null,
    },
    target: item.target,
    categoryId: item.categoryId,
    pageId: item.pageId,
    url: item.url,
    children: toInput(item.children),
  }));
}

export function flattenItems(
  items: EditorItem[],
  parentKey: string | null = null,
  depth = 0,
): FlatEditorItem[] {
  return items.flatMap((item) => [
    { key: item.key, parentKey, depth, item },
    ...flattenItems(item.children, item.key, depth + 1),
  ]);
}

export function fromFlat(flat: { parentKey: string | null; item: EditorItem }[]): EditorItem[] {
  const known = new Set(flat.map((entry) => entry.item.key));
  const byParent = new Map<string | null, EditorItem[]>();
  for (const entry of flat) {
    const parent = entry.parentKey && known.has(entry.parentKey) ? entry.parentKey : null;
    byParent.set(parent, [...(byParent.get(parent) ?? []), entry.item]);
  }
  const build = (parentKey: string | null): EditorItem[] =>
    (byParent.get(parentKey) ?? []).map((item) => ({ ...item, children: build(item.key) }));
  return build(null);
}

export function subtreeHeight(item: EditorItem): number {
  return item.children.length ? 1 + Math.max(...item.children.map(subtreeHeight)) : 0;
}

export function countItems(items: EditorItem[]): number {
  return items.reduce((total, item) => total + 1 + countItems(item.children), 0);
}

function updateList(
  items: EditorItem[],
  key: string,
  update: (list: EditorItem[], index: number) => EditorItem[],
): EditorItem[] {
  const index = items.findIndex((item) => item.key === key);
  if (index >= 0) return update(items, index);
  return items.map((item) => ({ ...item, children: updateList(item.children, key, update) }));
}

export function moveSibling(items: EditorItem[], key: string, direction: -1 | 1): EditorItem[] {
  return updateList(items, key, (list, index) => {
    const target = index + direction;
    if (target < 0 || target >= list.length) return list;
    return arrayMove(list, index, target);
  });
}

export function indentItem(items: EditorItem[], key: string): EditorItem[] {
  return updateList(items, key, (list, index) => {
    const previous = list[index - 1];
    const current = list[index];
    if (!previous || !current) return list;
    const next = list.filter((_, position) => position !== index);
    next[index - 1] = { ...previous, children: [...previous.children, current] };
    return next;
  });
}

export function outdentItem(items: EditorItem[], key: string): EditorItem[] {
  const parentKey = flattenItems(items).find((entry) => entry.key === key)?.parentKey;
  if (!parentKey) return items;
  return updateList(items, parentKey, (list, index) => {
    const parent = list[index];
    const child = parent?.children.find((item) => item.key === key);
    if (!parent || !child) return list;
    const trimmed = { ...parent, children: parent.children.filter((item) => item.key !== key) };
    return [...list.slice(0, index), trimmed, child, ...list.slice(index + 1)];
  });
}

export function removeItem(items: EditorItem[], key: string): EditorItem[] {
  return updateList(items, key, (list, index) => list.filter((_, position) => position !== index));
}

export function replaceItem(
  items: EditorItem[],
  key: string,
  fields: MenuItemFields,
): EditorItem[] {
  return updateList(items, key, (list, index) =>
    list.map((item, position) => (position === index ? { ...item, ...fields } : item)),
  );
}

export function appendItem(
  items: EditorItem[],
  parentKey: string | null,
  item: EditorItem,
): EditorItem[] {
  if (!parentKey) return [...items, item];
  return updateList(items, parentKey, (list, index) =>
    list.map((entry, position) =>
      position === index ? { ...entry, children: [...entry.children, item] } : entry,
    ),
  );
}

export type Projection = { depth: number; parentKey: string | null };

export function projectDrop(
  visible: FlatEditorItem[],
  activeKey: string,
  overKey: string,
  offsetDepth: number,
  maxDepth: number,
): Projection | null {
  const activeIndex = visible.findIndex((entry) => entry.key === activeKey);
  const overIndex = visible.findIndex((entry) => entry.key === overKey);
  const active = visible[activeIndex];
  if (!active || overIndex < 0) return null;
  const moved = arrayMove(visible, activeIndex, overIndex);
  const previous = moved[overIndex - 1];
  const next = moved[overIndex + 1];
  const deepest = Math.min(
    previous ? previous.depth + 1 : 0,
    maxDepth - subtreeHeight(active.item),
  );
  const shallowest = next ? next.depth : 0;
  if (deepest < 0 || shallowest > deepest) return null;
  const depth = Math.min(Math.max(active.depth + offsetDepth, shallowest), deepest);
  if (depth === 0 || !previous) return { depth: 0, parentKey: null };
  if (depth === previous.depth) return { depth, parentKey: previous.parentKey };
  if (depth > previous.depth) return { depth, parentKey: previous.key };
  const sibling = moved
    .slice(0, overIndex)
    .reverse()
    .find((entry) => entry.depth === depth);
  return { depth, parentKey: sibling?.parentKey ?? null };
}

export function applyDrop(
  items: EditorItem[],
  activeKey: string,
  overKey: string,
  projection: Projection,
): EditorItem[] {
  const flat = flattenItems(items);
  const activeIndex = flat.findIndex((entry) => entry.key === activeKey);
  const overIndex = flat.findIndex((entry) => entry.key === overKey);
  if (activeIndex < 0 || overIndex < 0) return items;
  const updated = flat.map((entry) =>
    entry.key === activeKey ? { ...entry, parentKey: projection.parentKey } : entry,
  );
  return fromFlat(arrayMove(updated, activeIndex, overIndex));
}

export function itemAtPath(
  items: EditorItem[],
  path: string,
): { key: string; field: string } | null {
  const parts = path.split(".");
  if (parts[0] !== "items") return null;
  let list = items;
  let current: EditorItem | undefined;
  let position = 1;
  while (position < parts.length) {
    current = list[Number(parts[position])];
    if (!current) return null;
    position += 1;
    if (parts[position] !== "children" || position + 1 >= parts.length) break;
    list = current.children;
    position += 1;
  }
  if (!current) return null;
  return { key: current.key, field: parts.slice(position).join(".") };
}

export type TargetSummary = { text: string; warning: string | null };

type Translator = (key: MessageKey, params?: MessageParams) => string;

export function describeTarget(
  item: EditorItem,
  targets: MenuTargetsDto | undefined,
  text: (value: Localized) => string,
  t: Translator,
): TargetSummary {
  switch (item.target) {
    case "none":
      return {
        text: t("Başlıq (keçidsiz)"),
        warning: item.children.length ? null : t("Alt elementi yoxdur, saytda göstərilməyəcək."),
      };
    case "url":
      return { text: t("Keçid: {url}", { url: item.url ?? "" }), warning: null };
    case "category": {
      const category = targets?.categories.find((entry) => entry.id === item.categoryId);
      if (!targets) return { text: t("Kateqoriya"), warning: null };
      if (!category) return { text: t("Kateqoriya"), warning: t("Kateqoriya tapılmadı.") };
      const parent = category.parentId
        ? targets.categories.find((entry) => entry.id === category.parentId)
        : undefined;
      const hidden = !category.isActive || (parent ? !parent.isActive : false);
      return {
        text: t("Kateqoriya: {name}", { name: text(category.title) }),
        warning: hidden ? t("Kateqoriya gizlidir, saytda göstərilməyəcək.") : null,
      };
    }
    case "page": {
      const noun = t("Səhifə");
      const option = targets?.pages.find((entry) => entry.id === item.pageId);
      if (!targets) return { text: noun, warning: null };
      if (!option) return { text: noun, warning: t("Səhifə tapılmadı.") };
      return {
        text: t("Səhifə: {name}", { name: text(option.title) }),
        warning: option.isPublished ? null : t("Səhifə dərc olunmayıb, saytda göstərilməyəcək."),
      };
    }
  }
}

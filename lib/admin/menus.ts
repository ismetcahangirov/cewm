import "server-only";

import { and, asc, eq, inArray, like, notInArray, sql } from "drizzle-orm";

import type { DomainError } from "@/lib/api/server";
import { getDb } from "@/lib/db";
import { categories, menuItems, menus, pages } from "@/lib/db/schema";
import type { Localized } from "@/lib/i18n/localized";
import { slugify, uniqueSlug } from "@/lib/slug";
import {
  footerMenuPrefix,
  isFooterMenu,
  mainMenuKey,
  menuMaxDepth,
  menuMaxItems,
  type MenuDetailDto,
  type MenuItemDto,
  type MenuItemValues,
  type MenuSummaryDto,
  type MenuTargetsDto,
  type SaveMenuValues,
} from "@/lib/validation/menus";

const missing: DomainError = { status: 404, message: "Menyu tapılmadı." };

const stale: DomainError = {
  status: 409,
  message: "Menyu başqa yerdə dəyişdirilib. Səhifəni yeniləyib yenidən cəhd edin.",
};

function invalid(field: string, message: string): DomainError {
  return { status: 400, message, fields: { [field]: message } };
}

const itemCount = sql<number>`(select count(*) from ${menuItems} mi where mi.menu_id = menus.id)::int`;

type MenuRow = typeof menus.$inferSelect;

function toSummary(row: MenuRow, count: number): MenuSummaryDto {
  return {
    id: row.id,
    key: row.key,
    title: row.title,
    sortOrder: row.sortOrder,
    itemCount: Number(count),
  };
}

export async function listMenus(): Promise<MenuSummaryDto[]> {
  const rows = await getDb()
    .select({ menu: menus, itemCount })
    .from(menus)
    .orderBy(asc(menus.sortOrder), asc(menus.createdAt));
  return rows.map((row) => toSummary(row.menu, row.itemCount));
}

async function findMenu(id: string): Promise<MenuRow | undefined> {
  const [row] = await getDb().select().from(menus).where(eq(menus.id, id));
  return row;
}

type ItemRow = typeof menuItems.$inferSelect;

function buildItems(rows: ItemRow[]): MenuItemDto[] {
  const known = new Set(rows.map((row) => row.id));
  const byParent = new Map<string | null, ItemRow[]>();
  for (const row of rows) {
    const key = row.parentId && known.has(row.parentId) ? row.parentId : null;
    byParent.set(key, [...(byParent.get(key) ?? []), row]);
  }
  const build = (parentId: string | null): MenuItemDto[] =>
    (byParent.get(parentId) ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      target: row.target,
      categoryId: row.categoryId,
      pageId: row.pageId,
      url: row.url,
      children: build(row.id),
    }));
  return build(null);
}

export async function getMenuDetail(id: string): Promise<MenuDetailDto | null> {
  const menu = await findMenu(id);
  if (!menu) return null;
  const rows = await getDb()
    .select()
    .from(menuItems)
    .where(eq(menuItems.menuId, id))
    .orderBy(asc(menuItems.sortOrder), asc(menuItems.createdAt));
  return {
    ...toSummary(menu, rows.length),
    items: buildItems(rows),
    updatedAt: menu.updatedAt.toISOString(),
  };
}

type FlatEntry = {
  item: MenuItemValues;
  path: string;
  parentPath: string | null;
  depth: number;
  index: number;
};

function flatten(
  items: MenuItemValues[],
  prefix = "items",
  parentPath: string | null = null,
  depth = 1,
): FlatEntry[] {
  return items.flatMap((item, index) => {
    const path = `${prefix}.${index}`;
    return [
      { item, path, parentPath, depth, index },
      ...flatten(item.children, `${path}.children`, path, depth + 1),
    ];
  });
}

async function checkTargets(entries: FlatEntry[]): Promise<DomainError | null> {
  const db = getDb();
  const ids = (pick: (item: MenuItemValues) => string | null) => [
    ...new Set(entries.map((entry) => pick(entry.item)).filter((id): id is string => Boolean(id))),
  ];
  const categoryIds = ids((item) => item.categoryId);
  const pageIds = ids((item) => item.pageId);
  const [foundCategories, foundPages] = await Promise.all([
    categoryIds.length
      ? db.select({ id: categories.id }).from(categories).where(inArray(categories.id, categoryIds))
      : [],
    pageIds.length ? db.select({ id: pages.id }).from(pages).where(inArray(pages.id, pageIds)) : [],
  ]);
  const known = new Set([...foundCategories, ...foundPages].map((row) => row.id));
  const fields: Record<string, string> = {};
  for (const { item, path } of entries) {
    if (item.categoryId && !known.has(item.categoryId)) {
      fields[`${path}.categoryId`] = "Kateqoriya tapılmadı.";
    }
    if (item.pageId && !known.has(item.pageId)) fields[`${path}.pageId`] = "Səhifə tapılmadı.";
  }
  if (!Object.keys(fields).length) return null;
  return { status: 400, message: "Bəzi elementlərin hədəfi tapılmadı.", fields };
}

class StaleMenuError extends Error {}

export async function saveMenu(
  id: string,
  values: SaveMenuValues,
): Promise<{ menu: MenuDetailDto } | { error: DomainError }> {
  const menu = await findMenu(id);
  if (!menu) return { error: missing };

  const entries = flatten(values.items);
  if (entries.length > menuMaxItems) {
    return { error: { status: 400, message: `Ən çox ${menuMaxItems} element ola bilər.` } };
  }
  const maxDepth = menuMaxDepth(menu.key);
  const tooDeep = entries.find((entry) => entry.depth > maxDepth);
  if (tooDeep) {
    return {
      error: invalid(
        tooDeep.path,
        maxDepth === 1
          ? "Altbilgi sütununda alt element ola bilməz."
          : `Menyu ən çox ${maxDepth} səviyyəli ola bilər.`,
      ),
    };
  }

  const given = entries.map((entry) => entry.item.id).filter((value): value is string => !!value);
  if (new Set(given).size !== given.length) {
    return { error: { status: 400, message: "Menyuda təkrarlanan element var." } };
  }
  const db = getDb();
  if (given.length) {
    const existing = await db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(and(eq(menuItems.menuId, id), inArray(menuItems.id, given)));
    if (existing.length !== given.length) return { error: stale };
  }

  const targetError = await checkTargets(entries);
  if (targetError) return { error: targetError };

  try {
    await db.transaction(async (tx) => {
      await tx.update(menus).set({ title: values.title }).where(eq(menus.id, id));
      const resolved = new Map<string, string>();
      for (const entry of entries) {
        const { item } = entry;
        const columns = {
          menuId: id,
          parentId: entry.parentPath ? (resolved.get(entry.parentPath) ?? null) : null,
          label: item.label,
          target: item.target,
          categoryId: item.categoryId,
          pageId: item.pageId,
          url: item.url,
          sortOrder: entry.index,
        };
        if (item.id) {
          const updated = await tx
            .update(menuItems)
            .set(columns)
            .where(and(eq(menuItems.id, item.id), eq(menuItems.menuId, id)))
            .returning({ id: menuItems.id });
          if (!updated.length) throw new StaleMenuError();
          resolved.set(entry.path, item.id);
        } else {
          const [row] = await tx.insert(menuItems).values(columns).returning({ id: menuItems.id });
          if (!row) throw new Error("Menu item was not created");
          resolved.set(entry.path, row.id);
        }
      }
      const kept = [...resolved.values()];
      await tx
        .delete(menuItems)
        .where(
          kept.length
            ? and(eq(menuItems.menuId, id), notInArray(menuItems.id, kept))
            : eq(menuItems.menuId, id),
        );
    });
  } catch (cause) {
    if (cause instanceof StaleMenuError) return { error: stale };
    throw cause;
  }

  const saved = await getMenuDetail(id);
  if (!saved) return { error: missing };
  return { menu: saved };
}

export async function createFooterMenu(
  title: Localized,
): Promise<{ menu: MenuSummaryDto } | { error: DomainError }> {
  const db = getDb();
  const taken = await db
    .select({ key: menus.key })
    .from(menus)
    .where(like(menus.key, `${footerMenuPrefix}%`));
  const key = uniqueSlug(
    `${footerMenuPrefix}${slugify(title.az) || "sutun"}`.slice(0, 96),
    new Set(taken.map((row) => row.key)),
  );
  const [row] = await db
    .insert(menus)
    .values({
      key,
      title,
      sortOrder: sql<number>`(select coalesce(max(${menus.sortOrder}), 0) + 1 from ${menus})`,
    })
    .returning();
  if (!row) throw new Error("Menu was not created");
  return { menu: toSummary(row, 0) };
}

export async function deleteMenu(id: string): Promise<{ ok: true } | { error: DomainError }> {
  const menu = await findMenu(id);
  if (!menu) return { error: missing };
  if (menu.key === mainMenuKey) {
    return { error: { status: 409, message: "Əsas menyu silinə bilməz." } };
  }
  if (!isFooterMenu(menu.key)) {
    return { error: { status: 409, message: "Yalnız altbilgi sütunları silinə bilər." } };
  }
  await getDb().delete(menus).where(eq(menus.id, id));
  return { ok: true };
}

export async function reorderFooterMenus(
  orderedIds: string[],
): Promise<{ ok: true } | { error: DomainError }> {
  if (new Set(orderedIds).size !== orderedIds.length) {
    return { error: { status: 400, message: "Sıra təkrarlanan sütun ehtiva edir." } };
  }
  const db = getDb();
  const footer = await db
    .select({ id: menus.id })
    .from(menus)
    .where(like(menus.key, `${footerMenuPrefix}%`));
  const footerIds = new Set(footer.map((row) => row.id));
  if (footer.length !== orderedIds.length || orderedIds.some((id) => !footerIds.has(id))) {
    return {
      error: { status: 409, message: "Siyahı köhnədir. Səhifəni yeniləyib yenidən cəhd edin." },
    };
  }
  await db.transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx
        .update(menus)
        .set({ sortOrder: index + 1 })
        .where(eq(menus.id, id));
    }
  });
  return { ok: true };
}

export async function listMenuTargets(): Promise<MenuTargetsDto> {
  const db = getDb();
  const [categoryRows, pageRows] = await Promise.all([
    db
      .select({
        id: categories.id,
        parentId: categories.parentId,
        name: categories.name,
        slug: categories.slug,
        isActive: categories.isActive,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.createdAt)),
    db
      .select({ id: pages.id, title: pages.title, slug: pages.slug, status: pages.status })
      .from(pages)
      .orderBy(sql`${pages.title} ->> 'az'`),
  ]);
  return {
    categories: categoryRows.map((row) => ({
      id: row.id,
      parentId: row.parentId,
      title: row.name,
      slug: row.slug,
      isActive: row.isActive,
    })),
    pages: pageRows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      isPublished: row.status === "published",
    })),
  };
}

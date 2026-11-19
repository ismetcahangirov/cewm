import "server-only";

import { asc, eq, like, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { cacheTag } from "next/cache";

import { publicTags } from "@/lib/cache/tags";
import { getDb } from "@/lib/db";
import { categories, menuItems, menus, pages, projects } from "@/lib/db/schema";
import { localePath, type Locale } from "@/lib/i18n/config";
import { pickLocale, type Localized } from "@/lib/i18n/localized";
import { routes } from "@/lib/routes";
import { footerMenuPrefix, type MenuItemTarget } from "@/lib/validation/menus";

export type PublicMenuItem = {
  id: string;
  label: string;
  href: string | null;
  children: PublicMenuItem[];
};

export type PublicFooterColumn = {
  key: string;
  title: string;
  items: PublicMenuItem[];
};

type Linked = { slug: Localized; visible: boolean } | null;

export type MenuSourceRow = {
  id: string;
  parentId: string | null;
  label: Localized;
  target: MenuItemTarget;
  url: string | null;
  category: Linked;
  page: Linked;
  project: Linked;
};

function slugIn(linked: Linked, locale: Locale): string | null {
  if (!linked || !linked.visible) return null;
  return pickLocale(linked.slug, locale) || null;
}

export function resolveMenuHref(row: MenuSourceRow, locale: Locale): string | null {
  switch (row.target) {
    case "category": {
      const slug = slugIn(row.category, locale);
      return slug ? localePath(locale, routes.category(slug)) : null;
    }
    case "page": {
      const slug = slugIn(row.page, locale);
      return slug ? localePath(locale, routes.page(slug)) : null;
    }
    case "project": {
      const slug = slugIn(row.project, locale);
      return slug ? localePath(locale, routes.project(slug)) : null;
    }
    case "url":
      if (!row.url) return null;
      return row.url.startsWith("/") ? localePath(locale, row.url) : row.url;
    case "none":
      return null;
  }
}

export function buildMenuTree(rows: MenuSourceRow[], locale: Locale): PublicMenuItem[] {
  const known = new Set(rows.map((row) => row.id));
  const byParent = new Map<string | null, MenuSourceRow[]>();
  for (const row of rows) {
    const key = row.parentId && known.has(row.parentId) ? row.parentId : null;
    byParent.set(key, [...(byParent.get(key) ?? []), row]);
  }
  const build = (parentId: string | null): PublicMenuItem[] =>
    (byParent.get(parentId) ?? []).flatMap((row) => {
      const href = resolveMenuHref(row, locale);
      const children = build(row.id);
      if (!href && !children.length) return [];
      return [{ id: row.id, label: pickLocale(row.label, locale), href, children }];
    });
  return build(null);
}

export function findCategoryMenu(
  items: PublicMenuItem[],
  images: Record<string, unknown>,
): PublicMenuItem | null {
  return (
    items.find((item) =>
      item.children.some((child) => child.href !== null && child.href in images),
    ) ?? null
  );
}

const parentCategories = alias(categories, "parent_categories");

async function loadMenuRows(where: SQL) {
  const rows = await getDb()
    .select({
      menuId: menus.id,
      menuKey: menus.key,
      menuTitle: menus.title,
      id: menuItems.id,
      parentId: menuItems.parentId,
      label: menuItems.label,
      target: menuItems.target,
      url: menuItems.url,
      categorySlug: categories.slug,
      categoryActive: categories.isActive,
      categoryParentId: categories.parentId,
      parentCategoryActive: parentCategories.isActive,
      pageSlug: pages.slug,
      pageStatus: pages.status,
      projectSlug: projects.slug,
      projectStatus: projects.status,
    })
    .from(menuItems)
    .innerJoin(menus, eq(menus.id, menuItems.menuId))
    .leftJoin(categories, eq(categories.id, menuItems.categoryId))
    .leftJoin(parentCategories, eq(parentCategories.id, categories.parentId))
    .leftJoin(pages, eq(pages.id, menuItems.pageId))
    .leftJoin(projects, eq(projects.id, menuItems.projectId))
    .where(where)
    .orderBy(asc(menus.sortOrder), asc(menuItems.sortOrder), asc(menuItems.createdAt));

  return rows.map((row) => ({
    menuId: row.menuId,
    menuKey: row.menuKey,
    menuTitle: row.menuTitle,
    source: {
      id: row.id,
      parentId: row.parentId,
      label: row.label,
      target: row.target,
      url: row.url,
      category: row.categorySlug
        ? {
            slug: row.categorySlug,
            visible:
              row.categoryActive === true &&
              (row.categoryParentId === null || row.parentCategoryActive === true),
          }
        : null,
      page: row.pageSlug ? { slug: row.pageSlug, visible: row.pageStatus === "published" } : null,
      project: row.projectSlug
        ? { slug: row.projectSlug, visible: row.projectStatus === "published" }
        : null,
    } satisfies MenuSourceRow,
  }));
}

export async function getMenu(key: string, locale: Locale): Promise<PublicMenuItem[]> {
  "use cache";
  cacheTag(publicTags.menus, publicTags.catalog, publicTags.content);
  const rows = await loadMenuRows(eq(menus.key, key));
  return buildMenuTree(
    rows.map((row) => row.source),
    locale,
  );
}

export async function getFooterMenus(locale: Locale): Promise<PublicFooterColumn[]> {
  "use cache";
  cacheTag(publicTags.menus, publicTags.catalog, publicTags.content);
  const rows = await loadMenuRows(like(menus.key, `${footerMenuPrefix}%`));
  const columns = new Map<string, { key: string; title: Localized; rows: MenuSourceRow[] }>();
  for (const row of rows) {
    const column = columns.get(row.menuId) ?? { key: row.menuKey, title: row.menuTitle, rows: [] };
    column.rows.push(row.source);
    columns.set(row.menuId, column);
  }
  return [...columns.values()]
    .map((column) => ({
      key: column.key,
      title: pickLocale(column.title, locale),
      items: buildMenuTree(column.rows, locale),
    }))
    .filter((column) => column.items.length > 0);
}

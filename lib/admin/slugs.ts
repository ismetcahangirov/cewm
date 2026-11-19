import "server-only";

import { and, ne, sql, type SQL } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { categories, pages, posts, products } from "@/lib/db/schema";
import { localeKey } from "@/lib/db/schema/columns";
import type { Locale } from "@/lib/i18n/config";
import { slugify } from "@/lib/slug";
import { reservedPageSlugs } from "@/lib/validation/pages";
import type { SlugCheckResult, SlugEntity } from "@/lib/validation/slugs";

const tables = {
  product: products,
  category: categories,
  page: pages,
  post: posts,
} as const;

export async function takenSlugs(
  entity: SlugEntity,
  locale: Locale,
  base: string,
  excludeId?: string,
): Promise<Set<string>> {
  const table = tables[entity];
  const column = sql<string>`${localeKey(table.slug, locale)}`;
  const filters: SQL[] = [sql`(${column} = ${base} or ${column} like ${`${base}-%`})`];
  if (excludeId) filters.push(ne(table.id, excludeId));
  const rows = await getDb()
    .select({ slug: column })
    .from(table)
    .where(and(...filters));
  const taken = new Set(rows.map((row) => row.slug));
  if (entity === "page") {
    for (const reserved of reservedPageSlugs) {
      if (reserved === base || reserved.startsWith(`${base}-`)) taken.add(reserved);
    }
  }
  return taken;
}

export async function freeSlug(
  entity: SlugEntity,
  locale: Locale,
  value: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(value) || entity;
  const taken = await takenSlugs(entity, locale, base, excludeId);
  let candidate = base;
  for (let n = 2; taken.has(candidate); n++) candidate = `${base}-${n}`;
  return candidate;
}

export async function checkSlug(
  entity: SlugEntity,
  locale: Locale,
  slug: string,
  excludeId?: string,
): Promise<SlugCheckResult> {
  const suggestion = await freeSlug(entity, locale, slug, excludeId);
  return { available: suggestion === slug, suggestion };
}

import "server-only";

import { and, eq, isNull, lte, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";

import { getDb } from "@/lib/db";
import { categories, pages, posts, products } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";

import { slugMatches } from "./slug";

const knownPaths = new Map<string, number>();
const rememberFor = 60_000;
const rememberLimit = 5_000;

const fixedSections = new Set(["mehsullar", "kateqoriyalar", "bloq"]);

async function anyRow(
  table: PgTable,
  column: AnyPgColumn,
  visible: SQL | undefined,
  locale: Locale,
  slug: string,
) {
  const [row] = await getDb()
    .select({ one: sql<number>`1` })
    .from(table)
    .where(and(visible, slugMatches(column, locale, slug)))
    .limit(1);
  return row !== undefined;
}

function lookup(locale: Locale, segments: string[]): Promise<boolean> | boolean {
  const [first, second, ...rest] = segments;
  if (rest.length) return false;
  if (first === undefined) return true;
  if (second === undefined) {
    if (fixedSections.has(first)) return true;
    return anyRow(pages, pages.slug, eq(pages.status, "published"), locale, first);
  }
  switch (first) {
    case "mehsullar":
      return anyRow(categories, categories.slug, eq(categories.isActive, true), locale, second);
    case "mehsul":
      return anyRow(
        products,
        products.slug,
        and(eq(products.status, "published"), isNull(products.deletedAt)),
        locale,
        second,
      );
    case "bloq":
      return anyRow(
        posts,
        posts.slug,
        and(eq(posts.status, "published"), lte(posts.publishedAt, sql`now()`)),
        locale,
        second,
      );
    default:
      return false;
  }
}

export async function publicPathExists(locale: Locale, segments: string[]): Promise<boolean> {
  const key = `${locale}/${segments.join("/")}`;
  const now = Date.now();
  const until = knownPaths.get(key);
  if (until !== undefined && until > now) return true;
  try {
    const decoded = segments.map((segment) => decodeURIComponent(segment));
    const exists = await lookup(locale, decoded);
    if (exists) {
      if (knownPaths.size >= rememberLimit) knownPaths.clear();
      knownPaths.set(key, now + rememberFor);
    }
    return exists;
  } catch {
    return true;
  }
}

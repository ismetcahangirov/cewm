import "server-only";

import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import type { DomainError } from "@/lib/api/server";
import type { Page } from "@/lib/api/types";
import { getDb } from "@/lib/db";
import { containsPattern } from "@/lib/db/like";
import { pages } from "@/lib/db/schema";
import { localeKey } from "@/lib/db/schema/columns";
import { locales } from "@/lib/i18n/config";
import type {
  PageDetailDto,
  PageListArgs,
  PageListItemDto,
  PageSortField,
  PageValues,
} from "@/lib/validation/pages";

import { checkImage, menuItemCount, slugConflictFor } from "./content";
import { findMedia, toMediaDto } from "./media";

export type PageError = DomainError;

const missing: PageError = { status: 404, message: "Səhifə tapılmadı." };

const sortColumns: Record<PageSortField, SQL | AnyPgColumn> = {
  updatedAt: pages.updatedAt,
  title: sql`lower(${localeKey(pages.title, "az")})`,
  status: pages.status,
};

const menuLinks = menuItemCount("page_id", sql`pages.id`);

const slugConflict = slugConflictFor(
  "pages",
  "Bu ünvan (slug) artıq başqa səhifədə istifadə olunur.",
);

export async function listPages(args: PageListArgs): Promise<Page<PageListItemDto>> {
  const db = getDb();
  const filters: SQL[] = [];
  if (args.search) {
    const pattern = containsPattern(args.search);
    const match = or(
      ...locales.map((locale) => ilike(localeKey(pages.title, locale), pattern)),
      ...locales.map((locale) => ilike(localeKey(pages.slug, locale), pattern)),
    );
    if (match) filters.push(match);
  }
  const where = filters.length ? and(...filters) : undefined;
  const direction = args.order === "desc" ? desc : asc;

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: pages.id,
        kind: pages.kind,
        title: pages.title,
        slug: pages.slug,
        status: pages.status,
        updatedAt: pages.updatedAt,
        menuItemCount: menuLinks,
      })
      .from(pages)
      .where(where)
      .orderBy(direction(sortColumns[args.sort]), asc(pages.id))
      .limit(args.pageSize)
      .offset(args.page * args.pageSize),
    db.select({ value: count() }).from(pages).where(where),
  ]);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      slug: row.slug,
      status: row.status,
      menuItemCount: Number(row.menuItemCount),
      updatedAt: row.updatedAt.toISOString(),
    })),
    rowCount: total?.value ?? 0,
  };
}

async function findPage(id: string) {
  const [row] = await getDb()
    .select({ page: pages, menuItemCount: menuLinks })
    .from(pages)
    .where(eq(pages.id, id));
  return row ? { ...row.page, menuItemCount: Number(row.menuItemCount) } : undefined;
}

export async function getPage(id: string): Promise<PageDetailDto | null> {
  const row = await findPage(id);
  if (!row) return null;
  const cover = row.coverId ? await findMedia(row.coverId) : undefined;
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    slug: row.slug,
    content: row.content,
    coverId: row.coverId,
    cover: cover ? toMediaDto(cover) : null,
    status: row.status,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    menuItemCount: row.menuItemCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function savePage(
  id: string | null,
  values: PageValues,
): Promise<{ id: string } | { error: PageError }> {
  if (id && !(await findPage(id))) return { error: missing };
  const coverError = await checkImage("coverId", values.coverId);
  if (coverError) return { error: coverError };

  const columns = {
    title: values.title,
    slug: values.slug,
    content: values.content,
    coverId: values.coverId,
    status: values.status,
    seoTitle: values.seoTitle,
    seoDescription: values.seoDescription,
  };
  try {
    if (id) {
      await getDb().update(pages).set(columns).where(eq(pages.id, id));
      return { id };
    }
    const [row] = await getDb().insert(pages).values(columns).returning({ id: pages.id });
    if (!row) throw new Error("Page was not created");
    return { id: row.id };
  } catch (cause) {
    const conflict = slugConflict(cause);
    if (conflict) return { error: conflict };
    throw cause;
  }
}

export async function deletePage(id: string): Promise<{ ok: true } | { error: PageError }> {
  const row = await findPage(id);
  if (!row) return { error: missing };
  if (row.kind) {
    return {
      error: {
        status: 409,
        message:
          "Sistem səhifəsini silmək olmaz: sayt bu səhifəyə bağlıdır. Onu qaralamaya çevirə bilərsiniz.",
      },
    };
  }
  await getDb().delete(pages).where(eq(pages.id, id));
  return { ok: true };
}

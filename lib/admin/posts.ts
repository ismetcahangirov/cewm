import "server-only";

import { and, asc, count, desc, eq, gt, ilike, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import type { DomainError } from "@/lib/api/server";
import type { Page } from "@/lib/api/types";
import { getDb } from "@/lib/db";
import { containsPattern } from "@/lib/db/like";
import { media, posts } from "@/lib/db/schema";
import { localeKey } from "@/lib/db/schema/columns";
import { locales } from "@/lib/i18n/config";
import { routes } from "@/lib/routes";
import type {
  PostDetailDto,
  PostListArgs,
  PostListItemDto,
  PostSortField,
  PostState,
  PostValues,
} from "@/lib/validation/posts";

import { checkImage, slugConflictFor } from "./content";
import { findMedia, toMediaDto } from "./media";

export type PostError = DomainError;

const missing: PostError = { status: 404, message: "Yazı tapılmadı." };

const sortColumns: Record<PostSortField, SQL | AnyPgColumn> = {
  updatedAt: posts.updatedAt,
  publishedAt: posts.publishedAt,
  title: sql`lower(${localeKey(posts.title, "az")})`,
};

const slugConflict = slugConflictFor(
  "posts",
  "Bu ünvan (slug) artıq başqa yazıda istifadə olunur.",
);

export function postState(
  status: "draft" | "published",
  publishedAt: Date | null,
  now = new Date(),
): PostState {
  if (status === "draft") return "draft";
  return publishedAt && publishedAt > now ? "scheduled" : "published";
}

function statusFilter(status: PostListArgs["status"], now: Date): SQL | undefined {
  switch (status) {
    case "draft":
      return eq(posts.status, "draft");
    case "published":
      return and(
        eq(posts.status, "published"),
        or(isNull(posts.publishedAt), lte(posts.publishedAt, now)),
      );
    case "scheduled":
      return and(eq(posts.status, "published"), gt(posts.publishedAt, now));
    default:
      return undefined;
  }
}

export async function listPosts(args: PostListArgs): Promise<Page<PostListItemDto>> {
  const db = getDb();
  const now = new Date();
  const filters: SQL[] = [];
  const status = statusFilter(args.status, now);
  if (status) filters.push(status);
  if (args.search) {
    const pattern = containsPattern(args.search);
    const match = or(
      ...locales.map((locale) => ilike(localeKey(posts.title, locale), pattern)),
      ilike(localeKey(posts.slug, "az"), pattern),
    );
    if (match) filters.push(match);
  }
  const where = filters.length ? and(...filters) : undefined;
  const direction = args.order === "desc" ? desc : asc;
  const order =
    args.sort === "publishedAt"
      ? sql`${posts.publishedAt} ${sql.raw(args.order === "desc" ? "desc" : "asc")} nulls last`
      : direction(sortColumns[args.sort]);

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        status: posts.status,
        publishedAt: posts.publishedAt,
        updatedAt: posts.updatedAt,
        coverKey: media.key,
        coverAlt: media.alt,
      })
      .from(posts)
      .leftJoin(media, eq(media.id, posts.coverId))
      .where(where)
      .orderBy(order, asc(posts.id))
      .limit(args.pageSize)
      .offset(args.page * args.pageSize),
    db.select({ value: count() }).from(posts).where(where),
  ]);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      status: row.status,
      state: postState(row.status, row.publishedAt, now),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      cover: row.coverKey
        ? { src: routes.media(row.coverKey), alt: row.coverAlt?.az ?? null }
        : null,
      updatedAt: row.updatedAt.toISOString(),
    })),
    rowCount: total?.value ?? 0,
  };
}

async function findPost(id: string) {
  const [row] = await getDb().select().from(posts).where(eq(posts.id, id));
  return row;
}

export async function getPost(id: string): Promise<PostDetailDto | null> {
  const row = await findPost(id);
  if (!row) return null;
  const cover = row.coverId ? await findMedia(row.coverId) : undefined;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    coverId: row.coverId,
    cover: cover ? toMediaDto(cover) : null,
    status: row.status,
    state: postState(row.status, row.publishedAt),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function savePost(
  id: string | null,
  values: PostValues,
): Promise<{ id: string } | { error: PostError }> {
  if (id && !(await findPost(id))) return { error: missing };
  const coverError = await checkImage("coverId", values.coverId);
  if (coverError) return { error: coverError };

  const publishedAt = values.publishedAt
    ? new Date(values.publishedAt)
    : values.status === "published"
      ? new Date()
      : null;
  const columns = {
    title: values.title,
    slug: values.slug,
    excerpt: values.excerpt,
    content: values.content,
    coverId: values.coverId,
    status: values.status,
    publishedAt,
    seoTitle: values.seoTitle,
    seoDescription: values.seoDescription,
  };
  try {
    if (id) {
      await getDb().update(posts).set(columns).where(eq(posts.id, id));
      return { id };
    }
    const [row] = await getDb().insert(posts).values(columns).returning({ id: posts.id });
    if (!row) throw new Error("Post was not created");
    return { id: row.id };
  } catch (cause) {
    const conflict = slugConflict(cause);
    if (conflict) return { error: conflict };
    throw cause;
  }
}

export async function deletePost(id: string): Promise<boolean> {
  const removed = await getDb().delete(posts).where(eq(posts.id, id)).returning({ id: posts.id });
  return removed.length > 0;
}

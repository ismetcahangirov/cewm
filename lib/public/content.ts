import "server-only";

import { and, asc, count, desc, eq, lte, ne, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { publicTags } from "@/lib/cache/tags";
import { pickRichText, type RichTextDoc } from "@/lib/content/rich-text";
import { getDb } from "@/lib/db";
import { media, posts } from "@/lib/db/schema";
import { localePath, type Locale } from "@/lib/i18n/config";
import { pickExact, pickLocale, type Localized } from "@/lib/i18n/localized";
import { routes } from "@/lib/routes";

import { imageColumns } from "./catalog";
import { toPublicImage, type PublicImage } from "./images";
import { slugMatches, slugRank } from "./slug";

export type PostCardData = {
  id: string;
  title: string;
  excerpt: string | null;
  href: string;
  publishedAt: string;
  image: PublicImage | null;
};

export type PublicPost = PostCardData & {
  slug: Localized;
  content: RichTextDoc | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type PostPage = { items: PostCardData[]; total: number };

export const postsPerPage = 12;
export const relatedPostCount = 3;

const visiblePost = and(eq(posts.status, "published"), lte(posts.publishedAt, sql`now()`));

function optionalText(value: Localized | null, locale: Locale): string | null {
  return value ? pickLocale(value, locale) || null : null;
}

type PostRow = {
  id: string;
  slug: Localized;
  title: Localized;
  excerpt: Localized | null;
  publishedAt: Date | null;
  key: string | null;
  width: number | null;
  height: number | null;
  alt: Localized | null;
  lqip: string | null;
};

function toPostCard(row: PostRow, locale: Locale): PostCardData {
  const title = pickLocale(row.title, locale);
  return {
    id: row.id,
    title,
    excerpt: optionalText(row.excerpt, locale),
    href: localePath(locale, routes.post(pickLocale(row.slug, locale))),
    publishedAt: (row.publishedAt ?? new Date(0)).toISOString(),
    image: toPublicImage(row, locale, title),
  };
}

const postColumns = {
  id: posts.id,
  slug: posts.slug,
  title: posts.title,
  excerpt: posts.excerpt,
  publishedAt: posts.publishedAt,
  ...imageColumns,
};

const newestFirst = [desc(posts.publishedAt), desc(posts.createdAt), asc(posts.id)] as const;

export async function queryPosts(locale: Locale, page: number): Promise<PostPage> {
  const db = getDb();
  const [rows, [total]] = await Promise.all([
    db
      .select(postColumns)
      .from(posts)
      .leftJoin(media, eq(media.id, posts.coverId))
      .where(visiblePost)
      .orderBy(...newestFirst)
      .limit(postsPerPage * page),
    db.select({ value: count() }).from(posts).where(visiblePost),
  ]);
  return { items: rows.map((row) => toPostCard(row, locale)), total: total?.value ?? 0 };
}

export async function queryPostBySlug(locale: Locale, slug: string): Promise<PublicPost | null> {
  const [row] = await getDb()
    .select({
      ...postColumns,
      content: posts.content,
      seoTitle: posts.seoTitle,
      seoDescription: posts.seoDescription,
    })
    .from(posts)
    .leftJoin(media, eq(media.id, posts.coverId))
    .where(and(visiblePost, slugMatches(posts.slug, locale, slug)))
    .orderBy(slugRank(posts.slug, locale, slug))
    .limit(1);
  if (!row) return null;
  return {
    ...toPostCard(row, locale),
    slug: row.slug,
    content: pickRichText(row.content, locale),
    seoTitle: pickExact(row.seoTitle, locale),
    seoDescription: pickExact(row.seoDescription, locale),
  };
}

export async function queryRelatedPosts(
  locale: Locale,
  excludeId: string,
): Promise<PostCardData[]> {
  const rows = await getDb()
    .select(postColumns)
    .from(posts)
    .leftJoin(media, eq(media.id, posts.coverId))
    .where(and(visiblePost, ne(posts.id, excludeId)))
    .orderBy(...newestFirst)
    .limit(relatedPostCount);
  return rows.map((row) => toPostCard(row, locale));
}

export async function getPostPage(locale: Locale, page: number): Promise<PostPage> {
  "use cache";
  cacheTag(publicTags.content, publicTags.catalog);
  cacheLife("minutes");
  return queryPosts(locale, page);
}

export async function getPostBySlug(locale: Locale, slug: string): Promise<PublicPost | null> {
  "use cache";
  cacheTag(publicTags.content, publicTags.catalog);
  cacheLife("minutes");
  return queryPostBySlug(locale, slug);
}

export async function getRelatedPosts(locale: Locale, excludeId: string): Promise<PostCardData[]> {
  "use cache";
  cacheTag(publicTags.content, publicTags.catalog);
  cacheLife("minutes");
  return queryRelatedPosts(locale, excludeId);
}

export function formatPostDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "Asia/Baku" }).format(
    new Date(iso),
  );
}

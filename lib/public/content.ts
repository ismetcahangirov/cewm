import "server-only";

import { and, asc, count, desc, eq, inArray, lte, ne, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { publicTags } from "@/lib/cache/tags";
import { pickRichText, type RichTextDoc } from "@/lib/content/rich-text";
import { getDb } from "@/lib/db";
import { logos, media, posts, projectImages, projects } from "@/lib/db/schema";
import { localePath, type Locale } from "@/lib/i18n/config";
import { pickExact, pickLocale, type Localized } from "@/lib/i18n/localized";
import { routes } from "@/lib/routes";

import { imageColumns } from "./catalog";
import type { HomeLogo } from "./home";
import { toPublicImage, type PublicImage } from "./images";
import { slugMatches, slugRank } from "./slug";

export type ProjectType = (typeof projects.type.enumValues)[number];

export type ProjectListItem = {
  id: string;
  title: string;
  excerpt: string | null;
  isVisual: boolean;
  type: ProjectType;
  href: string;
  image: PublicImage;
};

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

export type LogoGroupName = (typeof logos.group.enumValues)[number];

export const postsPerPage = 12;
export const relatedPostCount = 3;

const visiblePost = and(eq(posts.status, "published"), lte(posts.publishedAt, sql`now()`));

function optionalText(value: Localized | null, locale: Locale): string | null {
  return value ? pickLocale(value, locale) || null : null;
}

export async function queryProjects(locale: Locale): Promise<ProjectListItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      excerpt: projects.excerpt,
      type: projects.type,
      ...imageColumns,
    })
    .from(projects)
    .leftJoin(media, eq(media.id, projects.coverId))
    .where(eq(projects.status, "published"))
    .orderBy(asc(projects.sortOrder), desc(projects.createdAt), asc(projects.id));

  const withoutCover = rows.filter((row) => !row.key).map((row) => row.id);
  const firstImages = withoutCover.length
    ? await db
        .selectDistinctOn([projectImages.projectId], {
          projectId: projectImages.projectId,
          ...imageColumns,
        })
        .from(projectImages)
        .innerJoin(media, eq(media.id, projectImages.mediaId))
        .where(inArray(projectImages.projectId, withoutCover))
        .orderBy(asc(projectImages.projectId), asc(projectImages.position))
    : [];
  const fallback = new Map(firstImages.map((row) => [row.projectId, row]));

  return rows.flatMap((row) => {
    const title = pickLocale(row.title, locale);
    const image = toPublicImage(row.key ? row : fallback.get(row.id), locale, title);
    if (!image) return [];
    return [
      {
        id: row.id,
        title,
        excerpt: optionalText(row.excerpt, locale),
        isVisual: row.type === "3d-visual",
        type: row.type,
        href: localePath(locale, routes.project(pickLocale(row.slug, locale))),
        image,
      },
    ];
  });
}

export function filterProjects(
  items: ProjectListItem[],
  type: ProjectType | null,
): ProjectListItem[] {
  return type ? items.filter((item) => item.type === type) : items;
}

export function projectTypeFromQuery(value: string | string[] | undefined): ProjectType | null {
  if (value === "tamamlanmis") return "completed";
  if (value === "3d") return "3d-visual";
  return null;
}

export async function getProjectList(locale: Locale): Promise<ProjectListItem[]> {
  "use cache";
  cacheTag(publicTags.content, publicTags.catalog);
  cacheLife("hours");
  return queryProjects(locale);
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

export async function queryLogosByGroup(locale: Locale, group: LogoGroupName): Promise<HomeLogo[]> {
  const rows = await getDb()
    .select({ id: logos.id, name: logos.name, url: logos.url, ...imageColumns })
    .from(logos)
    .innerJoin(media, eq(media.id, logos.imageId))
    .where(and(eq(logos.group, group), eq(logos.isActive, true)))
    .orderBy(asc(logos.sortOrder), asc(logos.createdAt), asc(logos.id));
  return rows.flatMap((row) => {
    const image = toPublicImage(row, locale, row.name);
    return image ? [{ id: row.id, name: row.name, url: row.url, image }] : [];
  });
}

export async function getLogosByGroup(locale: Locale, group: LogoGroupName): Promise<HomeLogo[]> {
  "use cache";
  cacheTag(publicTags.content, publicTags.catalog);
  cacheLife("hours");
  return queryLogosByGroup(locale, group);
}

export function formatPostDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "Asia/Baku" }).format(
    new Date(iso),
  );
}

import "server-only";

import { and, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { publicTags } from "@/lib/cache/tags";
import { pickRichText, type RichTextDoc } from "@/lib/content/rich-text";
import { getDb } from "@/lib/db";
import { media, pages } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";
import { pickExact, pickLocale, type Localized } from "@/lib/i18n/localized";

import { imageColumns } from "./catalog";
import { toPublicImage, type PublicImage } from "./images";
import { slugMatches, slugRank } from "./slug";

export type PageKind = (typeof pages.kind.enumValues)[number];

export type PublicPage = {
  id: string;
  kind: PageKind | null;
  slug: Localized;
  title: string;
  content: RichTextDoc | null;
  cover: PublicImage | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export async function getPageBySlug(locale: Locale, slug: string): Promise<PublicPage | null> {
  "use cache";
  cacheTag(publicTags.content, publicTags.catalog);
  cacheLife("hours");
  const [row] = await getDb()
    .select({
      id: pages.id,
      kind: pages.kind,
      slug: pages.slug,
      title: pages.title,
      content: pages.content,
      seoTitle: pages.seoTitle,
      seoDescription: pages.seoDescription,
      ...imageColumns,
    })
    .from(pages)
    .leftJoin(media, eq(media.id, pages.coverId))
    .where(and(eq(pages.status, "published"), slugMatches(pages.slug, locale, slug)))
    .orderBy(slugRank(pages.slug, locale, slug))
    .limit(1);
  if (!row) return null;
  const title = pickLocale(row.title, locale);
  return {
    id: row.id,
    kind: row.kind,
    slug: row.slug,
    title,
    content: pickRichText(row.content, locale),
    cover: toPublicImage(row, locale, title),
    seoTitle: pickExact(row.seoTitle, locale),
    seoDescription: pickExact(row.seoDescription, locale),
  };
}

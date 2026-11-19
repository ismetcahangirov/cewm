import "server-only";

import { and, asc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

import { publicTags } from "@/lib/cache/tags";
import { getDb } from "@/lib/db";
import {
  categories,
  media,
  pages,
  posts,
  productCategories,
  productImages,
  products,
  projects,
  settings,
  vacancies,
} from "@/lib/db/schema";
import { defaultLocale, localePath, locales } from "@/lib/i18n/config";
import { pickLocale, type Localized } from "@/lib/i18n/localized";
import { visibleCategoryIds } from "@/lib/public/product";
import { openVacancy } from "@/lib/public/vacancies";
import { routes } from "@/lib/routes";

export type SitemapItem = { slug: Localized; updatedAt: string; images?: string[] };

export type SitemapSource = {
  settingsUpdatedAt: string | null;
  categories: SitemapItem[];
  products: SitemapItem[];
  projects: SitemapItem[];
  pages: SitemapItem[];
  posts: SitemapItem[];
  vacancies: SitemapItem[];
};

const maxImagesPerUrl = 10;

export async function querySitemapSource(): Promise<SitemapSource> {
  const db = getDb();
  const [
    settingsRows,
    categoryRows,
    productRows,
    links,
    imageRows,
    projectRows,
    pageRows,
    postRows,
    vacancyRows,
  ] = await Promise.all([
    db.select({ updatedAt: settings.updatedAt }).from(settings),
    db
      .select({
        id: categories.id,
        parentId: categories.parentId,
        isActive: categories.isActive,
        slug: categories.slug,
        updatedAt: categories.updatedAt,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.createdAt)),
    db
      .select({ id: products.id, slug: products.slug, updatedAt: products.updatedAt })
      .from(products)
      .where(and(eq(products.status, "published"), isNull(products.deletedAt)))
      .orderBy(asc(products.sortOrder), asc(products.createdAt)),
    db
      .select({ productId: productCategories.productId, categoryId: productCategories.categoryId })
      .from(productCategories),
    db
      .select({ productId: productImages.productId, key: media.key })
      .from(productImages)
      .innerJoin(media, eq(media.id, productImages.mediaId))
      .innerJoin(products, eq(products.id, productImages.productId))
      .where(
        and(
          eq(products.status, "published"),
          isNull(products.deletedAt),
          inArray(media.mimeType, ["image/jpeg", "image/png", "image/webp"]),
        ),
      )
      .orderBy(asc(productImages.position)),
    db
      .select({ slug: projects.slug, updatedAt: projects.updatedAt })
      .from(projects)
      .where(eq(projects.status, "published"))
      .orderBy(asc(projects.sortOrder), asc(projects.createdAt)),
    db
      .select({ slug: pages.slug, updatedAt: pages.updatedAt })
      .from(pages)
      .where(eq(pages.status, "published"))
      .orderBy(asc(pages.createdAt)),
    db
      .select({ slug: posts.slug, updatedAt: posts.updatedAt })
      .from(posts)
      .where(and(eq(posts.status, "published"), lte(posts.publishedAt, sql`now()`)))
      .orderBy(asc(posts.publishedAt)),
    db
      .select({ slug: vacancies.slug, updatedAt: vacancies.updatedAt })
      .from(vacancies)
      .where(openVacancy)
      .orderBy(asc(vacancies.publishedAt)),
  ]);

  const visible = visibleCategoryIds(categoryRows);
  const linksByProduct = new Map<string, string[]>();
  for (const link of links) {
    linksByProduct.set(link.productId, [
      ...(linksByProduct.get(link.productId) ?? []),
      link.categoryId,
    ]);
  }
  const imagesByProduct = new Map<string, string[]>();
  for (const image of imageRows) {
    const list = imagesByProduct.get(image.productId) ?? [];
    if (list.length < maxImagesPerUrl) list.push(routes.media(image.key));
    imagesByProduct.set(image.productId, list);
  }
  const iso = (date: Date) => date.toISOString();

  return {
    settingsUpdatedAt: settingsRows[0] ? iso(settingsRows[0].updatedAt) : null,
    categories: categoryRows
      .filter((row) => visible.has(row.id))
      .map((row) => ({ slug: row.slug, updatedAt: iso(row.updatedAt) })),
    products: productRows
      .filter((row) => {
        const linked = linksByProduct.get(row.id);
        return !linked || linked.some((id) => visible.has(id));
      })
      .map((row) => ({
        slug: row.slug,
        updatedAt: iso(row.updatedAt),
        images: imagesByProduct.get(row.id) ?? [],
      })),
    projects: projectRows.map((row) => ({ slug: row.slug, updatedAt: iso(row.updatedAt) })),
    pages: pageRows.map((row) => ({ slug: row.slug, updatedAt: iso(row.updatedAt) })),
    posts: postRows.map((row) => ({ slug: row.slug, updatedAt: iso(row.updatedAt) })),
    vacancies: vacancyRows.map((row) => ({ slug: row.slug, updatedAt: iso(row.updatedAt) })),
  };
}

export async function getSitemapSource(): Promise<SitemapSource> {
  "use cache";
  cacheTag(publicTags.catalog, publicTags.content, publicTags.settings);
  cacheLife("hours");
  return querySitemapSource();
}

function latest(dates: (string | null | undefined)[]): string | undefined {
  const values = dates.filter((date): date is string => Boolean(date)).sort();
  return values.at(-1);
}

export function buildSitemap(source: SitemapSource, siteUrl: string): MetadataRoute.Sitemap {
  const absolute = (path: string) => new URL(path, siteUrl).toString();

  const entries = (
    build: (locale: (typeof locales)[number]) => string,
    lastModified: string | undefined,
    images?: string[],
  ): MetadataRoute.Sitemap => {
    const languages = Object.fromEntries([
      ...locales.map((locale) => [locale, absolute(build(locale))]),
      ["x-default", absolute(build(defaultLocale))],
    ]);
    return locales.map((locale) => ({
      url: absolute(build(locale)),
      ...(lastModified ? { lastModified } : {}),
      alternates: { languages },
      ...(images?.length ? { images: images.map(absolute) } : {}),
    }));
  };

  const fromItems = (items: SitemapItem[], route: (slug: string) => string) =>
    items.flatMap((item) =>
      entries(
        (locale) => localePath(locale, route(pickLocale(item.slug, locale))),
        item.updatedAt,
        item.images,
      ),
    );

  const catalogUpdated = latest([
    ...source.categories.map((item) => item.updatedAt),
    ...source.products.map((item) => item.updatedAt),
  ]);
  const projectsUpdated = latest(source.projects.map((item) => item.updatedAt));
  const postsUpdated = latest(source.posts.map((item) => item.updatedAt));
  const vacanciesUpdated = latest(source.vacancies.map((item) => item.updatedAt));
  const homeUpdated = latest([source.settingsUpdatedAt, catalogUpdated, projectsUpdated]);

  return [
    ...entries((locale) => localePath(locale, routes.home()), homeUpdated),
    ...entries((locale) => localePath(locale, routes.catalogue()), catalogUpdated),
    ...(source.categories.length
      ? entries((locale) => localePath(locale, routes.categories()), catalogUpdated)
      : []),
    ...fromItems(source.categories, routes.category),
    ...fromItems(source.products, routes.product),
    ...(source.projects.length
      ? entries((locale) => localePath(locale, routes.projects()), projectsUpdated)
      : []),
    ...fromItems(source.projects, routes.project),
    ...fromItems(source.pages, routes.page),
    ...(source.posts.length
      ? entries((locale) => localePath(locale, routes.blog()), postsUpdated)
      : []),
    ...fromItems(source.posts, routes.post),
    ...entries((locale) => localePath(locale, routes.vacancies()), vacanciesUpdated),
    ...fromItems(source.vacancies, routes.vacancy),
  ];
}

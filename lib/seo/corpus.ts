import "server-only";

import { and, asc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { publicTags } from "@/lib/cache/tags";
import { getDb } from "@/lib/db";
import {
  brands,
  categories,
  contactPersons,
  media,
  pages,
  posts,
  productCategories,
  productDocuments,
  productImages,
  products,
  settings,
} from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";
import { getSiteSettings } from "@/lib/public/settings";
import { visibleCategoryIds } from "@/lib/public/product";

import { blogLocales } from "./sitemap";
import { translatedIn, entityTitle } from "./model";
import type { Corpus, CorpusImage, EntityKind } from "./model";

const rasterTypes = ["image/jpeg", "image/png", "image/webp"];

type MediaRow = typeof media.$inferSelect;

function toImage(row: Pick<MediaRow, "key" | "width" | "height" | "alt" | "caption">): CorpusImage {
  return {
    key: row.key,
    width: row.width,
    height: row.height,
    alt: row.alt,
    caption: row.caption,
  };
}

const iso = (date: Date) => date.toISOString();

export async function queryCorpus(): Promise<Corpus> {
  const db = getDb();
  const [
    siteSettings,
    settingsRows,
    brandRows,
    categoryRows,
    productRows,
    linkRows,
    imageRows,
    documentRows,
    pageRows,
    postRows,
    personRows,
  ] = await Promise.all([
    getSiteSettings(),
    db.select({ updatedAt: settings.updatedAt }).from(settings),
    db
      .select()
      .from(brands)
      .where(eq(brands.isActive, true))
      .orderBy(asc(brands.sortOrder), asc(brands.createdAt)),
    db
      .select({ category: categories, image: media })
      .from(categories)
      .leftJoin(media, eq(media.id, categories.imageId))
      .orderBy(asc(categories.sortOrder), asc(categories.createdAt)),
    db
      .select({ product: products, brandName: brands.name })
      .from(products)
      .leftJoin(brands, eq(brands.id, products.brandId))
      .where(and(eq(products.status, "published"), isNull(products.deletedAt)))
      .orderBy(asc(products.sortOrder), asc(products.createdAt)),
    db.select().from(productCategories),
    db
      .select({ productId: productImages.productId, image: media })
      .from(productImages)
      .innerJoin(media, eq(media.id, productImages.mediaId))
      .where(inArray(media.mimeType, rasterTypes))
      .orderBy(asc(productImages.position)),
    db
      .select({
        productId: productDocuments.productId,
        title: productDocuments.title,
        key: media.key,
      })
      .from(productDocuments)
      .innerJoin(media, eq(media.id, productDocuments.mediaId))
      .orderBy(asc(productDocuments.position)),
    db
      .select({ page: pages, cover: media })
      .from(pages)
      .leftJoin(media, eq(media.id, pages.coverId))
      .where(eq(pages.status, "published"))
      .orderBy(asc(pages.createdAt)),
    db
      .select({ post: posts, cover: media })
      .from(posts)
      .leftJoin(media, eq(media.id, posts.coverId))
      .where(and(eq(posts.status, "published"), lte(posts.publishedAt, sql`now()`)))
      .orderBy(asc(posts.publishedAt)),
    db
      .select()
      .from(contactPersons)
      .where(eq(contactPersons.isActive, true))
      .orderBy(asc(contactPersons.sortOrder), asc(contactPersons.createdAt)),
  ]);

  const visible = visibleCategoryIds(categoryRows.map((row) => row.category));
  const categoryIdsByProduct = new Map<string, string[]>();
  for (const link of linkRows) {
    categoryIdsByProduct.set(link.productId, [
      ...(categoryIdsByProduct.get(link.productId) ?? []),
      link.categoryId,
    ]);
  }
  const imagesByProduct = new Map<string, CorpusImage[]>();
  for (const row of imageRows) {
    imagesByProduct.set(row.productId, [
      ...(imagesByProduct.get(row.productId) ?? []),
      toImage(row.image),
    ]);
  }
  const documentsByProduct = new Map<
    string,
    { title: (typeof documentRows)[number]["title"]; key: string }[]
  >();
  for (const row of documentRows) {
    documentsByProduct.set(row.productId, [
      ...(documentsByProduct.get(row.productId) ?? []),
      { title: row.title, key: row.key },
    ]);
  }

  return {
    settings: siteSettings,
    settingsUpdatedAt: settingsRows[0] ? iso(settingsRows[0].updatedAt) : null,
    brands: brandRows.map((row) => ({
      name: row.name,
      websiteUrl: row.websiteUrl,
      description: row.description,
    })),
    categories: categoryRows
      .filter((row) => visible.has(row.category.id))
      .map(({ category, image }) => ({
        id: category.id,
        parentId: category.parentId,
        slug: category.slug,
        name: category.name,
        description: category.description,
        seoTitle: category.seoTitle,
        seoDescription: category.seoDescription,
        image: image && rasterTypes.includes(image.mimeType) ? toImage(image) : null,
        updatedAt: iso(category.updatedAt),
      })),
    products: productRows
      .filter(({ product }) => {
        const linked = categoryIdsByProduct.get(product.id);
        return !linked || linked.some((id) => visible.has(id));
      })
      .map(({ product, brandName }) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        sku: product.sku?.trim() || null,
        brand: brandName,
        shortDescription: product.shortDescription,
        description: product.description,
        benefits: product.benefits,
        specs: product.specs,
        categoryIds: (categoryIdsByProduct.get(product.id) ?? []).filter((id) => visible.has(id)),
        images: imagesByProduct.get(product.id) ?? [],
        documents: documentsByProduct.get(product.id) ?? [],
        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
        updatedAt: iso(product.updatedAt),
      })),
    pages: pageRows.map(({ page, cover }) => ({
      id: page.id,
      kind: page.kind,
      slug: page.slug,
      title: page.title,
      content: page.content,
      cover: cover && rasterTypes.includes(cover.mimeType) ? toImage(cover) : null,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      updatedAt: iso(page.updatedAt),
    })),
    posts: postRows.map(({ post, cover }) => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      cover: cover && rasterTypes.includes(cover.mimeType) ? toImage(cover) : null,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      publishedAt: iso(post.publishedAt ?? post.createdAt),
      updatedAt: iso(post.updatedAt),
    })),
    persons: personRows.map((row) => ({
      name: row.name,
      role: row.role,
      phones: row.phones,
      email: row.email,
    })),
  };
}

export async function getCorpus(): Promise<Corpus> {
  "use cache";
  cacheTag(publicTags.catalog, publicTags.content, publicTags.settings);
  cacheLife("hours");
  return queryCorpus();
}

export type EntityInfo = { locales: Locale[]; updatedAt: string | null };

export async function entityInfo(kind: EntityKind, id: string): Promise<EntityInfo> {
  const corpus = await getCorpus();
  const list =
    kind === "product"
      ? corpus.products
      : kind === "category"
        ? corpus.categories
        : kind === "page"
          ? corpus.pages
          : corpus.posts;
  const found = list.find((entity) => entity.id === id);
  return found
    ? { locales: translatedIn(entityTitle(found)), updatedAt: found.updatedAt }
    : { locales: [], updatedAt: null };
}

export async function blogIndexable(locale: Locale): Promise<boolean> {
  return blogLocales(await getCorpus()).includes(locale);
}

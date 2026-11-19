import "server-only";

import { and, asc, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { cacheLife, cacheTag } from "next/cache";

import { publicTags } from "@/lib/cache/tags";
import { pickRichText, type RichTextDoc } from "@/lib/content/rich-text";
import { getDb } from "@/lib/db";
import {
  categories,
  media,
  productCategories,
  productImages,
  productRelations,
  products,
} from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";
import { pickExact, pickLocale, type Localized } from "@/lib/i18n/localized";
import { routes } from "@/lib/routes";

import {
  categoryHref,
  imageColumns,
  productCards,
  visibleProduct,
  type ProductCardItem,
} from "./catalog";
import { splitProductName, toPublicImage, type PublicImage } from "./images";
import { slugMatches, slugRank } from "./slug";

export type ProductSpecRow = { label: string; value: string };

export type ProductModel = { src: string; poster: PublicImage | null };

export type ProductDetail = {
  id: string;
  slug: Localized;
  name: string;
  model: string;
  type: string | null;
  sku: string | null;
  shortDescription: RichTextDoc | null;
  description: RichTextDoc | null;
  specs: ProductSpecRow[];
  images: PublicImage[];
  category: { id: string; name: string; href: string } | null;
  model3d: ProductModel | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export const relatedLimit = 4;

type CategoryRow = {
  id: string;
  parentId: string | null;
  isActive: boolean;
};

export function visibleCategoryIds(rows: CategoryRow[]): Set<string> {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const visible = new Set<string>();
  const check = (row: CategoryRow, seen: Set<string>): boolean => {
    if (!row.isActive || seen.has(row.id)) return false;
    if (!row.parentId) return true;
    const parent = byId.get(row.parentId);
    return parent ? check(parent, new Set(seen).add(row.id)) : false;
  };
  for (const row of rows) if (check(row, new Set())) visible.add(row.id);
  return visible;
}

async function productCategoryRows(productId: string) {
  const [linked, all] = await Promise.all([
    getDb()
      .select({ id: categories.id, slug: categories.slug, name: categories.name })
      .from(productCategories)
      .innerJoin(categories, eq(categories.id, productCategories.categoryId))
      .where(eq(productCategories.productId, productId))
      .orderBy(asc(categories.sortOrder), asc(categories.createdAt)),
    getDb()
      .select({ id: categories.id, parentId: categories.parentId, isActive: categories.isActive })
      .from(categories),
  ]);
  const visible = visibleCategoryIds(all);
  return { linked, visible: linked.filter((row) => visible.has(row.id)) };
}

export async function findProduct(locale: Locale, slug: string): Promise<ProductDetail | null> {
  const poster = alias(media, "poster");
  const modelFile = alias(media, "model_file");
  const [row] = await getDb()
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      sku: products.sku,
      shortDescription: products.shortDescription,
      description: products.description,
      specs: products.specs,
      seoTitle: products.seoTitle,
      seoDescription: products.seoDescription,
      modelKey: modelFile.key,
      poster: {
        key: poster.key,
        width: poster.width,
        height: poster.height,
        alt: poster.alt,
        lqip: poster.lqip,
      },
    })
    .from(products)
    .leftJoin(modelFile, eq(modelFile.id, products.modelId))
    .leftJoin(poster, eq(poster.id, products.modelPosterId))
    .where(and(visibleProduct, slugMatches(products.slug, locale, slug)))
    .orderBy(slugRank(products.slug, locale, slug))
    .limit(1);
  if (!row) return null;

  const [categoryRows, imageRows] = await Promise.all([
    productCategoryRows(row.id),
    getDb()
      .select(imageColumns)
      .from(productImages)
      .innerJoin(media, eq(media.id, productImages.mediaId))
      .where(eq(productImages.productId, row.id))
      .orderBy(asc(productImages.position)),
  ]);
  if (categoryRows.linked.length && !categoryRows.visible.length) return null;

  const name = pickLocale(row.name, locale);
  const { model, type } = splitProductName(name);
  const images = imageRows.flatMap((image) => toPublicImage(image, locale, name) ?? []);
  const [category] = categoryRows.visible;

  return {
    id: row.id,
    slug: row.slug,
    name,
    model,
    type,
    sku: row.sku?.trim() || null,
    shortDescription: pickRichText(row.shortDescription, locale),
    description: pickRichText(row.description, locale),
    specs: row.specs.flatMap((spec) => {
      const label = pickLocale(spec.key, locale).trim();
      const value = pickLocale(spec.value, locale).trim();
      return label && value ? [{ label, value }] : [];
    }),
    images,
    category: category
      ? {
          id: category.id,
          name: pickLocale(category.name, locale),
          href: categoryHref(category.slug, locale),
        }
      : null,
    model3d: row.modelKey
      ? {
          src: routes.media(row.modelKey),
          poster: toPublicImage(row.poster, locale, name) ?? images[0] ?? null,
        }
      : null,
    seoTitle: pickExact(row.seoTitle, locale),
    seoDescription: pickExact(row.seoDescription, locale),
  };
}

export async function getProductBySlug(
  locale: Locale,
  slug: string,
): Promise<ProductDetail | null> {
  "use cache";
  cacheTag(publicTags.catalog);
  cacheLife("hours");
  return findProduct(locale, slug);
}

async function visibleAmong(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const [links, all] = await Promise.all([
    getDb()
      .select({ productId: productCategories.productId, categoryId: productCategories.categoryId })
      .from(productCategories)
      .where(inArray(productCategories.productId, ids)),
    getDb()
      .select({ id: categories.id, parentId: categories.parentId, isActive: categories.isActive })
      .from(categories),
  ]);
  const visible = visibleCategoryIds(all);
  return new Set(
    ids.filter((id) => {
      const own = links.filter((link) => link.productId === id);
      return !own.length || own.some((link) => visible.has(link.categoryId));
    }),
  );
}

const productRow = { id: products.id, slug: products.slug, name: products.name };

export async function findRelatedProducts(
  locale: Locale,
  productId: string,
  categoryId: string | null,
): Promise<ProductCardItem[]> {
  const related = alias(products, "related");
  const linked = await getDb()
    .select({ id: related.id, slug: related.slug, name: related.name })
    .from(productRelations)
    .innerJoin(related, eq(related.id, productRelations.relatedId))
    .where(
      and(
        eq(productRelations.productId, productId),
        eq(related.status, "published"),
        isNull(related.deletedAt),
      ),
    )
    .orderBy(asc(productRelations.position));

  const shown = await visibleAmong(linked.map((row) => row.id));
  let rows = linked.filter((row) => shown.has(row.id));
  if (!rows.length && categoryId) {
    rows = await getDb()
      .select(productRow)
      .from(products)
      .innerJoin(productCategories, eq(productCategories.productId, products.id))
      .where(
        and(
          visibleProduct,
          eq(productCategories.categoryId, categoryId),
          ne(products.id, productId),
        ),
      )
      .orderBy(asc(products.sortOrder), desc(products.publishedAt), asc(products.id))
      .limit(relatedLimit);
  }

  return productCards(rows.slice(0, relatedLimit), locale);
}

export async function getRelatedProducts(
  locale: Locale,
  productId: string,
  categoryId: string | null,
): Promise<ProductCardItem[]> {
  "use cache";
  cacheTag(publicTags.catalog);
  cacheLife("hours");
  return findRelatedProducts(locale, productId, categoryId);
}

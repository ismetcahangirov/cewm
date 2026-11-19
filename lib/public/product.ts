import "server-only";

import { and, asc, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { cacheLife, cacheTag } from "next/cache";

import { publicTags } from "@/lib/cache/tags";
import { pickRichText, type RichTextDoc } from "@/lib/content/rich-text";
import { getDb } from "@/lib/db";
import {
  brands,
  categories,
  media,
  productCategories,
  productDocuments,
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
import { toPublicImage, type PublicImage } from "./images";
import { slugMatches, slugRank } from "./slug";

export type ProductSpecRow = {
  label: string;
  value: string;
  unit: string | null;
  group: string | null;
};

export type ProductSpecGroup = { heading: string | null; rows: ProductSpecRow[] };

export function groupSpecs(rows: ProductSpecRow[]): ProductSpecGroup[] {
  const groups: ProductSpecGroup[] = [];
  for (const row of rows) {
    const last = groups.at(-1);
    if (last && last.heading === row.group) last.rows.push(row);
    else groups.push({ heading: row.group, rows: [row] });
  }
  return groups;
}

export type ProductDocument = { title: string; href: string; size: number };

export type ProductVideo =
  | { kind: "file"; src: string; type: string; poster: PublicImage | null }
  | { kind: "link"; url: string; poster: PublicImage | null };

export type ProductDetail = {
  id: string;
  slug: Localized;
  name: string;
  sku: string | null;
  brand: { name: string; url: string | null } | null;
  shortDescription: RichTextDoc | null;
  description: RichTextDoc | null;
  benefits: string[];
  specs: ProductSpecRow[];
  images: PublicImage[];
  documents: ProductDocument[];
  video: ProductVideo | null;
  category: { id: string; name: string; href: string } | null;
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
  const videoFile = alias(media, "video_file");
  const [row] = await getDb()
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      sku: products.sku,
      shortDescription: products.shortDescription,
      description: products.description,
      benefits: products.benefits,
      specs: products.specs,
      videoUrl: products.videoUrl,
      seoTitle: products.seoTitle,
      seoDescription: products.seoDescription,
      brandName: brands.name,
      brandUrl: brands.websiteUrl,
      videoKey: videoFile.key,
      videoType: videoFile.mimeType,
      poster: {
        key: poster.key,
        width: poster.width,
        height: poster.height,
        alt: poster.alt,
        lqip: poster.lqip,
      },
    })
    .from(products)
    .leftJoin(brands, eq(brands.id, products.brandId))
    .leftJoin(videoFile, eq(videoFile.id, products.videoId))
    .leftJoin(poster, eq(poster.id, products.videoPosterId))
    .where(and(visibleProduct, slugMatches(products.slug, locale, slug)))
    .orderBy(slugRank(products.slug, locale, slug))
    .limit(1);
  if (!row) return null;

  const [categoryRows, imageRows, documentRows] = await Promise.all([
    productCategoryRows(row.id),
    getDb()
      .select(imageColumns)
      .from(productImages)
      .innerJoin(media, eq(media.id, productImages.mediaId))
      .where(eq(productImages.productId, row.id))
      .orderBy(asc(productImages.position)),
    getDb()
      .select({ title: productDocuments.title, key: media.key, size: media.size })
      .from(productDocuments)
      .innerJoin(media, eq(media.id, productDocuments.mediaId))
      .where(eq(productDocuments.productId, row.id))
      .orderBy(asc(productDocuments.position)),
  ]);
  if (categoryRows.linked.length && !categoryRows.visible.length) return null;

  const name = pickLocale(row.name, locale);
  const images = imageRows.flatMap((image) => toPublicImage(image, locale, name) ?? []);
  const [category] = categoryRows.visible;
  const videoPoster = toPublicImage(row.poster, locale, name);

  return {
    id: row.id,
    slug: row.slug,
    name,
    sku: row.sku?.trim() || null,
    brand: row.brandName ? { name: row.brandName, url: row.brandUrl } : null,
    shortDescription: pickRichText(row.shortDescription, locale),
    description: pickRichText(row.description, locale),
    benefits: row.benefits.map((benefit) => pickLocale(benefit, locale).trim()).filter(Boolean),
    specs: row.specs.flatMap((spec) => {
      const label = pickLocale(spec.label, locale).trim();
      const value = pickLocale(spec.value, locale).trim();
      const unit = spec.unit ? pickLocale(spec.unit, locale).trim() || null : null;
      const group = spec.group ? pickLocale(spec.group, locale).trim() || null : null;
      return label && value ? [{ label, value, unit, group }] : [];
    }),
    images,
    documents: documentRows.map((document) => ({
      title: pickLocale(document.title, locale),
      href: routes.media(document.key),
      size: document.size,
    })),
    video:
      row.videoKey && row.videoType
        ? {
            kind: "file",
            src: routes.media(row.videoKey),
            type: row.videoType,
            poster: videoPoster,
          }
        : row.videoUrl
          ? { kind: "link", url: row.videoUrl, poster: videoPoster }
          : null,
    category: category
      ? {
          id: category.id,
          name: pickLocale(category.name, locale),
          href: categoryHref(category.slug, locale),
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

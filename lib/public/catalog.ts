import "server-only";

import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { publicTags } from "@/lib/cache/tags";
import { getDb } from "@/lib/db";
import { categories, media, productCategories, productImages, products } from "@/lib/db/schema";
import { localePath, type Locale } from "@/lib/i18n/config";
import { pickLocale, type Localized } from "@/lib/i18n/localized";
import { routes } from "@/lib/routes";

import { splitProductName, toPublicImage, type PublicImage } from "./images";

export type ProductCardItem = {
  id: string;
  model: string;
  type: string | null;
  category: string | null;
  href: string;
  image: PublicImage | null;
  hoverImage: PublicImage | null;
};

export type PublicCategory = {
  id: string;
  parentId: string | null;
  name: string;
  slug: Localized;
  href: string;
  image: PublicImage | null;
  children: PublicCategory[];
};

export const imageColumns = {
  key: media.key,
  width: media.width,
  height: media.height,
  alt: media.alt,
  lqip: media.lqip,
};

export const visibleProduct = and(eq(products.status, "published"), isNull(products.deletedAt));

export function productHref(slug: Localized, locale: Locale): string {
  return localePath(locale, routes.product(pickLocale(slug, locale)));
}

export function categoryHref(slug: Localized, locale: Locale): string {
  return localePath(locale, routes.category(pickLocale(slug, locale)));
}

export async function productCards(
  rows: { id: string; slug: Localized; name: Localized }[],
  locale: Locale,
): Promise<ProductCardItem[]> {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const [images, categoryRows] = await Promise.all([
    getDb()
      .select({
        productId: productImages.productId,
        position: productImages.position,
        ...imageColumns,
      })
      .from(productImages)
      .innerJoin(media, eq(media.id, productImages.mediaId))
      .where(and(inArray(productImages.productId, ids), sql`${productImages.position} < 2`))
      .orderBy(asc(productImages.position)),
    getDb()
      .select({ productId: productCategories.productId, name: categories.name })
      .from(productCategories)
      .innerJoin(categories, eq(categories.id, productCategories.categoryId))
      .where(and(inArray(productCategories.productId, ids), eq(categories.isActive, true)))
      .orderBy(asc(categories.sortOrder)),
  ]);

  return rows.map((row) => {
    const { model, type } = splitProductName(pickLocale(row.name, locale));
    const own = images.filter((image) => image.productId === row.id);
    const category = categoryRows.find((item) => item.productId === row.id);
    return {
      id: row.id,
      model,
      type,
      category: category ? pickLocale(category.name, locale) : null,
      href: productHref(row.slug, locale),
      image: toPublicImage(own[0], locale, model),
      hoverImage: toPublicImage(own[1], locale, model),
    };
  });
}

export async function getCategoryTree(locale: Locale): Promise<PublicCategory[]> {
  "use cache";
  cacheTag(publicTags.catalog);
  cacheLife("hours");
  const rows = await getDb()
    .select({
      id: categories.id,
      parentId: categories.parentId,
      slug: categories.slug,
      name: categories.name,
      ...imageColumns,
    })
    .from(categories)
    .leftJoin(media, eq(media.id, categories.imageId))
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder), asc(categories.createdAt));

  const nodes = rows.map((row): PublicCategory => {
    const name = pickLocale(row.name, locale);
    return {
      id: row.id,
      parentId: row.parentId,
      name,
      slug: row.slug,
      href: categoryHref(row.slug, locale),
      image: toPublicImage(row, locale, name),
      children: [],
    };
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots: PublicCategory[] = [];
  for (const node of nodes) {
    if (!node.parentId) roots.push(node);
    else byId.get(node.parentId)?.children.push(node);
  }
  return roots;
}

import "server-only";

import { asc, desc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { publicTags } from "@/lib/cache/tags";
import { getDb } from "@/lib/db";
import { brands, productCategories, products } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";
import { pickLocale } from "@/lib/i18n/localized";

import {
  getCategoryTree,
  productCards,
  visibleProduct,
  type ProductCardItem,
  type PublicCategory,
} from "./catalog";
import type { PublicImage } from "./images";
import type { BrandFacet } from "./listing";

export const areaPreviewSize = 8;

export type CatalogueArea = {
  id: string;
  anchor: string;
  name: string;
  href: string;
  image: PublicImage | null;
  total: number;
  items: ProductCardItem[];
};

export type CatalogueOverview = {
  areas: CatalogueArea[];
  other: { total: number; items: ProductCardItem[] } | null;
  total: number;
  brands: BrandFacet[];
  brand: string | null;
};

function subtree(node: PublicCategory): string[] {
  return [node.id, ...node.children.flatMap(subtree)];
}

export async function queryCatalogueOverview(
  locale: Locale,
  brandSlug: string | null,
): Promise<CatalogueOverview> {
  const tree = await getCategoryTree(locale);
  const db = getDb();
  const [rows, links, brandRows] = await Promise.all([
    db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        brandId: products.brandId,
      })
      .from(products)
      .where(visibleProduct)
      .orderBy(
        asc(products.sortOrder),
        sql`${products.publishedAt} desc nulls last`,
        desc(products.createdAt),
        asc(products.id),
      ),
    db
      .select({ productId: productCategories.productId, categoryId: productCategories.categoryId })
      .from(productCategories),
    db
      .select({ id: brands.id, slug: brands.slug, name: brands.name })
      .from(brands)
      .where(eq(brands.isActive, true))
      .orderBy(asc(brands.sortOrder), asc(brands.name)),
  ]);

  const visibleCategories = new Set(tree.flatMap(subtree));
  const linksByProduct = new Map<string, string[]>();
  for (const link of links) {
    linksByProduct.set(link.productId, [
      ...(linksByProduct.get(link.productId) ?? []),
      link.categoryId,
    ]);
  }
  const visible = rows.filter((row) => {
    const own = linksByProduct.get(row.id) ?? [];
    return !own.length || own.some((id) => visibleCategories.has(id));
  });

  const facets = brandRows.flatMap((brand) => {
    const count = visible.filter((row) => row.brandId === brand.id).length;
    return count ? [{ slug: brand.slug, name: brand.name, count }] : [];
  });
  const selected = brandRows.find(
    (brand) => brand.slug === brandSlug && facets.some((facet) => facet.slug === brand.slug),
  );
  const shown = selected ? visible.filter((row) => row.brandId === selected.id) : visible;

  const groups = tree.map((node) => {
    const ids = new Set(subtree(node));
    const members = shown.filter((row) =>
      (linksByProduct.get(row.id) ?? []).some((id) => ids.has(id)),
    );
    return { node, members };
  });
  const loose = shown.filter((row) => !(linksByProduct.get(row.id) ?? []).length);

  const previewRows = [
    ...groups.flatMap((group) => group.members.slice(0, areaPreviewSize)),
    ...loose.slice(0, areaPreviewSize),
  ];
  const unique = [...new Map(previewRows.map((row) => [row.id, row])).values()];
  const cards = new Map((await productCards(unique, locale)).map((card) => [card.id, card]));
  const toCards = (members: typeof shown) =>
    members.slice(0, areaPreviewSize).flatMap((row) => cards.get(row.id) ?? []);

  return {
    areas: groups.map(({ node, members }) => ({
      id: node.id,
      anchor: `area-${pickLocale(node.slug, locale)}`,
      name: node.name,
      href: node.href,
      image: node.image,
      total: members.length,
      items: toCards(members),
    })),
    other: loose.length ? { total: loose.length, items: toCards(loose) } : null,
    total: shown.length,
    brands: facets,
    brand: selected?.slug ?? null,
  };
}

export async function getCatalogueOverview(
  locale: Locale,
  brandSlug: string | null,
): Promise<CatalogueOverview> {
  "use cache";
  cacheTag(publicTags.catalog);
  cacheLife("hours");
  return queryCatalogueOverview(locale, brandSlug);
}

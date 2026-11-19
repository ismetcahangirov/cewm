import "server-only";

import { and, asc, desc, eq, exists, inArray, notExists, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { publicTags } from "@/lib/cache/tags";
import { getDb } from "@/lib/db";
import { categories, productCategories, products } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";
import { pickExact, type Localized } from "@/lib/i18n/localized";
import type { RichTextDoc } from "@/lib/content/rich-text";

import {
  getCategoryTree,
  productCards,
  visibleProduct,
  type ProductCardItem,
  type PublicCategory,
} from "./catalog";
import { slugMatches, slugRank } from "./slug";

export const listingPageSize = 12;
const maxListingPage = 500;

export type ListingChip = { id: string; name: string; href: string; imageSrc: string | null };

export type ListingProducts = {
  items: ProductCardItem[];
  total: number;
  shown: number;
  page: number;
  pageCount: number;
};

export type CatalogueListing = ListingProducts & { categories: PublicCategory[] };

export type CategoryListing = ListingProducts & {
  category: {
    id: string;
    name: string;
    slug: Localized;
    description: Localized<RichTextDoc> | null;
    seoTitle: string | null;
    seoDescription: string | null;
  };
  parent: { name: string; href: string } | null;
  children: PublicCategory[];
  siblings: PublicCategory[];
};

export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  return page >= 1 ? Math.min(page, maxListingPage) : 1;
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / listingPageSize));
}

export function shownCount(page: number, total: number): number {
  return Math.min(total, page * listingPageSize);
}

function visibleCategoryIds(tree: PublicCategory[]): Set<string> {
  const ids = new Set<string>();
  const walk = (nodes: PublicCategory[]) => {
    for (const node of nodes) {
      ids.add(node.id);
      walk(node.children);
    }
  };
  walk(tree);
  return ids;
}

function findNode(nodes: PublicCategory[], id: string): PublicCategory | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

function findParent(nodes: PublicCategory[], id: string): PublicCategory | null {
  for (const node of nodes) {
    if (node.children.some((child) => child.id === id)) return node;
    const found = findParent(node.children, id);
    if (found) return found;
  }
  return null;
}

function subtreeIds(node: PublicCategory): string[] {
  return [node.id, ...node.children.flatMap(subtreeIds)];
}

async function listProducts(
  locale: Locale,
  categoryIds: string[] | null,
  visibleIds: Set<string>,
  page: number,
): Promise<ListingProducts> {
  const inCategories = (ids: string[]) =>
    exists(
      getDb()
        .select({ one: sql`1` })
        .from(productCategories)
        .where(
          and(
            eq(productCategories.productId, products.id),
            inArray(productCategories.categoryId, ids),
          ),
        ),
    );
  const scope = categoryIds
    ? inCategories(categoryIds)
    : or(
        notExists(
          getDb()
            .select({ one: sql`1` })
            .from(productCategories)
            .where(eq(productCategories.productId, products.id)),
        ),
        inCategories([...visibleIds]),
      );
  const where = and(visibleProduct, scope);

  const [countRow] = await getDb()
    .select({ total: sql<number>`count(*)::int` })
    .from(products)
    .where(where);
  const total = countRow?.total ?? 0;
  const shown = shownCount(page, total);
  const rows = await getDb()
    .select({ id: products.id, slug: products.slug, name: products.name })
    .from(products)
    .where(where)
    .orderBy(
      asc(products.sortOrder),
      sql`${products.publishedAt} desc nulls last`,
      desc(products.createdAt),
      asc(products.id),
    )
    .limit(shown);
  return {
    items: await productCards(rows, locale),
    total,
    shown,
    page,
    pageCount: pageCount(total),
  };
}

export async function queryCatalogueListing(
  locale: Locale,
  page: number,
): Promise<CatalogueListing> {
  const tree = await getCategoryTree(locale);
  const listing = await listProducts(locale, null, visibleCategoryIds(tree), page);
  return { ...listing, categories: tree };
}

export async function queryCategoryListing(
  locale: Locale,
  slug: string,
  page: number,
): Promise<CategoryListing | null> {
  const tree = await getCategoryTree(locale);
  const [row] = await getDb()
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      seoTitle: categories.seoTitle,
      seoDescription: categories.seoDescription,
    })
    .from(categories)
    .where(and(eq(categories.isActive, true), slugMatches(categories.slug, locale, slug)))
    .orderBy(slugRank(categories.slug, locale, slug))
    .limit(1);
  if (!row) return null;
  const node = findNode(tree, row.id);
  if (!node) return null;
  const parent = findParent(tree, row.id);
  const listing = await listProducts(locale, subtreeIds(node), visibleCategoryIds(tree), page);
  return {
    ...listing,
    category: {
      id: row.id,
      name: node.name,
      slug: row.slug,
      description: row.description,
      seoTitle: pickExact(row.seoTitle, locale),
      seoDescription: pickExact(row.seoDescription, locale),
    },
    parent: parent ? { name: parent.name, href: parent.href } : null,
    children: node.children,
    siblings: parent ? parent.children : tree,
  };
}

export async function getCatalogueListing(
  locale: Locale,
  page: number,
): Promise<CatalogueListing | null> {
  "use cache";
  cacheTag(publicTags.catalog);
  cacheLife("hours");
  const listing = await queryCatalogueListing(locale, page);
  return page > listing.pageCount ? null : listing;
}

export async function getCategoryListing(
  locale: Locale,
  slug: string,
  page: number,
): Promise<CategoryListing | null> {
  "use cache";
  cacheTag(publicTags.catalog);
  cacheLife("hours");
  const listing = await queryCategoryListing(locale, slug, page);
  return listing && page > listing.pageCount ? null : listing;
}

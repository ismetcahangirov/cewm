import "dotenv/config";

import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { getDb } from "@/lib/db";
import { categories, productCategories, products } from "@/lib/db/schema";
import {
  listingPageSize,
  pageCount,
  parsePageParam,
  queryCatalogueListing,
  queryCategoryListing,
  shownCount,
} from "@/lib/public/listing";

import { testRun } from "./support/admin";

vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

const { run } = testRun();
const createdProducts: string[] = [];
const createdCategories: string[] = [];

const ids: Record<string, string> = {};

function slug(name: string) {
  return { az: `${run}-${name}`, ru: `${run}-${name}-ru`, en: `${run}-${name}-en` };
}

async function category(
  key: string,
  values: { parentId?: string; isActive?: boolean; sortOrder?: number } = {},
) {
  const [row] = await getDb()
    .insert(categories)
    .values({
      slug: slug(key),
      name: { az: `Kat ${key}`, ru: `Кат ${key}`, en: `Cat ${key}` },
      parentId: values.parentId,
      isActive: values.isActive ?? true,
      sortOrder: values.sortOrder ?? -1000,
    })
    .returning({ id: categories.id });
  ids[key] = row.id;
  createdCategories.push(row.id);
}

async function product(
  key: string,
  categoryKeys: string[],
  values: {
    status?: "draft" | "published";
    deletedAt?: Date;
    sortOrder?: number;
    publishedAt?: Date;
  } = {},
) {
  const [row] = await getDb()
    .insert(products)
    .values({
      slug: slug(`p-${key}`),
      name: { az: `M-${key} - Tip`, ru: `М-${key} - Тип`, en: `M-${key} - Type` },
      status: values.status ?? "published",
      deletedAt: values.deletedAt,
      sortOrder: values.sortOrder ?? -1000,
      publishedAt: values.publishedAt ?? new Date("2026-01-01"),
    })
    .returning({ id: products.id });
  ids[`p-${key}`] = row.id;
  createdProducts.push(row.id);
  if (categoryKeys.length) {
    await getDb()
      .insert(productCategories)
      .values(
        categoryKeys.map((categoryKey) => ({ productId: row.id, categoryId: ids[categoryKey] })),
      );
  }
}

function keys(items: { href: string }[]): string[] {
  return items.map((item) => item.href.split(`${run}-p-`)[1]?.replace("/", "")).filter(Boolean);
}

beforeAll(async () => {
  await category("root");
  await category("child", { parentId: ids.root, sortOrder: -1000 });
  await category("child2", { parentId: ids.root, sortOrder: -999 });
  await category("hidden", { isActive: false });
  await category("under-hidden", { parentId: ids.hidden });
  await category("hidden-child", { parentId: ids.root, isActive: false });

  await product("root-own", ["root"], { sortOrder: -990 });
  await product("child-own", ["child"], { sortOrder: -995 });
  await product("both", ["root", "child"], { sortOrder: -994 });
  await product("draft", ["child"], { status: "draft" });
  await product("trashed", ["child"], { deletedAt: new Date() });
  await product("in-hidden", ["hidden"]);
  await product("in-hidden-child", ["hidden-child"]);
  await product("under-hidden", ["under-hidden"]);
  await product("hidden-and-root", ["hidden", "child2"], { sortOrder: -993 });
  await product("no-category", [], { sortOrder: -992 });
  await product("older", ["child2"], {
    sortOrder: -991,
    publishedAt: new Date("2025-01-01"),
  });
  await product("newer", ["child2"], {
    sortOrder: -991,
    publishedAt: new Date("2026-06-01"),
  });
});

afterAll(async () => {
  if (createdProducts.length) {
    await getDb().delete(products).where(inArray(products.id, createdProducts));
  }
  if (createdCategories.length) {
    await getDb()
      .delete(categories)
      .where(inArray(categories.id, [...createdCategories].reverse()));
  }
});

describe("pagination arithmetic", () => {
  it("counts pages and shown products", () => {
    expect(listingPageSize).toBe(12);
    expect(pageCount(0)).toBe(1);
    expect(pageCount(12)).toBe(1);
    expect(pageCount(13)).toBe(2);
    expect(pageCount(35)).toBe(3);
    expect(shownCount(1, 35)).toBe(12);
    expect(shownCount(3, 35)).toBe(35);
    expect(shownCount(1, 5)).toBe(5);
    expect(shownCount(1, 0)).toBe(0);
  });

  it("parses the page parameter", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("3")).toBe(3);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-2")).toBe(1);
    expect(parsePageParam("1.5")).toBe(1);
    expect(parsePageParam(["2", "3"])).toBe(2);
    expect(parsePageParam("999999")).toBe(500);
  });
});

describe("category listing", () => {
  it("includes products of the category and its active subcategories once", async () => {
    const listing = await queryCategoryListing("az", `${run}-root`, 1);
    expect(listing).not.toBeNull();
    expect(new Set(keys(listing!.items))).toEqual(
      new Set(["root-own", "child-own", "both", "hidden-and-root", "older", "newer"]),
    );
    expect(keys(listing!.items)).toHaveLength(6);
    expect(listing!.total).toBe(6);
    expect(listing!.children.map((child) => child.id)).toEqual([ids.child, ids.child2]);
  });

  it("lists only own products for a leaf category and links back to the parent", async () => {
    const listing = await queryCategoryListing("az", `${run}-child`, 1);
    expect(new Set(keys(listing!.items))).toEqual(new Set(["child-own", "both"]));
    expect(listing!.parent?.name).toBe("Kat root");
    expect(listing!.children).toEqual([]);
  });

  it("excludes drafts, trashed products and hidden categories' products", async () => {
    const root = await queryCategoryListing("az", `${run}-root`, 1);
    const found = keys(root!.items);
    for (const excluded of ["draft", "trashed", "in-hidden", "in-hidden-child", "under-hidden"]) {
      expect(found).not.toContain(excluded);
    }
  });

  it("answers null for hidden categories, children of hidden parents and unknown slugs", async () => {
    expect(await queryCategoryListing("az", `${run}-hidden`, 1)).toBeNull();
    expect(await queryCategoryListing("az", `${run}-hidden-child`, 1)).toBeNull();
    expect(await queryCategoryListing("az", `${run}-under-hidden`, 1)).toBeNull();
    expect(await queryCategoryListing("az", `${run}-missing`, 1)).toBeNull();
  });

  it("orders by sort order, then newest first", async () => {
    const listing = await queryCategoryListing("az", `${run}-root`, 1);
    expect(keys(listing!.items)).toEqual([
      "child-own",
      "both",
      "hidden-and-root",
      "newer",
      "older",
      "root-own",
    ]);
  });

  it("finds a category by its slug in another locale and by the az slug", async () => {
    const ru = await queryCategoryListing("ru", `${run}-child-ru`, 1);
    expect(ru?.category.id).toBe(ids.child);
    expect(ru?.category.name).toBe("Кат child");
    const fallback = await queryCategoryListing("en", `${run}-child`, 1);
    expect(fallback?.category.id).toBe(ids.child);
    expect(fallback?.category.slug.en).toBe(`${run}-child-en`);
  });
});

describe("catalogue overview", () => {
  it("lists published products of visible categories in admin order", async () => {
    const listing = await queryCatalogueListing("az", 1);
    const found = keys(listing.items);
    expect(found.slice(0, 7)).toEqual([
      "child-own",
      "both",
      "hidden-and-root",
      "no-category",
      "newer",
      "older",
      "root-own",
    ]);
    for (const excluded of ["draft", "trashed", "in-hidden", "in-hidden-child", "under-hidden"]) {
      expect(found).not.toContain(excluded);
    }
    expect(listing.categories.map((item) => item.id)).toContain(ids.root);
    expect(listing.categories.map((item) => item.id)).not.toContain(ids.hidden);
  });

  it("grows by one page of products per page number", async () => {
    const first = await queryCatalogueListing("az", 1);
    const second = await queryCatalogueListing("az", 2);
    expect(first.shown).toBe(Math.min(first.total, 12));
    expect(second.shown).toBe(Math.min(second.total, 24));
    expect(second.items.slice(0, first.items.length).map((item) => item.href)).toEqual(
      first.items.map((item) => item.href),
    );
  });
});

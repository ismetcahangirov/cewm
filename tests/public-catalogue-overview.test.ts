import "dotenv/config";

import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { embedUrl } from "@/components/site/product/product-video";
import { richTextHeadings } from "@/components/site/rich-text";
import { getDb } from "@/lib/db";
import { brands, categories, productCategories, products } from "@/lib/db/schema";
import { queryCatalogueOverview } from "@/lib/public/catalogue-overview";
import { parseBrandParam, queryCategoryListing } from "@/lib/public/listing";

import { testRun } from "./support/admin";

vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

const { run } = testRun();
const ids: Record<string, string> = {};
const created = { products: [] as string[], categories: [] as string[], brands: [] as string[] };

async function brand(key: string) {
  const [row] = await getDb()
    .insert(brands)
    .values({ name: `Brand ${run} ${key}`, slug: `${run}-${key}`, sortOrder: -1000 })
    .returning({ id: brands.id });
  ids[key] = row.id;
  created.brands.push(row.id);
}

async function category(key: string, parentId?: string) {
  const [row] = await getDb()
    .insert(categories)
    .values({
      slug: { az: `${run}-${key}` },
      name: { az: `Sahə ${key}`, en: `Area ${key}` },
      parentId,
      sortOrder: -1000,
    })
    .returning({ id: categories.id });
  ids[key] = row.id;
  created.categories.push(row.id);
}

async function product(
  key: string,
  brandKey: string,
  categoryKeys: string[],
  status: "draft" | "published" = "published",
) {
  const [row] = await getDb()
    .insert(products)
    .values({
      slug: { az: `${run}-p-${key}` },
      name: { az: `Maşın ${key}`, en: `Machine ${key}` },
      brandId: ids[brandKey],
      status,
      sortOrder: -1000,
      publishedAt: new Date("2026-01-01"),
    })
    .returning({ id: products.id });
  ids[`p-${key}`] = row.id;
  created.products.push(row.id);
  if (categoryKeys.length) {
    await getDb()
      .insert(productCategories)
      .values(
        categoryKeys.map((categoryKey) => ({ productId: row.id, categoryId: ids[categoryKey] })),
      );
  }
}

function own(items: { href: string }[]): string[] {
  return items
    .map((item) => item.href.split(`${run}-p-`)[1])
    .filter((value): value is string => Boolean(value))
    .sort();
}

beforeAll(async () => {
  await brand("one");
  await brand("two");
  await category("root");
  await category("child", ids.root);
  await product("a", "one", ["child"]);
  await product("b", "two", ["root"]);
  await product("c", "one", []);
  await product("d", "one", ["root"], "draft");
});

afterAll(async () => {
  await getDb().delete(products).where(inArray(products.id, created.products));
  await getDb().delete(categories).where(inArray(categories.id, created.categories.reverse()));
  await getDb().delete(brands).where(inArray(brands.id, created.brands));
});

describe("catalogue overview", () => {
  it("groups published products under their top-level area and lists loose products apart", async () => {
    const overview = await queryCatalogueOverview("az", null);
    const area = overview.areas.find((item) => item.id === ids.root);
    expect(area?.anchor).toBe(`area-${run}-root`);
    expect(own(area?.items ?? [])).toEqual(["a", "b"]);
    expect(own(overview.other?.items ?? [])).toContain("c");
    expect(overview.brand).toBeNull();
  });

  it("counts products per brand and filters by a known brand slug", async () => {
    const overview = await queryCatalogueOverview("az", `${run}-one`);
    expect(overview.brand).toBe(`${run}-one`);
    expect(overview.brands.find((facet) => facet.slug === `${run}-one`)?.count).toBe(2);
    expect(overview.brands.find((facet) => facet.slug === `${run}-two`)?.count).toBe(1);
    const area = overview.areas.find((item) => item.id === ids.root);
    expect(own(area?.items ?? [])).toEqual(["a"]);
  });

  it("ignores an unknown brand slug", async () => {
    const overview = await queryCatalogueOverview("az", `${run}-missing`);
    expect(overview.brand).toBeNull();
  });
});

describe("category listing by brand", () => {
  it("offers a brand facet and narrows the listing to the chosen brand", async () => {
    const all = await queryCategoryListing("az", `${run}-root`, 1);
    expect(all?.brands.map((facet) => [facet.slug, facet.count])).toEqual([
      [`${run}-one`, 1],
      [`${run}-two`, 1],
    ]);
    const filtered = await queryCategoryListing("az", `${run}-root`, 1, `${run}-two`);
    expect(filtered?.brand).toBe(`${run}-two`);
    expect(own(filtered?.items ?? [])).toEqual(["b"]);
  });
});

describe("helpers", () => {
  it("accepts only slug-shaped brand parameters", () => {
    expect(parseBrandParam("homag")).toBe("homag");
    expect(parseBrandParam(["leuco", "x"])).toBe("leuco");
    expect(parseBrandParam("Bad Slug")).toBeNull();
    expect(parseBrandParam(undefined)).toBeNull();
  });

  it("lists second-level headings of a rich text with stable ids", () => {
    const headings = richTextHeadings({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Intro" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "First" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Sub" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Second" }] },
      ],
    });
    expect(headings).toEqual([
      { id: "section-1", text: "First" },
      { id: "section-3", text: "Second" },
    ]);
  });

  it("turns YouTube and Vimeo links into privacy-friendly embeds", () => {
    expect(embedUrl("https://www.youtube.com/watch?v=abc123")).toBe(
      "https://www.youtube-nocookie.com/embed/abc123?autoplay=1&rel=0",
    );
    expect(embedUrl("https://youtu.be/abc123")).toContain("/embed/abc123");
    expect(embedUrl("https://vimeo.com/12345")).toBe(
      "https://player.vimeo.com/video/12345?autoplay=1&dnt=1",
    );
    expect(embedUrl("https://example.com/video")).toBeNull();
    expect(embedUrl("not a url")).toBeNull();
  });
});

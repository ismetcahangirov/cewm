import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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
import type { Localized } from "@/lib/i18n/localized";
import { getProductBySlug, getRelatedProducts, visibleCategoryIds } from "@/lib/public/product";
import { summarize } from "@/lib/content/rich-text";

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));

const run = randomUUID().slice(0, 8);
const created = {
  media: new Set<string>(),
  categories: new Set<string>(),
  products: new Set<string>(),
  brands: new Set<string>(),
};

const slug = (name: string) => `${name.toLowerCase()}-${run}`;

async function addMedia(name: string, width = 800, height = 600): Promise<string> {
  const [row] = await getDb()
    .insert(media)
    .values({
      key: `test/${run}/${name}`,
      mimeType: name.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
      width: name.endsWith(".pdf") ? null : width,
      height: name.endsWith(".pdf") ? null : height,
      size: 1000,
      sha256: randomUUID(),
      alt: { az: `${name} az`, en: `${name} en` },
    })
    .returning({ id: media.id });
  created.media.add(row.id);
  return row.id;
}

async function addCategory(
  name: string,
  values: { parentId?: string; isActive?: boolean; sortOrder?: number } = {},
): Promise<string> {
  const [row] = await getDb()
    .insert(categories)
    .values({ slug: { az: slug(name) }, name: { az: name }, ...values })
    .returning({ id: categories.id });
  created.categories.add(row.id);
  return row.id;
}

async function addProduct(
  name: string,
  values: {
    slug?: Localized;
    status?: "draft" | "published";
    deletedAt?: Date;
    categoryIds?: string[];
    imageIds?: { id: string; position: number }[];
    sortOrder?: number;
    brandId?: string;
    videoUrl?: string;
    benefits?: Localized[];
    specs?: { label: Localized; value: Localized; unit: Localized | null }[];
  } = {},
): Promise<string> {
  const [row] = await getDb()
    .insert(products)
    .values({
      slug: values.slug ?? { az: slug(name) },
      name: { az: `${name} – Test məhsulu`, ru: `${name} – Тестовый товар` },
      status: values.status ?? "published",
      publishedAt: new Date(),
      deletedAt: values.deletedAt,
      sortOrder: values.sortOrder ?? 0,
      brandId: values.brandId,
      videoUrl: values.videoUrl,
      benefits: values.benefits ?? [],
      specs: values.specs ?? [],
    })
    .returning({ id: products.id });
  created.products.add(row.id);
  if (values.categoryIds?.length) {
    await getDb()
      .insert(productCategories)
      .values(values.categoryIds.map((categoryId) => ({ productId: row.id, categoryId })));
  }
  if (values.imageIds?.length) {
    await getDb()
      .insert(productImages)
      .values(
        values.imageIds.map((image) => ({
          productId: row.id,
          mediaId: image.id,
          position: image.position,
        })),
      );
  }
  return row.id;
}

afterAll(async () => {
  const db = getDb();
  if (created.products.size)
    await db.delete(products).where(inArray(products.id, [...created.products]));
  if (created.categories.size) {
    const ids = [...created.categories];
    await db.delete(categories).where(inArray(categories.parentId, ids));
    await db.delete(categories).where(inArray(categories.id, ids));
  }
  if (created.brands.size) await db.delete(brands).where(inArray(brands.id, [...created.brands]));
  if (created.media.size) await db.delete(media).where(inArray(media.id, [...created.media]));
});

describe("product detail reader", () => {
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    ids.active = await addCategory("aktiv", { sortOrder: 1 });
    ids.second = await addCategory("ikinci", { sortOrder: 0 });
    ids.inactive = await addCategory("gizli", { isActive: false });
    ids.child = await addCategory("gizli-alt", { parentId: ids.inactive });
    ids.cover = await addMedia("cover.jpg");
    ids.hover = await addMedia("hover.jpg");
    ids.third = await addMedia("third.jpg");
    ids.brochure = await addMedia("brochure.pdf");
    const [brand] = await getDb()
      .insert(brands)
      .values({ name: `Brand ${run}`, slug: `brand-${run}`, websiteUrl: "https://example.com" })
      .returning({ id: brands.id });
    ids.brand = brand?.id ?? "";
    created.brands.add(ids.brand);

    ids.main = await addProduct("Main", {
      slug: { az: slug("main"), ru: slug("main-ru") },
      categoryIds: [ids.active],
      imageIds: [
        { id: ids.third, position: 2 },
        { id: ids.cover, position: 0 },
        { id: ids.hover, position: 1 },
      ],
      brandId: ids.brand,
      benefits: [{ az: "Sürətli", de: "Schnell" }, { az: " " }],
      specs: [
        { label: { az: "En", ru: "Ширина" }, value: { az: "1200" }, unit: { az: "mm", ru: "мм" } },
        { label: { az: "" }, value: { az: "boş" }, unit: null },
      ],
    });
    await getDb()
      .insert(productDocuments)
      .values({
        productId: ids.main,
        mediaId: ids.brochure,
        title: { az: "Broşür", de: "Broschüre" },
        position: 0,
      });
    ids.draft = await addProduct("Draft", { status: "draft", categoryIds: [ids.active] });
    ids.trashed = await addProduct("Trashed", {
      deletedAt: new Date(),
      categoryIds: [ids.active],
    });
    ids.hidden = await addProduct("Hidden", { categoryIds: [ids.inactive] });
    ids.hiddenChild = await addProduct("HiddenChild", { categoryIds: [ids.child] });
    ids.mixed = await addProduct("Mixed", { categoryIds: [ids.inactive, ids.second] });
    ids.loose = await addProduct("Loose", {
      videoUrl: "https://www.youtube.com/watch?v=example",
      imageIds: [{ id: ids.hover, position: 0 }],
    });
    for (let index = 0; index < 5; index += 1) {
      ids[`sibling${index}`] = await addProduct(`Sibling${index}`, {
        categoryIds: [ids.active],
        sortOrder: index,
      });
    }
  });

  it("finds a published product and maps its fields", async () => {
    const product = await getProductBySlug("az", slug("main"));
    expect(product).toMatchObject({
      id: ids.main,
      name: "Main – Test məhsulu",
      brand: { name: `Brand ${run}`, url: "https://example.com" },
      category: { id: ids.active, name: "aktiv" },
      benefits: ["Sürətli"],
      specs: [{ label: "En", value: "1200", unit: "mm" }],
      documents: [{ title: "Broşür", href: `/media/test/${run}/brochure.pdf`, size: 1000 }],
      video: null,
    });
    const german = await getProductBySlug("de", slug("main"));
    expect(german?.benefits).toEqual(["Schnell"]);
    expect(german?.documents[0]?.title).toBe("Broschüre");
    expect(product?.category?.href).toBe(`/mehsullar/${slug("aktiv")}`);
  });

  it("orders the gallery by position", async () => {
    const product = await getProductBySlug("az", slug("main"));
    expect(product?.images.map((image) => image.src)).toEqual([
      `/media/test/${run}/cover.jpg`,
      `/media/test/${run}/hover.jpg`,
      `/media/test/${run}/third.jpg`,
    ]);
    expect(product?.images[0].alt).toBe("cover.jpg az");
  });

  it("hides drafts, trashed products and products only in hidden categories", async () => {
    expect(await getProductBySlug("az", slug("draft"))).toBeNull();
    expect(await getProductBySlug("az", slug("trashed"))).toBeNull();
    expect(await getProductBySlug("az", slug("hidden"))).toBeNull();
    expect(await getProductBySlug("az", slug("hiddenchild"))).toBeNull();
    expect(await getProductBySlug("az", slug("nope"))).toBeNull();
  });

  it("keeps a product that is also in a visible category, and one without categories", async () => {
    const mixed = await getProductBySlug("az", slug("mixed"));
    expect(mixed?.category).toMatchObject({ id: ids.second, name: "ikinci" });
    const loose = await getProductBySlug("az", slug("loose"));
    expect(loose?.category).toBeNull();
  });

  it("looks slugs up per locale with the az slug as a fallback", async () => {
    const ru = await getProductBySlug("ru", slug("main-ru"));
    expect(ru?.id).toBe(ids.main);
    expect(ru?.name).toBe("Main – Тестовый товар");
    expect(ru?.specs[0]).toEqual({ label: "Ширина", value: "1200", unit: "мм" });
    const legacy = await getProductBySlug("ru", slug("main"));
    expect(legacy?.slug.ru).toBe(slug("main-ru"));
    expect(await getProductBySlug("en", slug("main"))).not.toBeNull();
    expect(await getProductBySlug("az", slug("main-ru"))).toBeNull();
  });

  it("exposes an external video link", async () => {
    const product = await getProductBySlug("az", slug("loose"));
    expect(product?.video).toEqual({
      kind: "link",
      url: "https://www.youtube.com/watch?v=example",
      poster: null,
    });
  });

  it("falls back to products from the same category", async () => {
    const related = await getRelatedProducts("az", ids.main, ids.active);
    expect(related.map((item) => item.id)).toEqual([
      ids.sibling0,
      ids.sibling1,
      ids.sibling2,
      ids.sibling3,
    ]);
    expect(related.map((item) => item.id)).not.toContain(ids.draft);
    expect(related.map((item) => item.id)).not.toContain(ids.trashed);
  });

  it("uses curated relations in their order and skips hidden ones", async () => {
    await getDb()
      .insert(productRelations)
      .values([
        { productId: ids.main, relatedId: ids.loose, position: 2 },
        { productId: ids.main, relatedId: ids.draft, position: 0 },
        { productId: ids.main, relatedId: ids.hidden, position: 1 },
        { productId: ids.main, relatedId: ids.mixed, position: 3 },
        { productId: ids.main, relatedId: ids.sibling4, position: 1 },
      ]);
    const related = await getRelatedProducts("az", ids.main, ids.active);
    expect(related.map((item) => item.id)).toEqual([ids.sibling4, ids.loose, ids.mixed]);
  });

  it("computes visible categories through every ancestor", () => {
    const visible = visibleCategoryIds([
      { id: "a", parentId: null, isActive: true },
      { id: "b", parentId: "a", isActive: true },
      { id: "c", parentId: "b", isActive: true },
      { id: "d", parentId: null, isActive: false },
      { id: "e", parentId: "d", isActive: true },
      { id: "f", parentId: "e", isActive: true },
      { id: "g", parentId: "missing", isActive: true },
    ]);
    expect([...visible].sort()).toEqual(["a", "b", "c"]);
  });

  it("summarizes long text at a word boundary", () => {
    expect(summarize("Qısa mətn")).toBe("Qısa mətn");
    const long = "söz ".repeat(60);
    const result = summarize(long, 40);
    expect(result.length).toBeLessThanOrEqual(40);
    expect(result.endsWith("söz…")).toBe(true);
  });
});

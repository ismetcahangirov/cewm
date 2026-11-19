import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { storyRows } from "@/components/site/project/story-rows";
import { getDb } from "@/lib/db";
import {
  categories,
  media,
  productCategories,
  productImages,
  productRelations,
  products,
  projectImages,
  projects,
} from "@/lib/db/schema";
import type { Localized } from "@/lib/i18n/localized";
import { getProductBySlug, getRelatedProducts, visibleCategoryIds } from "@/lib/public/product";
import { getProjectBySlug, type ProjectPhoto } from "@/lib/public/project";
import { summarize } from "@/lib/content/rich-text";

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));

const run = randomUUID().slice(0, 8);
const created = {
  media: new Set<string>(),
  categories: new Set<string>(),
  products: new Set<string>(),
  projects: new Set<string>(),
};

const slug = (name: string) => `${name.toLowerCase()}-${run}`;

async function addMedia(name: string, width = 800, height = 600): Promise<string> {
  const [row] = await getDb()
    .insert(media)
    .values({
      key: `test/${run}/${name}`,
      mimeType: name.endsWith(".glb") ? "model/gltf-binary" : "image/jpeg",
      width: name.endsWith(".glb") ? null : width,
      height: name.endsWith(".glb") ? null : height,
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
    modelId?: string;
    specs?: { key: Localized; value: Localized }[];
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
      modelId: values.modelId,
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

async function addProject(
  name: string,
  values: {
    status?: "draft" | "published";
    sortOrder: number;
    coverId?: string;
    body?: string;
    images?: { id: string; position: number; caption?: Localized }[];
  },
): Promise<string> {
  const [row] = await getDb()
    .insert(projects)
    .values({
      slug: { az: slug(name), en: slug(`${name}-en`) },
      title: { az: name, en: `${name} EN` },
      excerpt: { az: `${name} haqqında` },
      clientName: `${name} MMC`,
      status: values.status ?? "published",
      sortOrder: values.sortOrder,
      coverId: values.coverId,
      body: values.body
        ? {
            az: {
              type: "doc",
              content: [{ type: "paragraph", content: [{ type: "text", text: values.body }] }],
            },
          }
        : null,
    })
    .returning({ id: projects.id });
  created.projects.add(row.id);
  if (values.images?.length) {
    await getDb()
      .insert(projectImages)
      .values(
        values.images.map((image) => ({
          projectId: row.id,
          mediaId: image.id,
          position: image.position,
          caption: image.caption,
        })),
      );
  }
  return row.id;
}

afterAll(async () => {
  const db = getDb();
  if (created.projects.size)
    await db.delete(projects).where(inArray(projects.id, [...created.projects]));
  if (created.products.size)
    await db.delete(products).where(inArray(products.id, [...created.products]));
  if (created.categories.size) {
    const ids = [...created.categories];
    await db.delete(categories).where(inArray(categories.parentId, ids));
    await db.delete(categories).where(inArray(categories.id, ids));
  }
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
    ids.model = await addMedia("chair.glb");

    ids.main = await addProduct("Main", {
      slug: { az: slug("main"), ru: slug("main-ru") },
      categoryIds: [ids.active],
      imageIds: [
        { id: ids.third, position: 2 },
        { id: ids.cover, position: 0 },
        { id: ids.hover, position: 1 },
      ],
      specs: [
        { key: { az: "En", ru: "Ширина" }, value: { az: "120 sm" } },
        { key: { az: "" }, value: { az: "boş" } },
      ],
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
      modelId: ids.model,
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
      model: "Main",
      type: "Test məhsulu",
      category: { id: ids.active, name: "aktiv" },
      specs: [{ label: "En", value: "120 sm" }],
      model3d: null,
    });
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
    expect(ru?.specs[0]).toEqual({ label: "Ширина", value: "120 sm" });
    const legacy = await getProductBySlug("ru", slug("main"));
    expect(legacy?.slug.ru).toBe(slug("main-ru"));
    expect(await getProductBySlug("en", slug("main"))).not.toBeNull();
    expect(await getProductBySlug("az", slug("main-ru"))).toBeNull();
  });

  it("exposes the 3D model with the first photo as the poster", async () => {
    const product = await getProductBySlug("az", slug("loose"));
    expect(product?.model3d).toEqual({
      src: `/media/test/${run}/chair.glb`,
      poster: expect.objectContaining({ src: `/media/test/${run}/hover.jpg` }),
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

describe("project detail reader", () => {
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    ids.one = await addMedia("p1.jpg", 742, 400);
    ids.two = await addMedia("p2.jpg", 742, 400);
    ids.three = await addMedia("p3.jpg", 742, 400);
    ids.cover = await addMedia("p-cover.jpg", 742, 400);
    ids.first = await addProject("Birinci", { sortOrder: 900001, body: "Birinci haqqında" });
    ids.middle = await addProject("Orta", {
      sortOrder: 900002,
      images: [
        { id: ids.three, position: 2, caption: { az: "Üçüncü", en: "Third" } },
        { id: ids.one, position: 0, caption: { az: "Birinci şəkil" } },
        { id: ids.two, position: 1 },
      ],
    });
    ids.hidden = await addProject("Qaralama", { sortOrder: 900003, status: "draft" });
    ids.last = await addProject("Sonuncu", {
      sortOrder: 900004,
      coverId: ids.cover,
      body: "Layihənin təfərrüatları",
      images: [
        { id: ids.one, position: 0 },
        { id: ids.cover, position: 1 },
      ],
    });
  });

  it("hides unpublished projects", async () => {
    expect(await getProjectBySlug("az", slug("Qaralama"))).toBeNull();
    expect(await getProjectBySlug("az", slug("yoxdur"))).toBeNull();
  });

  it("uses the first image as the cover and keeps the rest in order with captions", async () => {
    const project = await getProjectBySlug("en", slug("Orta-en"));
    expect(project?.title).toBe("Orta EN");
    expect(project?.cover?.src).toBe(`/media/test/${run}/p1.jpg`);
    expect(project?.photos.map((photo) => [photo.src, photo.caption])).toEqual([
      [`/media/test/${run}/p2.jpg`, null],
      [`/media/test/${run}/p3.jpg`, "Third"],
    ]);
    const az = await getProjectBySlug("az", slug("Orta"));
    expect(az?.photos[1].caption).toBe("Üçüncü");
  });

  it("uses cover_id when set and leaves it out of the photo story", async () => {
    const project = await getProjectBySlug("az", slug("Sonuncu"));
    expect(project?.cover?.src).toBe(`/media/test/${run}/p-cover.jpg`);
    expect(project?.photos.map((photo) => photo.src)).toEqual([`/media/test/${run}/p1.jpg`]);
  });

  it("drops a body that only repeats the excerpt", async () => {
    expect((await getProjectBySlug("az", slug("Birinci")))?.body).toBeNull();
    const last = await getProjectBySlug("az", slug("Sonuncu"));
    expect(last?.excerpt).toBe("Sonuncu haqqında");
    expect(last?.body?.content?.[0]?.content?.[0]?.text).toBe("Layihənin təfərrüatları");
  });

  it("links the previous and next published project by sort order", async () => {
    const middle = await getProjectBySlug("az", slug("Orta"));
    expect(middle?.previous).toEqual({ title: "Birinci", href: `/layiheler/${slug("Birinci")}` });
    expect(middle?.next).toEqual({ title: "Sonuncu", href: `/layiheler/${slug("Sonuncu")}` });
    const last = await getProjectBySlug("en", slug("Sonuncu-en"));
    expect(last?.previous).toEqual({ title: "Orta EN", href: `/en/layiheler/${slug("Orta-en")}` });
    expect(last?.next).toBeNull();
  });

  it("lays the photo story out as alternating singles and pairs", () => {
    const photos = Array.from({ length: 6 }, (_, index): ProjectPhoto => ({
      id: String(index),
      src: `/media/${index}.jpg`,
      width: 742,
      height: 400,
      alt: "",
      blurDataURL: null,
      caption: null,
    }));
    expect(
      storyRows(photos).map((row) => [row.kind, row.shift, row.photos.map((item) => item.index)]),
    ).toEqual([
      ["single", false, [0]],
      ["pair", false, [1, 2]],
      ["single", true, [3]],
      ["pair", false, [4, 5]],
    ]);
    expect(storyRows(photos.slice(0, 2)).map((row) => row.kind)).toEqual(["single", "single"]);
  });
});

import { randomBytes } from "node:crypto";

import { inArray } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { getDb } from "@/lib/db";
import { categories, media, products } from "@/lib/db/schema";
import type { CategoryNodeDto } from "@/lib/validation/categories";
import type { MediaDto, MediaLibraryItem, UploadTicket } from "@/lib/validation/media";
import type { ProductDetailDto, ProductInput, ProductListItemDto } from "@/lib/validation/products";

import { call, createUser, removeUsers, sessionCookie, testRun } from "./support/admin";
import { ensureBucket, objectExists, removeObject } from "./support/storage";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

const { run, domain, password } = testRun();
const created = {
  products: new Set<string>(),
  categories: new Set<string>(),
  media: new Map<string, string>(),
};

let owner = "";
let editor = "";

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function noiseImage(): Promise<Buffer> {
  return sharp(randomBytes(64 * 48 * 3), { raw: { width: 64, height: 48, channels: 3 } })
    .png()
    .toBuffer();
}

function glb(): Buffer {
  const text = JSON.stringify({
    asset: { version: "2.0" },
    extras: { run, nonce: randomBytes(8).toString("hex") },
  });
  const padded = text + " ".repeat((4 - (text.length % 4)) % 4);
  const chunk = Buffer.from(padded, "utf8");
  const header = Buffer.alloc(20);
  header.write("glTF", 0, "latin1");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + chunk.length, 8);
  header.writeUInt32LE(chunk.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  return Buffer.concat([header, chunk]);
}

async function upload(
  fileName: string,
  contentType: string,
  body: Buffer,
): Promise<{ response: Response; ticket: UploadTicket }> {
  const ticketResponse = await call("/api/admin/media/uploads", "POST", {
    cookie: owner,
    body: { fileName, contentType, size: body.length },
  });
  expect(ticketResponse.status).toBe(201);
  const ticket = await json<UploadTicket>(ticketResponse);
  const put = await fetch(ticket.url, {
    method: "PUT",
    body: new Uint8Array(body),
    headers: ticket.headers,
  });
  expect(put.status).toBe(200);
  const response = await call("/api/admin/media", "POST", {
    cookie: owner,
    body: { key: ticket.key },
  });
  return { response, ticket };
}

async function uploadMedia(fileName: string, contentType: string, body: Buffer): Promise<MediaDto> {
  const { response } = await upload(fileName, contentType, body);
  expect(response.status).toBe(201);
  const item = await json<MediaDto>(response);
  created.media.set(item.id, item.key);
  return item;
}

async function createCategory(name: string, parentId: string | null = null): Promise<string> {
  const response = await call("/api/admin/categories", "POST", {
    cookie: owner,
    body: {
      name: { az: name },
      slug: { az: `${run}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` },
      description: null,
      parentId,
      imageId: null,
      isActive: true,
      seoTitle: null,
      seoDescription: null,
    },
  });
  expect(response.status).toBe(201);
  const { id } = await json<{ id: string }>(response);
  created.categories.add(id);
  return id;
}

function productInput(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: { az: `Test kürsü ${run}`, ru: "", en: "" },
    slug: { az: `test-kursu-${run}`, ru: "", en: "" },
    sku: `T-${run}`,
    shortDescription: null,
    description: null,
    categoryIds: [],
    specs: [],
    images: [],
    modelId: null,
    modelPosterId: null,
    relatedIds: [],
    seoTitle: null,
    seoDescription: null,
    status: "draft",
    ...overrides,
  };
}

async function createProduct(input: ProductInput): Promise<string> {
  const response = await call("/api/admin/products", "POST", { cookie: owner, body: input });
  expect(response.status, JSON.stringify(await response.clone().json())).toBe(201);
  const { id } = await json<{ id: string }>(response);
  created.products.add(id);
  return id;
}

async function getProduct(id: string): Promise<ProductDetailDto> {
  const response = await call("/api/admin/products/[id]", "GET", { cookie: owner, params: { id } });
  expect(response.status).toBe(200);
  return json<ProductDetailDto>(response);
}

async function listProducts(query: string): Promise<ProductListItemDto[]> {
  const response = await call("/api/admin/products", "GET", {
    cookie: owner,
    path: `/api/admin/products?${query}`,
  });
  expect(response.status).toBe(200);
  return (await json<{ rows: ProductListItemDto[] }>(response)).rows;
}

beforeAll(async () => {
  await ensureBucket();
  const ownerUser = await createUser("owner", domain, password);
  const editorUser = await createUser("editor", domain, password);
  owner = await sessionCookie(ownerUser.email, password);
  editor = await sessionCookie(editorUser.email, password);
});

beforeEach(() => {
  vi.mocked(revalidateTag).mockClear();
});

afterAll(async () => {
  const db = getDb();
  if (created.products.size) {
    await db.delete(products).where(inArray(products.id, [...created.products]));
  }
  const categoryIds = [...created.categories];
  if (categoryIds.length) {
    await db.update(categories).set({ parentId: null }).where(inArray(categories.id, categoryIds));
    await db.delete(categories).where(inArray(categories.id, categoryIds));
  }
  if (created.media.size) {
    await db.delete(media).where(inArray(media.id, [...created.media.keys()]));
    for (const key of created.media.values()) await removeObject(key);
  }
  await removeUsers(domain);
});

describe("media uploads", () => {
  it("rejects a file type the library does not accept", async () => {
    const response = await call("/api/admin/media/uploads", "POST", {
      cookie: owner,
      body: { fileName: "script.html", contentType: "text/html", size: 120 },
    });
    expect(response.status).toBe(400);
  });

  it("rejects an oversized file before issuing an upload URL", async () => {
    const response = await call("/api/admin/media/uploads", "POST", {
      cookie: owner,
      body: { fileName: "huge.jpg", contentType: "image/jpeg", size: 200 * 1024 * 1024 },
    });
    expect(response.status).toBe(400);
    expect((await json<{ fields: Record<string, string> }>(response)).fields).toHaveProperty(
      "size",
    );
  });

  it("deletes an upload whose content does not match its type", async () => {
    const { response, ticket } = await upload(
      "fake.png",
      "image/png",
      Buffer.from("<script>alert(1)</script>"),
    );
    expect(response.status).toBe(400);
    expect(await objectExists(ticket.key)).toBe(false);
  });

  it("stores dimensions and a placeholder for an image", async () => {
    const image = await uploadMedia("Ofis kürsüsü.png", "image/png", await noiseImage());
    expect(image).toMatchObject({ mimeType: "image/png", width: 64, height: 48 });
    expect(image.key).toMatch(/^uploads\/\d{4}\/\d{2}\/ofis-kursusu-[0-9a-f]{8}\.png$/);
    const [row] = await getDb()
      .select()
      .from(media)
      .where(inArray(media.id, [image.id]));
    expect(row?.lqip).toMatch(/^data:image\/webp;base64,/);
  });
});

describe("categories", () => {
  it("keeps the tree two levels deep and reorders siblings", async () => {
    const parent = await createCategory("Parent");
    const child = await createCategory("Child", parent);
    const second = await createCategory("Second", parent);

    const deep = await call("/api/admin/categories", "POST", {
      cookie: owner,
      body: {
        name: { az: "Deep" },
        slug: { az: `${run}-deep` },
        description: null,
        parentId: child,
        imageId: null,
        isActive: true,
        seoTitle: null,
        seoDescription: null,
      },
    });
    expect(deep.status).toBe(400);

    const reorder = await call("/api/admin/categories/reorder", "POST", {
      cookie: owner,
      body: { parentId: parent, orderedIds: [second, child] },
    });
    expect(reorder.status).toBe(204);
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith("catalog", { expire: 0 });

    const list = await json<CategoryNodeDto[]>(
      await call("/api/admin/categories", "GET", { cookie: owner }),
    );
    const order = list
      .filter((node) => node.parentId === parent)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((node) => node.id);
    expect(order).toEqual([second, child]);

    const parentWithChildren = await call("/api/admin/categories/reorder", "POST", {
      cookie: owner,
      body: {
        parentId: second,
        orderedIds: [parent],
      },
    });
    expect(parentWithChildren.status).toBe(400);
  });

  it("rejects a duplicate slug with a field error", async () => {
    await createCategory("Unique");
    const response = await call("/api/admin/categories", "POST", {
      cookie: owner,
      body: {
        name: { az: "Unique again" },
        slug: { az: `${run}-unique` },
        description: null,
        parentId: null,
        imageId: null,
        isActive: true,
        seoTitle: null,
        seoDescription: null,
      },
    });
    expect(response.status).toBe(409);
    expect((await json<{ fields: Record<string, string> }>(response)).fields).toHaveProperty(
      "slug.az",
    );
  });
});

describe("products", () => {
  it("rejects an invalid payload with Azerbaijani field messages", async () => {
    const response = await call("/api/admin/products", "POST", {
      cookie: owner,
      body: {
        name: { az: "" },
        slug: { az: "Bad Slug" },
        images: [{ mediaId: "not-a-uuid", alt: { az: "" } }],
        specs: [{ key: { az: "" }, value: { az: "x" } }],
        status: "maybe",
      },
    });
    expect(response.status).toBe(400);
    const body = await json<{ fields: Record<string, string> }>(response);
    expect(Object.keys(body.fields)).toEqual(
      expect.arrayContaining([
        "name.az",
        "slug.az",
        "images.0.mediaId",
        "images.0.alt.az",
        "specs.0.key.az",
        "status",
        "categoryIds",
      ]),
    );
    expect(body.fields["name.az"]).toBe("Məhsulun adını yazın.");
  });

  it("refuses to publish a product without images", async () => {
    const response = await call("/api/admin/products", "POST", {
      cookie: owner,
      body: productInput({ status: "published", slug: { az: `no-images-${run}` } }),
    });
    expect(response.status).toBe(400);
    expect((await json<{ fields: Record<string, string> }>(response)).fields).toHaveProperty(
      "images",
    );
  });

  it("requires a poster when a 3D model is attached", async () => {
    const model = await uploadMedia("model.glb", "model/gltf-binary", glb());
    const response = await call("/api/admin/products", "POST", {
      cookie: owner,
      body: productInput({ modelId: model.id, slug: { az: `no-poster-${run}` } }),
    });
    expect(response.status).toBe(400);
    expect((await json<{ fields: Record<string, string> }>(response)).fields).toHaveProperty(
      "modelPosterId",
    );
  });

  it("creates, publishes, reorders, duplicates, trashes and purges a product", async () => {
    const parent = await createCategory("Kurs");
    const child = await createCategory("Rehber", parent);
    const images = await Promise.all(
      [1, 2, 3].map(async (n) => uploadMedia(`foto-${n}.png`, "image/png", await noiseImage())),
    );
    const model = await uploadMedia("kursu.glb", "model/gltf-binary", glb());
    const poster = await uploadMedia("poster.png", "image/png", await noiseImage());

    const input = productInput({
      status: "published",
      categoryIds: [child],
      images: images.map((image, index) => ({
        mediaId: image.id,
        alt: { az: `Foto ${index + 1}`, ru: index === 0 ? "Фото 1" : "", en: "" },
      })),
      specs: [{ key: { az: "Hündürlük" }, value: { az: "75 sm" } }],
      modelId: model.id,
      modelPosterId: poster.id,
      seoTitle: { az: "Rəhbər kürsüsü" },
    });
    const id = await createProduct(input);
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith("catalog", { expire: 0 });

    const detail = await getProduct(id);
    expect(detail).toMatchObject({
      status: "published",
      categoryIds: [child],
      modelId: model.id,
      modelPosterId: poster.id,
      seoTitle: { az: "Rəhbər kürsüsü", ru: null, en: null },
    });
    expect(detail.publishedAt).not.toBeNull();
    expect(detail.images.map((image) => image.mediaId)).toEqual(images.map((image) => image.id));
    expect(detail.images[0]?.alt).toEqual({ az: "Foto 1", ru: "Фото 1", en: null });

    const inParent = await listProducts(`categoryId=${parent}&status=published&search=${run}`);
    expect(inParent.map((row) => row.id)).toContain(id);
    const drafts = await listProducts(`status=draft&search=${run}`);
    expect(drafts.map((row) => row.id)).not.toContain(id);

    const reversed = [...input.images].reverse();
    const update = await call("/api/admin/products/[id]", "PUT", {
      cookie: owner,
      params: { id },
      body: { ...input, images: reversed },
    });
    expect(update.status).toBe(200);
    expect((await getProduct(id)).images.map((image) => image.mediaId)).toEqual(
      reversed.map((image) => image.mediaId),
    );
    const [thumbnail] = await listProducts(`search=${run}&status=published`);
    expect(thumbnail?.thumbnail?.src).toBe(`/media/${images[2]?.key}`);

    const conflict = await call("/api/admin/products", "POST", {
      cookie: owner,
      body: productInput({ slug: input.slug, sku: null }),
    });
    expect(conflict.status).toBe(409);
    expect((await json<{ fields: Record<string, string> }>(conflict)).fields).toHaveProperty(
      "slug.az",
    );

    const slugCheck = await call("/api/admin/slugs", "GET", {
      cookie: owner,
      path: `/api/admin/slugs?entity=product&slug=${input.slug.az}`,
    });
    expect(await json(slugCheck)).toEqual({
      available: false,
      suggestion: `${input.slug.az}-2`,
    });

    const copyResponse = await call("/api/admin/products/[id]/duplicate", "POST", {
      cookie: owner,
      params: { id },
    });
    expect(copyResponse.status).toBe(201);
    const copyId = (await json<{ id: string }>(copyResponse)).id;
    created.products.add(copyId);
    const copy = await getProduct(copyId);
    expect(copy).toMatchObject({ status: "draft", categoryIds: [child], modelId: model.id });
    expect(copy.slug.az).toBe(`${input.slug.az}-kopiya`);
    expect(copy.name.az).toBe(`${input.name.az} (kopiya)`);
    expect(copy.images).toHaveLength(3);

    const usage = await call("/api/admin/media", "GET", {
      cookie: owner,
      path: `/api/admin/media?search=${encodeURIComponent(images[0]?.key ?? "")}&kind=image`,
    });
    const [usedImage] = (await json<{ rows: MediaLibraryItem[] }>(usage)).rows;
    expect(usedImage?.usage.products).toBe(2);
    const inUse = await call("/api/admin/media/[id]", "DELETE", {
      cookie: owner,
      params: { id: images[0]?.id ?? "" },
    });
    expect(inUse.status).toBe(409);

    const trash = await call("/api/admin/products/bulk", "POST", {
      cookie: owner,
      body: { action: "trash", ids: [id, copyId] },
    });
    expect(await json(trash)).toEqual({ updated: 2, skipped: 0 });
    expect((await listProducts(`search=${run}`)).map((row) => row.id)).not.toContain(id);
    expect((await listProducts(`search=${run}&status=trash`)).map((row) => row.id)).toEqual(
      expect.arrayContaining([id, copyId]),
    );

    const editorPurge = await call("/api/admin/products/bulk", "POST", {
      cookie: editor,
      body: { action: "purge", ids: [copyId] },
    });
    expect(editorPurge.status).toBe(403);

    const restore = await call("/api/admin/products/bulk", "POST", {
      cookie: editor,
      body: { action: "restore", ids: [id] },
    });
    expect(await json(restore)).toEqual({ updated: 1, skipped: 0 });
    expect((await getProduct(id)).status).toBe("draft");

    const purge = await call("/api/admin/products/bulk", "POST", {
      cookie: owner,
      body: { action: "purge", ids: [copyId, id] },
    });
    expect(await json(purge)).toEqual({ updated: 1, skipped: 1 });
    const gone = await call("/api/admin/products/[id]", "GET", {
      cookie: owner,
      params: { id: copyId },
    });
    expect(gone.status).toBe(404);

    const move = await call("/api/admin/categories/[id]", "DELETE", {
      cookie: owner,
      params: { id: child },
      body: { moveProductsTo: parent },
    });
    expect(move.status).toBe(204);
    created.categories.delete(child);
    expect((await getProduct(id)).categoryIds).toEqual([parent]);
    const after = await json<CategoryNodeDto[]>(
      await call("/api/admin/categories", "GET", { cookie: owner }),
    );
    expect(after.find((node) => node.id === parent)?.productCount).toBe(1);
  });

  it("lists names and categories in every locale for the admin language switch", async () => {
    const category = await createCategory(`Dilli ${run}`);
    const id = await createProduct(
      productInput({
        name: { az: `Dilli kürsü ${run}`, ru: `Кресло ${run}`, en: "" },
        slug: { az: `dilli-kursu-${run}` },
        sku: null,
        categoryIds: [category],
      }),
    );
    const row = (await listProducts(`search=${run}`)).find((item) => item.id === id);
    expect(row?.name).toEqual({ az: `Dilli kürsü ${run}`, ru: `Кресло ${run}`, en: null });
    expect(row?.slug).toEqual(expect.objectContaining({ az: `dilli-kursu-${run}` }));
    expect(row?.categories).toEqual([expect.objectContaining({ az: `Dilli ${run}` })]);

    const nodes = await json<CategoryNodeDto[]>(
      await call("/api/admin/categories", "GET", { cookie: owner }),
    );
    expect(nodes.find((node) => node.id === category)?.name).toEqual(
      expect.objectContaining({ az: `Dilli ${run}` }),
    );
  });

  it("features products from the form and in bulk, and keeps copies off the home page", async () => {
    const featured = await createProduct(
      productInput({
        name: { az: `Ana səhifə ${run}` },
        slug: { az: `ana-sehife-${run}` },
        sku: null,
        isFeatured: true,
      }),
    );
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith("catalog", { expire: 0 });
    const plain = await createProduct(
      productInput({ name: { az: `Adi ${run}` }, slug: { az: `adi-${run}` }, sku: null }),
    );
    expect((await getProduct(featured)).isFeatured).toBe(true);
    expect((await getProduct(plain)).isFeatured).toBe(false);
    const listed = await listProducts(`search=${run}`);
    expect(listed.find((row) => row.id === featured)?.isFeatured).toBe(true);
    expect(listed.find((row) => row.id === plain)?.isFeatured).toBe(false);

    const featuredInput = productInput({
      name: { az: `Ana səhifə ${run}` },
      slug: { az: `ana-sehife-${run}` },
      sku: null,
      isFeatured: false,
    });
    const update = await call("/api/admin/products/[id]", "PUT", {
      cookie: editor,
      params: { id: featured },
      body: featuredInput,
    });
    expect(update.status).toBe(200);
    expect((await getProduct(featured)).isFeatured).toBe(false);

    vi.mocked(revalidateTag).mockClear();
    const feature = await call("/api/admin/products/bulk", "POST", {
      cookie: editor,
      body: { action: "feature", ids: [featured, plain] },
    });
    expect(await json(feature)).toEqual({ updated: 2, skipped: 0 });
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith("catalog", { expire: 0 });
    expect((await getProduct(plain)).isFeatured).toBe(true);

    const copyResponse = await call("/api/admin/products/[id]/duplicate", "POST", {
      cookie: owner,
      params: { id: plain },
    });
    expect(copyResponse.status).toBe(201);
    const copyId = (await json<{ id: string }>(copyResponse)).id;
    created.products.add(copyId);
    expect((await getProduct(copyId)).isFeatured).toBe(false);

    await call("/api/admin/products/bulk", "POST", {
      cookie: owner,
      body: { action: "trash", ids: [plain] },
    });
    const unfeature = await call("/api/admin/products/bulk", "POST", {
      cookie: owner,
      body: { action: "unfeature", ids: [featured, plain] },
    });
    expect(await json(unfeature)).toEqual({ updated: 1, skipped: 1 });
    expect((await getProduct(featured)).isFeatured).toBe(false);
    expect((await getProduct(plain)).isFeatured).toBe(true);
  });

  it("deletes an unused file from the library and storage", async () => {
    const image = await uploadMedia("unused.png", "image/png", await noiseImage());
    const response = await call("/api/admin/media/[id]", "DELETE", {
      cookie: editor,
      params: { id: image.id },
    });
    expect(response.status).toBe(204);
    created.media.delete(image.id);
    expect(await objectExists(image.key)).toBe(false);
  });

  it("answers 404 for a malformed id instead of a database error", async () => {
    const response = await call("/api/admin/products/[id]", "GET", {
      cookie: owner,
      params: { id: "not-a-uuid" },
    });
    expect(response.status).toBe(404);
  });
});

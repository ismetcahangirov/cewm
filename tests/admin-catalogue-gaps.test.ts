import { randomBytes } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { getDb } from "@/lib/db";
import { brands, media, products } from "@/lib/db/schema";
import { groupSpecs } from "@/lib/public/product";
import type { BrandDto } from "@/lib/validation/brands";
import type { ProductDetailDto, ProductInput } from "@/lib/validation/products";

import { call, createUser, removeUsers, sessionCookie, testRun } from "./support/admin";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

const { run, domain, password } = testRun();

let cookie = "";
let imageId = "";
const productIds: string[] = [];
const brandIds: string[] = [];

function text(value: string) {
  return { az: `${value} az`, ru: `${value} ru`, en: `${value} en`, de: `${value} de` };
}

function productInput(overrides: Partial<ProductInput>): ProductInput {
  return {
    name: { az: `Qrup ${run}` },
    slug: { az: `qrup-${run}` },
    sku: "",
    shortDescription: null,
    description: null,
    categoryIds: [],
    brandId: null,
    benefits: [],
    specs: [],
    images: [],
    documents: [],
    videoId: null,
    videoUrl: null,
    videoPosterId: null,
    relatedIds: [],
    seoTitle: null,
    seoDescription: null,
    status: "draft",
    ...overrides,
  };
}

beforeAll(async () => {
  const user = await createUser("editor", domain, password);
  cookie = await sessionCookie(user.email, password);
  const [row] = await getDb()
    .insert(media)
    .values({
      key: `tests/${run}/brand.png`,
      mimeType: "image/png",
      width: 400,
      height: 300,
      size: 100,
      sha256: randomBytes(32).toString("hex"),
    })
    .returning({ id: media.id });
  imageId = row?.id ?? "";
});

afterAll(async () => {
  const db = getDb();
  if (productIds.length) await db.delete(products).where(inArray(products.id, productIds));
  if (brandIds.length) await db.delete(brands).where(inArray(brands.id, brandIds));
  await db.delete(media).where(eq(media.id, imageId));
  await removeUsers(domain);
});

describe("spec groups", () => {
  it("keeps a translatable group heading on spec rows and leaves ungrouped rows valid", async () => {
    const created = await call("/api/admin/products", "POST", {
      cookie,
      body: productInput({
        specs: [
          { label: text("Uzunluq"), value: text("3200"), unit: null, group: text("Ölçülər") },
          { label: text("Eni"), value: text("1200"), unit: null, group: text("Ölçülər") },
          { label: text("Güc"), value: text("7"), unit: null, group: null },
        ],
      }),
    });
    expect(created.status, JSON.stringify(await created.clone().json())).toBe(201);
    const { id } = (await created.json()) as { id: string };
    productIds.push(id);

    const detail = (await (
      await call("/api/admin/products/[id]", "GET", { cookie, params: { id } })
    ).json()) as ProductDetailDto;
    expect(detail.specs.map((spec) => spec.group?.de ?? null)).toEqual([
      "Ölçülər de",
      "Ölçülər de",
      null,
    ]);
  });

  it("groups consecutive rows for the public page", () => {
    const row = (label: string, group: string | null) => ({
      label,
      value: "1",
      unit: null,
      group,
    });
    expect(
      groupSpecs([row("a", "Ölçülər"), row("b", "Ölçülər"), row("c", null), row("d", "Güc")]),
    ).toEqual([
      { heading: "Ölçülər", rows: [row("a", "Ölçülər"), row("b", "Ölçülər")] },
      { heading: null, rows: [row("c", null)] },
      { heading: "Güc", rows: [row("d", "Güc")] },
    ]);
  });
});

describe("benefit length", () => {
  it("accepts 400 characters and refuses more", async () => {
    const long = (length: number) => ({ text: { az: "a".repeat(length) } });
    const ok = await call("/api/admin/products", "POST", {
      cookie,
      body: productInput({ slug: { az: `uzun-${run}` }, benefits: [long(400)] }),
    });
    expect(ok.status).toBe(201);
    productIds.push(((await ok.json()) as { id: string }).id);
    const refused = await call("/api/admin/products", "POST", {
      cookie,
      body: productInput({ slug: { az: `uzun2-${run}` }, benefits: [long(401)] }),
    });
    expect(refused.status).toBe(400);
  });
});

describe("brand image", () => {
  it("stores an optional image next to the logo and counts it as media usage", async () => {
    const created = await call("/api/admin/brands", "POST", {
      cookie,
      body: { name: `Brend ${run}`, slug: `brend-${run}`, imageId, isActive: true },
    });
    expect(created.status, JSON.stringify(await created.clone().json())).toBe(201);
    const { id } = (await created.json()) as { id: string };
    brandIds.push(id);

    const list = (await (await call("/api/admin/brands", "GET", { cookie })).json()) as BrandDto[];
    const brand = list.find((item) => item.id === id);
    expect(brand?.image?.id).toBe(imageId);
    expect(brand?.logo).toBeNull();

    const usage = await call("/api/admin/media/[id]/usage", "GET", {
      cookie,
      params: { id: imageId },
    });
    expect(await usage.json()).toEqual([
      { kind: "brands", id, label: `Brend ${run}`, href: "/admin/brands" },
    ]);
  });
});

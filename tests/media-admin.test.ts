import { eq, inArray } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { getDb } from "@/lib/db";
import { media, products } from "@/lib/db/schema";
import type { MediaDto, MediaUsageItem } from "@/lib/validation/media";

import { call, createUser, removeUsers, sessionCookie, testRun } from "./support/admin";
import { ensureBucket, objectExists, putObject, removeObject } from "./support/storage";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

const { run, domain, password } = testRun();

let cookie = "";
const keys: string[] = [];
const productIds: string[] = [];

async function png(red: number): Promise<Buffer> {
  return sharp({
    create: { width: 40, height: 30, channels: 3, background: { r: red, g: 20, b: 90 } },
  })
    .png()
    .toBuffer();
}

async function upload(name: string, body: Buffer): Promise<string> {
  const key = `uploads/2026/11/${name}-${run}.png`;
  keys.push(key);
  await putObject(key, body, "image/png");
  return key;
}

async function register(key: string): Promise<MediaDto> {
  const response = await call("/api/admin/media", "POST", { cookie, body: { key } });
  expect(response.status).toBeLessThan(300);
  return (await response.json()) as MediaDto;
}

beforeAll(async () => {
  await ensureBucket();
  const user = await createUser("editor", domain, password);
  cookie = await sessionCookie(user.email, password);
});

afterAll(async () => {
  const db = getDb();
  if (productIds.length) await db.delete(products).where(inArray(products.id, productIds));
  await db.delete(media).where(inArray(media.key, keys));
  for (const key of keys) await removeObject(key);
  await removeUsers(domain);
});

describe("media administration", () => {
  it("keeps alt text and captions per language and finds files by German alt text", async () => {
    const item = await register(await upload("alt", await png(10)));
    const saved = await call("/api/admin/media/[id]", "PATCH", {
      cookie,
      params: { id: item.id },
      body: {
        alt: { az: "Maşın", ru: "Станок", en: "Machine", de: "Maschine" },
        caption: { az: "Altyazı", ru: "", en: "", de: "Bildunterschrift" },
      },
    });
    expect(saved.status).toBe(200);
    const dto = (await saved.json()) as MediaDto;
    expect(dto.alts?.de).toBe("Maschine");
    expect(dto.captions).toMatchObject({ az: "Altyazı", de: "Bildunterschrift" });

    const found = await call("/api/admin/media", "GET", {
      path: `/api/admin/media?search=Maschine&kind=image`,
      cookie,
    });
    const page = (await found.json()) as { rows: { id: string }[] };
    expect(page.rows.map((row) => row.id)).toContain(item.id);
  });

  it("expires every public tag when alt text changes, so logos, contact photos and the hero poster follow", async () => {
    const item = await register(await upload("alt-tags", await png(15)));
    vi.mocked(revalidateTag).mockClear();
    const saved = await call("/api/admin/media/[id]", "PATCH", {
      cookie,
      params: { id: item.id },
      body: { alt: { az: "Yeni alt mətn" } },
    });
    expect(saved.status).toBe(200);
    const tags = vi.mocked(revalidateTag).mock.calls.map(([tag]) => tag);
    expect(tags).toEqual(expect.arrayContaining(["catalog", "content", "settings"]));
  });

  it("lists where a file is used and refuses to delete it meanwhile", async () => {
    const item = await register(await upload("used", await png(40)));
    const [product] = await getDb()
      .insert(products)
      .values({
        slug: { az: `used-${run}` },
        name: { az: `Used ${run}` },
        videoPosterId: item.id,
      })
      .returning({ id: products.id });
    if (!product) throw new Error("product not created");
    productIds.push(product.id);

    const usage = await call("/api/admin/media/[id]/usage", "GET", {
      cookie,
      params: { id: item.id },
    });
    const items = (await usage.json()) as MediaUsageItem[];
    expect(items).toEqual([
      {
        kind: "products",
        id: product.id,
        label: `Used ${run}`,
        href: `/admin/products/${product.id}`,
      },
    ]);

    const refused = await call("/api/admin/media/[id]", "DELETE", {
      cookie,
      params: { id: item.id },
    });
    expect(refused.status).toBe(409);
  });

  it("replaces a file everywhere: same id, new key, embedded links rewritten, old object gone", async () => {
    const oldKey = await upload("old", await png(120));
    const item = await register(oldKey);
    const [product] = await getDb()
      .insert(products)
      .values({
        slug: { az: `replace-${run}` },
        name: { az: `Replace ${run}` },
        description: {
          az: { type: "doc", content: [{ type: "image", attrs: { src: `/media/${oldKey}` } }] },
        },
      })
      .returning({ id: products.id });
    if (!product) throw new Error("product not created");
    productIds.push(product.id);

    const newKey = await upload("new", await png(200));
    const replaced = await call("/api/admin/media/[id]/replace", "POST", {
      cookie,
      params: { id: item.id },
      body: { key: newKey },
    });
    expect(replaced.status).toBe(200);
    const dto = (await replaced.json()) as MediaDto;
    expect(dto.id).toBe(item.id);
    expect(dto.key).toBe(newKey);

    const [row] = await getDb().select().from(products).where(eq(products.id, product.id));
    expect(JSON.stringify(row?.description)).toContain(`/media/${newKey}`);
    expect(JSON.stringify(row?.description)).not.toContain(oldKey);
    expect(await objectExists(oldKey)).toBe(false);
    expect(await objectExists(newKey)).toBe(true);

    const retried = await call("/api/admin/media/[id]/replace", "POST", {
      cookie,
      params: { id: item.id },
      body: { key: newKey },
    });
    expect(retried.status).toBe(200);
    expect(((await retried.json()) as MediaDto).key).toBe(newKey);
    expect(await objectExists(newKey)).toBe(true);
  });

  it("refuses a replacement of another kind or one already in the library", async () => {
    const first = await register(await upload("first", await png(70)));
    const secondBytes = await png(80);
    const second = await register(await upload("second", secondBytes));

    const taken = await call("/api/admin/media/[id]/replace", "POST", {
      cookie,
      params: { id: first.id },
      body: { key: second.key },
    });
    expect(taken.status).toBe(409);
    expect(await objectExists(second.key)).toBe(true);

    const pdfKey = `uploads/2026/11/doc-${run}.pdf`;
    keys.push(pdfKey);
    await putObject(pdfKey, Buffer.from("%PDF-1.4 test"), "application/pdf");
    const wrongKind = await call("/api/admin/media/[id]/replace", "POST", {
      cookie,
      params: { id: first.id },
      body: { key: pdfKey },
    });
    expect(wrongKind.status).toBe(400);

    const duplicateKey = await upload("copy", secondBytes);
    const duplicate = await call("/api/admin/media/[id]/replace", "POST", {
      cookie,
      params: { id: first.id },
      body: { key: duplicateKey },
    });
    expect(duplicate.status).toBe(409);
  });
});

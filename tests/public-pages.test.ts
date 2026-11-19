import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";
import { brands, clientLogos, media, posts } from "@/lib/db/schema";
import {
  formatPostDate,
  postsPerPage,
  queryPostBySlug,
  queryPosts,
  queryRelatedPosts,
} from "@/lib/public/content";
import { queryBrands, queryClientLogos } from "@/lib/public/home";

const run = randomUUID().slice(0, 8);
const created = {
  media: [] as string[],
  brands: [] as string[],
  posts: [] as string[],
  logos: [] as string[],
};

async function makeMedia(name: string, width: number | null = 1200, height: number | null = 800) {
  const [row] = await getDb()
    .insert(media)
    .values({
      key: `test/${run}/${name}.jpg`,
      mimeType: "image/jpeg",
      width,
      height,
      size: 1000,
      sha256: `${run}-${name}`,
      alt: { az: `Alt ${name}`, en: `Alt en ${name}` },
    })
    .returning();
  created.media.push(row.id);
  return row;
}

async function makePost(
  name: string,
  values: Partial<typeof posts.$inferInsert> = {},
): Promise<string> {
  const [row] = await getDb()
    .insert(posts)
    .values({
      slug: { az: `${run}-${name}` },
      title: { az: `Yazı ${name}` },
      status: "published",
      publishedAt: new Date(Date.now() - 86_400_000),
      ...values,
    })
    .returning({ id: posts.id });
  created.posts.push(row.id);
  return row.id;
}

async function makeLogo(
  name: string,
  imageId: string,
  values: Partial<typeof clientLogos.$inferInsert> = {},
): Promise<string> {
  const [row] = await getDb()
    .insert(clientLogos)
    .values({ name: `${run}-${name}`, imageId, ...values })
    .returning({ id: clientLogos.id });
  created.logos.push(row.id);
  return row.id;
}

afterAll(async () => {
  const db = getDb();
  if (created.logos.length) {
    await db.delete(clientLogos).where(inArray(clientLogos.id, created.logos));
  }
  if (created.brands.length) await db.delete(brands).where(inArray(brands.id, created.brands));
  if (created.posts.length) await db.delete(posts).where(inArray(posts.id, created.posts));
  if (created.media.length) await db.delete(media).where(inArray(media.id, created.media));
});

describe("posts", () => {
  const ids: Record<string, string> = {};
  const day = 86_400_000;

  beforeAll(async () => {
    const cover = await makeMedia("post-cover");
    ids.old = await makePost("old", { publishedAt: new Date(Date.now() - 10 * day) });
    ids.recent = await makePost("recent", {
      publishedAt: new Date(Date.now() - day),
      coverId: cover.id,
      slug: { az: `${run}-recent`, ru: `${run}-recent-ru`, en: `${run}-recent-en` },
      title: { az: "Yeni yazı", ru: "Новая запись" },
      excerpt: { az: "Qısa xülasə" },
    });
    ids.middle = await makePost("middle", { publishedAt: new Date(Date.now() - 5 * day) });
    ids.future = await makePost("future", { publishedAt: new Date(Date.now() + 7 * day) });
    ids.draft = await makePost("draft", { status: "draft" });
    ids.noDate = await makePost("nodate", { publishedAt: null });
  });

  const mine = (items: { id: string }[]) =>
    items.filter((item) => Object.values(ids).includes(item.id)).map((item) => item.id);

  it("returns only published posts that are already due, newest first", async () => {
    const { items } = await queryPosts("az", 1);
    expect(mine(items)).toEqual([ids.recent, ids.middle, ids.old]);
  });

  it("counts only visible posts", async () => {
    const { items, total } = await queryPosts("az", 1);
    expect(total).toBe(items.length);
    expect(total).toBeGreaterThanOrEqual(3);
  });

  it("builds localized cards", async () => {
    const { items } = await queryPosts("ru", 1);
    const card = items.find((item) => item.id === ids.recent);
    expect(card).toMatchObject({
      title: "Новая запись",
      href: `/ru/bloq/${run}-recent-ru`,
      excerpt: "Qısa xülasə",
    });
    expect(card?.image?.src).toBe(`/media/test/${run}/post-cover.jpg`);
    expect(items.find((item) => item.id === ids.old)?.image).toBeNull();
  });

  it("limits a page to the page size and grows by whole pages", async () => {
    const first = await queryPosts("az", 1);
    expect(first.items.length).toBeLessThanOrEqual(postsPerPage);
    const second = await queryPosts("az", 2);
    expect(second.items.length).toBeGreaterThanOrEqual(first.items.length);
  });

  it("looks a post up by slug in any locale, with az as fallback", async () => {
    expect((await queryPostBySlug("az", `${run}-recent`))?.id).toBe(ids.recent);
    expect((await queryPostBySlug("ru", `${run}-recent-ru`))?.id).toBe(ids.recent);
    expect((await queryPostBySlug("ru", `${run}-recent`))?.id).toBe(ids.recent);
    expect((await queryPostBySlug("en", `${run}-old`))?.id).toBe(ids.old);
    expect(await queryPostBySlug("az", `${run}-missing`)).toBeNull();
  });

  it("does not resolve drafts, future posts or posts without a date", async () => {
    expect(await queryPostBySlug("az", `${run}-draft`)).toBeNull();
    expect(await queryPostBySlug("az", `${run}-future`)).toBeNull();
    expect(await queryPostBySlug("az", `${run}-nodate`)).toBeNull();
  });

  it("picks at most three newest other posts as related", async () => {
    const related = await queryRelatedPosts("az", ids.recent);
    expect(related.length).toBeLessThanOrEqual(3);
    expect(related.map((item) => item.id)).not.toContain(ids.recent);
    expect(related.map((item) => item.id)).not.toContain(ids.future);
    expect(related.map((item) => item.id)).not.toContain(ids.draft);
    expect(mine(related)).toEqual([ids.middle, ids.old]);
  });

  it("formats dates per locale", () => {
    const iso = "2026-03-05T10:00:00.000Z";
    expect(formatPostDate(iso, "en")).toBe("March 5, 2026");
    expect(formatPostDate(iso, "ru")).toContain("2026");
    expect(formatPostDate(iso, "az")).toContain("2026");
  });
});

describe("client logos and brands", () => {
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    const image = await makeMedia("logo");
    const broken = await makeMedia("logo-broken", null, null);
    ids.second = await makeLogo("b-second", image.id, { sortOrder: 2 });
    ids.first = await makeLogo("a-first", image.id, { sortOrder: 1, url: "https://example.com" });
    ids.inactive = await makeLogo("inactive", image.id, { isActive: false });
    ids.broken = await makeLogo("broken", broken.id);
    const [brand] = await getDb()
      .insert(brands)
      .values({
        name: `Brand ${run}`,
        slug: `brand-${run}`,
        description: { az: "Təsvir", de: "Beschreibung" },
        sortOrder: -1,
      })
      .returning({ id: brands.id });
    ids.brand = brand?.id ?? "";
    created.brands.push(ids.brand);
  });

  const mine = (items: { id: string }[]) =>
    items.filter((item) => Object.values(ids).includes(item.id)).map((item) => item.id);

  it("returns active client logos with an image in sort order", async () => {
    const logos = await queryClientLogos("az");
    expect(mine(logos)).toEqual([ids.first, ids.second]);
    expect(logos.find((item) => item.id === ids.first)).toMatchObject({
      name: `${run}-a-first`,
      url: "https://example.com",
    });
  });

  it("returns brands with a localized description and no logo yet", async () => {
    const german = (await queryBrands("de")).find((item) => item.id === ids.brand);
    expect(german).toMatchObject({
      name: `Brand ${run}`,
      description: "Beschreibung",
      image: null,
    });
    const russian = (await queryBrands("ru")).find((item) => item.id === ids.brand);
    expect(russian?.description).toBe("Təsvir");
  });
});

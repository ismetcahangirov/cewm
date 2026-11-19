import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { getDb } from "@/lib/db";
import { heroFilms, pages, settings } from "@/lib/db/schema";
import az from "@/lib/i18n/dictionaries/az.json";
import de from "@/lib/i18n/dictionaries/de.json";
import en from "@/lib/i18n/dictionaries/en.json";
import ru from "@/lib/i18n/dictionaries/ru.json";
import { localeHeader } from "@/lib/i18n/request-locale";
import { publicPathExists } from "@/lib/public/exists";
import { getHero } from "@/lib/public/home";
import { heroFilmManifestKey } from "@/lib/validation/hero-films";
import { proxy } from "@/proxy";

import { testRun } from "./support/admin";
import { ensureBucket } from "./support/storage";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

const { run } = testRun();
const origin = "http://localhost:3000";
const prefix = `film/test-${run}/v3`;
const pageSlug = { az: `test-${run}-sehife`, ru: null, en: null, de: `test-${run}-seite` };

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});

let snapshot: typeof settings.$inferSelect | undefined;
let filmId = "";
let pageId = "";

beforeAll(async () => {
  await ensureBucket();
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: heroFilmManifestKey(prefix),
      ContentType: "application/json",
      Body: JSON.stringify({
        version: 3,
        format: "avif",
        tiers: {
          desktop: { width: 1600, height: 900, count: 300 },
          mobile: { width: 540, height: 960, count: 240 },
        },
        posters: {
          desktop: { key: `${prefix}/poster-desktop.jpg`, width: 1920, height: 1080 },
          mobile: { key: `${prefix}/poster-mobile.jpg`, width: 540, height: 960 },
        },
      }),
    }),
  );
  const [film] = await getDb()
    .insert(heroFilms)
    .values({
      name: `Film ${run}`,
      keyPrefix: prefix,
      frameCount: 300,
      frameWidth: 1600,
      frameHeight: 900,
      format: "avif",
    })
    .returning({ id: heroFilms.id });
  filmId = film?.id ?? "";
  [snapshot] = await getDb().select().from(settings).where(eq(settings.id, 1));
  const hero = {
    headline: { az: "Başlıq", ru: null, en: null, de: "Überschrift" },
    subline: null,
    ctaLabel: null,
    ctaHref: null,
    filmId,
  };
  await getDb()
    .insert(settings)
    .values({ id: 1, hero })
    .onConflictDoUpdate({ target: settings.id, set: { hero } });
  const [page] = await getDb()
    .insert(pages)
    .values({ slug: pageSlug, title: { az: "Test" }, status: "published" })
    .returning({ id: pages.id });
  pageId = page?.id ?? "";
});

afterAll(async () => {
  await getDb()
    .update(settings)
    .set({ hero: snapshot?.hero ?? null })
    .where(eq(settings.id, 1));
  if (!snapshot) await getDb().delete(settings).where(eq(settings.id, 1));
  await getDb().delete(heroFilms).where(eq(heroFilms.id, filmId));
  await getDb().delete(pages).where(eq(pages.id, pageId));
  await s3.send(
    new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: heroFilmManifestKey(prefix) }),
  );
  s3.destroy();
});

describe("hero film with two tiers", () => {
  it("reads the manifest from the bucket and builds frame and poster URLs per tier", async () => {
    const hero = await getHero("de");
    expect(hero?.headline).toBe("Überschrift");
    expect(hero?.film).toMatchObject({
      version: 3,
      format: "avif",
      frameCount: 300,
      firstFrame: `/media/${prefix}/desktop/0001.avif`,
      tiers: {
        desktop: {
          count: 300,
          width: 1600,
          height: 900,
          frames: `/media/${prefix}/desktop/{frame}.avif`,
        },
        mobile: {
          count: 240,
          width: 540,
          height: 960,
          frames: `/media/${prefix}/mobile/{frame}.avif`,
        },
      },
      poster: { src: `/media/${prefix}/poster-desktop.jpg`, width: 1920, height: 1080 },
      mobilePoster: { src: `/media/${prefix}/poster-mobile.jpg`, width: 540, height: 960 },
    });
  });
});

describe("public 404s", () => {
  it("knows which public paths exist", async () => {
    expect(await publicPathExists("az", [])).toBe(true);
    expect(await publicPathExists("de", ["mehsullar"])).toBe(true);
    expect(await publicPathExists("az", [pageSlug.az])).toBe(true);
    expect(await publicPathExists("de", [pageSlug.de])).toBe(true);
    expect(await publicPathExists("az", [`missing-${run}`])).toBe(false);
    expect(await publicPathExists("az", ["mehsul", `missing-${run}`])).toBe(false);
    expect(await publicPathExists("az", ["a", "b", "c"])).toBe(false);
  });

  it("answers a missing page with a 404 rewrite that carries the locale", async () => {
    const missing = await proxy(new NextRequest(`${origin}/de/missing-${run}`));
    expect(missing.status).toBe(404);
    expect(missing.headers.get("x-middleware-rewrite")).toBe(`${origin}/de/_/not-found`);
    expect(missing.headers.get(`x-middleware-request-${localeHeader}`)).toBe("de");

    const unprefixed = await proxy(new NextRequest(`${origin}/missing-${run}`));
    expect(unprefixed.status).toBe(404);
    expect(unprefixed.headers.get("x-middleware-rewrite")).toBe(`${origin}/az/_/not-found`);
    expect(unprefixed.headers.get(`x-middleware-request-${localeHeader}`)).toBe("az");

    const found = await proxy(new NextRequest(`${origin}/${pageSlug.az}`));
    expect(found.status).toBe(200);
    expect(found.headers.get("x-middleware-rewrite")).toBe(`${origin}/az/${pageSlug.az}`);
  });
});

describe("home copy", () => {
  it("has every hero chapter in all four languages", () => {
    for (const dict of [az, ru, en, de]) {
      for (const key of ["exterior", "threshold", "living", "kitchen"] as const) {
        expect(dict.home.chapters[key].label.length).toBeGreaterThan(2);
        expect(dict.home.chapters[key].text.length).toBeGreaterThan(10);
      }
      expect(dict.home.statement.length).toBeGreaterThan(40);
    }
  });
});

import { randomBytes, randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { getDb } from "@/lib/db";
import { heroFilms, media, products, settings } from "@/lib/db/schema";
import { getFeaturedProducts, getHero, getHomeSections } from "@/lib/public/home";
import type { HomeSectionsDto, HomeSectionsInput } from "@/lib/validation/home-sections";
import { siteHref, type SettingsDto, type SettingsInput } from "@/lib/validation/settings";

import { call, createUser, removeUsers, sessionCookie, testRun } from "./support/admin";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

const { run, domain, password } = testRun();

let owner = "";
let editor = "";
let snapshot: typeof settings.$inferSelect | undefined;
let featuredBefore: { id: string; featuredPosition: number | null }[] = [];
const mediaIds: Record<"hero" | "wide" | "tall" | "narrowTall" | "svg" | "clip", string> = {
  hero: "",
  wide: "",
  tall: "",
  narrowTall: "",
  svg: "",
  clip: "",
};
const productIds: Record<"first" | "second" | "draft" | "trashed", string> = {
  first: "",
  second: "",
  draft: "",
  trashed: "",
};

async function insertMedia(
  name: string,
  mimeType: string,
  width: number | null,
  height: number | null,
): Promise<string> {
  const extension = mimeType.split("/")[1]?.replace("+xml", "");
  const [row] = await getDb()
    .insert(media)
    .values({
      key: `tests/${run}/${name}.${extension}`,
      mimeType,
      width,
      height,
      size: 1024,
      sha256: randomBytes(32).toString("hex"),
      alt: { az: `Test ${name}` },
    })
    .returning({ id: media.id });
  return row?.id ?? "";
}

async function insertProduct(
  key: string,
  values: { status?: "draft" | "published"; deletedAt?: Date } = {},
): Promise<string> {
  const [row] = await getDb()
    .insert(products)
    .values({
      slug: { az: `home-${key}-${run}` },
      name: { az: `H-${key} - Tip` },
      status: values.status ?? "published",
      publishedAt: new Date("2026-01-01"),
      deletedAt: values.deletedAt,
    })
    .returning({ id: products.id });
  return row?.id ?? "";
}

const defaultSections: HomeSectionsInput["sections"] = [
  { key: "categories", visible: true, title: null },
  { key: "products", visible: true, title: null },
  { key: "brands", visible: true, title: null },
  { key: "clients", visible: true, title: null },
  { key: "posts", visible: true, title: null },
];

const defaultHero: HomeSectionsInput["hero"] = {
  headline: { az: `Başlıq ${run}`, ru: "", en: "", de: "" },
  subline: null,
  ctaLabel: null,
  ctaHref: "",
  filmId: "",
};

function input(overrides: Partial<HomeSectionsInput> = {}): HomeSectionsInput {
  return { hero: defaultHero, sections: defaultSections, featuredIds: [], ...overrides };
}

async function put(body: HomeSectionsInput, cookie = owner): Promise<Response> {
  return call("/api/admin/home-sections", "PUT", { cookie, body });
}

async function saved(response: Response): Promise<HomeSectionsDto> {
  expect(response.status, JSON.stringify(await response.clone().json())).toBe(200);
  return (await response.json()) as HomeSectionsDto;
}

async function fields(response: Response): Promise<Record<string, string>> {
  expect(response.status).toBe(400);
  return ((await response.json()) as { fields: Record<string, string> }).fields;
}

beforeAll(async () => {
  const db = getDb();
  [snapshot] = await db.select().from(settings).where(eq(settings.id, 1));
  featuredBefore = await db
    .select({ id: products.id, featuredPosition: products.featuredPosition })
    .from(products)
    .where(eq(products.isFeatured, true));
  const ownerUser = await createUser("owner", domain, password);
  const editorUser = await createUser("editor", domain, password);
  owner = await sessionCookie(ownerUser.email, password);
  editor = await sessionCookie(editorUser.email, password);
  mediaIds.hero = await insertMedia("hero", "image/jpeg", 2400, 1200);
  mediaIds.wide = await insertMedia("wide", "image/jpeg", 1200, 630);
  mediaIds.tall = await insertMedia("tall", "image/jpeg", 1800, 2400);
  mediaIds.narrowTall = await insertMedia("narrow-tall", "image/jpeg", 600, 900);
  mediaIds.svg = await insertMedia("logo", "image/svg+xml", null, null);
  mediaIds.clip = await insertMedia("clip", "video/mp4", null, null);
  productIds.first = await insertProduct("first");
  productIds.second = await insertProduct("second");
  productIds.draft = await insertProduct("draft", { status: "draft" });
  productIds.trashed = await insertProduct("trashed", { deletedAt: new Date() });
});

beforeEach(() => {
  vi.mocked(revalidateTag).mockClear();
});

afterAll(async () => {
  const db = getDb();
  if (snapshot) {
    const { id, ...columns } = snapshot;
    await db.update(settings).set(columns).where(eq(settings.id, id));
  } else {
    await db.delete(settings).where(eq(settings.id, 1));
  }
  await db.delete(products).where(inArray(products.id, Object.values(productIds)));
  for (const row of featuredBefore) {
    await db
      .update(products)
      .set({ isFeatured: true, featuredPosition: row.featuredPosition })
      .where(eq(products.id, row.id));
  }
  await db.delete(media).where(inArray(media.id, Object.values(mediaIds)));
  await removeUsers(domain);
});

describe("home sections API", () => {
  it("lets both roles read and save, and refuses anonymous requests", async () => {
    for (const cookie of [owner, editor]) {
      const response = await call("/api/admin/home-sections", "GET", { cookie });
      const body = await saved(response);
      expect(body.sections.map((section) => section.key)).toEqual([
        "categories",
        "products",
        "brands",
        "clients",
        "posts",
      ]);
    }
    expect((await put(input(), editor)).status).toBe(200);
    expect((await call("/api/admin/home-sections", "PUT", { body: input() })).status).toBe(401);
  });

  it("saves the section order, visibility and title overrides", async () => {
    const body = await saved(
      await put(
        input({
          sections: [
            { key: "products", visible: true, title: { az: " Yeni məhsullar ", ru: "", en: "" } },
            { key: "clients", visible: false, title: null },
            { key: "categories", visible: true, title: { az: "", ru: "Категории", en: "" } },
            { key: "brands", visible: false, title: null },
            { key: "posts", visible: true, title: { az: "", ru: "", en: "", de: "Neuigkeiten" } },
          ],
        }),
      ),
    );
    expect(body.sections).toEqual([
      {
        key: "products",
        visible: true,
        title: { az: "Yeni məhsullar", ru: null, en: null, de: null },
      },
      { key: "clients", visible: false, title: null },
      { key: "categories", visible: true, title: { az: "", ru: "Категории", en: null, de: null } },
      { key: "brands", visible: false, title: null },
      { key: "posts", visible: true, title: { az: "", ru: null, en: null, de: "Neuigkeiten" } },
    ]);
    expect(revalidateTag).toHaveBeenCalledWith("settings", { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith("catalog", { expire: 0 });

    expect(await getHomeSections("az")).toEqual([
      { key: "products", visible: true, title: "Yeni məhsullar" },
      { key: "clients", visible: false, title: null },
      { key: "categories", visible: true, title: null },
      { key: "brands", visible: false, title: null },
      { key: "posts", visible: true, title: null },
    ]);
    expect(
      (await getHomeSections("ru")).map((section) => ("title" in section ? section.title : null)),
    ).toEqual([null, null, "Категории", null, null]);
    expect(
      (await getHomeSections("de")).map((section) => ("title" in section ? section.title : null)),
    ).toEqual([null, null, null, null, "Neuigkeiten"]);
  });

  it("requires every section exactly once", async () => {
    const missing = await put(input({ sections: defaultSections.slice(0, 4) }));
    expect((await fields(missing)).sections).toBe("Bütün bölmələr bir dəfə göndərilməlidir.");
    const repeated = await put(
      input({ sections: [...defaultSections.slice(0, 4), defaultSections[0]] }),
    );
    expect((await fields(repeated)).sections).toBe("Bütün bölmələr bir dəfə göndərilməlidir.");
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("keeps the featured products in the chosen order and unfeatures the rest", async () => {
    const first = await saved(
      await put(input({ featuredIds: [productIds.second, productIds.first, productIds.draft] })),
    );
    expect(first.featured.map((product) => product.id)).toEqual([
      productIds.second,
      productIds.first,
      productIds.draft,
    ]);
    expect((await getFeaturedProducts("az")).map((product) => product.id)).toEqual([
      productIds.second,
      productIds.first,
    ]);

    const second = await saved(await put(input({ featuredIds: [productIds.first] })));
    expect(second.featured.map((product) => product.id)).toEqual([productIds.first]);
    const [unfeatured] = await getDb()
      .select({ isFeatured: products.isFeatured, featuredPosition: products.featuredPosition })
      .from(products)
      .where(eq(products.id, productIds.second));
    expect(unfeatured).toEqual({ isFeatured: false, featuredPosition: null });

    const trashed = await put(input({ featuredIds: [productIds.trashed] }));
    expect((await fields(trashed)).featuredIds).toBe(
      "Məhsullardan biri tapılmadı və ya zibil qutusundadır.",
    );
    const repeated = await put(input({ featuredIds: [productIds.first, productIds.first] }));
    expect((await fields(repeated)).featuredIds).toBe("Məhsul təkrarlanır.");
  });

  it("does not touch the hero when the general settings are saved", async () => {
    await saved(
      await put(
        input({ hero: { ...defaultHero, headline: { az: "Qalır", ru: "", en: "", de: "" } } }),
      ),
    );
    const current = (await (
      await call("/api/admin/settings", "GET", { cookie: owner })
    ).json()) as SettingsDto;
    const settingsBody: SettingsInput = {
      ...current,
      phones: current.phones.length
        ? current.phones
        : [{ label: { az: "Ofis" }, number: "(012) 526 54 23" }],
      emails: current.emails.map((address) => ({ address })),
    };
    const response = await call("/api/admin/settings", "PUT", {
      cookie: owner,
      body: settingsBody,
    });
    expect(response.status, JSON.stringify(await response.clone().json())).toBe(200);
    const after = await saved(await call("/api/admin/home-sections", "GET", { cookie: owner }));
    expect(after.hero?.headline.az).toBe("Qalır");
  });
});

type SectionInput = HomeSectionsInput["sections"][number];
type BlockInput = Extract<SectionInput, { key: "custom" }>["block"];

function custom(id: string, block: Partial<BlockInput> = {}, title = "Showroom"): SectionInput {
  return {
    key: "custom",
    id,
    visible: true,
    title: { az: title, ru: "", en: "" },
    block: {
      eyebrow: { az: "", ru: "", en: "" },
      body: null,
      linkLabel: { az: "", ru: "", en: "" },
      href: "",
      mediaKind: "none",
      mediaId: "",
      posterId: "",
      autoplay: true,
      sound: false,
      layout: "media-left",
      mediaWidth: 50,
      tone: "white",
      ...block,
    },
  };
}

const paragraph = (text: string) => ({
  type: "doc" as const,
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

describe("custom home sections", () => {
  it("saves custom sections between the built-in ones and shows them on the site", async () => {
    const id = randomUUID();
    const body = await saved(
      await put(
        input({
          sections: [
            defaultSections[0]!,
            custom(id, {
              eyebrow: { az: "Showroom", ru: "", en: "" },
              body: { az: paragraph("Bakıda 600 m² sərgi zalı."), ru: null, en: null, de: null },
              linkLabel: { az: "Ünvana bax", ru: "Адрес", en: "" },
              href: "/elaqe",
              mediaKind: "image",
              mediaId: mediaIds.wide,
              posterId: mediaIds.hero,
              layout: "media-right",
              mediaWidth: 60,
              tone: "light",
            }),
            ...defaultSections.slice(1),
          ],
        }),
      ),
    );
    expect(body.sections[1]).toEqual({
      key: "custom",
      id,
      visible: true,
      title: { az: "Showroom", ru: null, en: null, de: null },
      block: {
        eyebrow: { az: "Showroom", ru: null, en: null, de: null },
        body: { az: paragraph("Bakıda 600 m² sərgi zalı."), ru: null, en: null, de: null },
        linkLabel: { az: "Ünvana bax", ru: "Адрес", en: null, de: null },
        href: "/elaqe",
        mediaKind: "image",
        mediaId: mediaIds.wide,
        posterId: null,
        autoplay: true,
        sound: false,
        layout: "media-right",
        mediaWidth: 60,
        tone: "light",
      },
    });
    expect(body.media.map((item) => item.id)).toContain(mediaIds.wide);

    const [, section] = await getHomeSections("ru");
    expect(section).toMatchObject({
      key: "custom",
      id,
      block: {
        eyebrow: "Showroom",
        title: "Showroom",
        link: { label: "Адрес", href: "/elaqe" },
        image: { src: `/media/tests/${run}/wide.jpeg`, width: 1200, height: 630 },
        video: null,
        layout: "media-right",
        mediaWidth: 60,
        tone: "light",
      },
    });

    const inUse = await call("/api/admin/media/[id]", "DELETE", {
      cookie: owner,
      params: { id: mediaIds.wide },
    });
    expect(inUse.status).toBe(409);
    await saved(await put(input()));
  });

  it("plays an uploaded video with its poster", async () => {
    const id = randomUUID();
    await saved(
      await put(
        input({
          sections: [
            ...defaultSections,
            custom(id, {
              mediaKind: "video",
              mediaId: mediaIds.clip,
              posterId: mediaIds.hero,
              autoplay: false,
              sound: true,
              layout: "media-top",
            }),
          ],
        }),
      ),
    );
    const section = (await getHomeSections("az")).at(-1);
    expect(section).toMatchObject({
      key: "custom",
      block: {
        image: null,
        video: {
          src: `/media/tests/${run}/clip.mp4`,
          type: "video/mp4",
          autoplay: false,
          sound: true,
        },
        poster: { src: `/media/tests/${run}/hero.jpeg` },
        layout: "media-top",
      },
    });
    const background = await saved(
      await put(
        input({
          sections: [
            ...defaultSections,
            custom(randomUUID(), {
              mediaKind: "video",
              mediaId: mediaIds.clip,
              autoplay: false,
              sound: true,
              layout: "background",
            }),
          ],
        }),
      ),
    );
    expect(background.sections.at(-1)).toMatchObject({ block: { autoplay: true, sound: true } });
    await saved(await put(input()));
  });

  it("rejects incomplete or mismatched blocks", async () => {
    const wrongKind = await fields(
      await put(
        input({
          sections: [
            ...defaultSections,
            custom(randomUUID(), { mediaKind: "video", mediaId: mediaIds.wide }),
          ],
        }),
      ),
    );
    expect(wrongKind["sections.5.block.mediaId"]).toBe("Video tapılmadı.");

    const invalid = await fields(
      await put(
        input({
          sections: [
            ...defaultSections,
            custom(randomUUID(), { layout: "background" }),
            custom(randomUUID(), { linkLabel: { az: "Bax", ru: "", en: "" } }),
            custom(randomUUID(), { mediaKind: "image" }),
            custom(randomUUID(), {}, ""),
            custom(randomUUID(), { mediaWidth: 85 }),
          ],
        }),
      ),
    );
    expect(invalid["sections.5.block.layout"]).toBe("Fon düzülüşü üçün şəkil və ya video seçin.");
    expect(invalid["sections.6.block.href"]).toBe("Düymə üçün link yazın.");
    expect(invalid["sections.7.block.mediaId"]).toBe("Şəkil seçin.");
    expect(invalid["sections.8.title.az"]).toBe("Başlıq, mətn və ya media əlavə edin.");
    expect(invalid["sections.9.block.mediaWidth"]).toBe("Ən çox 70% ola bilər.");

    const tooMany = Array.from({ length: 13 }, () => custom(randomUUID()));
    expect(
      (await fields(await put(input({ sections: [...defaultSections, ...tooMany] })))).sections,
    ).toBe("Ən çox 12 əlavə bölmə ola bilər.");
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("home hero", () => {
  it("saves the hero text, link and film and shows it on the site in every locale", async () => {
    const [film] = await getDb()
      .insert(heroFilms)
      .values({
        name: `Film ${run}`,
        keyPrefix: `tests/${run}/film`,
        frameCount: 120,
        frameWidth: 1920,
        frameHeight: 1080,
        format: "webp",
        posterId: mediaIds.hero,
      })
      .returning({ id: heroFilms.id });
    const body = await saved(
      await put(
        input({
          hero: {
            headline: { az: "Başlıq", ru: "Заголовок", en: "", de: "Überschrift" },
            subline: { az: "Alt mətn", ru: "", en: "", de: "" },
            ctaLabel: { az: "Məhsullar", ru: "", en: "", de: "Produkte" },
            ctaHref: "/mehsullar",
            filmId: film?.id ?? "",
          },
        }),
      ),
    );
    expect(body.hero).toEqual({
      headline: { az: "Başlıq", ru: "Заголовок", en: null, de: "Überschrift" },
      subline: { az: "Alt mətn", ru: null, en: null, de: null },
      ctaLabel: { az: "Məhsullar", ru: null, en: null, de: "Produkte" },
      ctaHref: "/mehsullar",
      filmId: film?.id,
    });
    expect(body.films.map((item) => item.id)).toContain(film?.id);

    expect(await getHero("de")).toMatchObject({
      headline: "Überschrift",
      subline: "Alt mətn",
      cta: { label: "Produkte", href: "/de/mehsullar" },
      film: {
        frameCount: 120,
        width: 1920,
        height: 1080,
        format: "webp",
        firstFrame: `/media/tests/${run}/film/0001.webp`,
        framePattern: `/media/tests/${run}/film/{frame}.webp`,
        poster: { src: `/media/tests/${run}/hero.jpeg` },
      },
    });
    expect(await getHero("en")).toMatchObject({
      headline: "Başlıq",
      cta: { href: "/en/mehsullar" },
    });

    const removed = await call("/api/admin/hero-films/[id]", "DELETE", {
      cookie: owner,
      params: { id: film?.id ?? "" },
    });
    expect(removed.status).toBe(204);
    const after = await saved(await call("/api/admin/home-sections", "GET", { cookie: owner }));
    expect(after.hero?.filmId).toBeNull();
  });

  it("validates the hero text, button and film", async () => {
    const missing = await fields(
      await put(input({ hero: { ...defaultHero, headline: { az: "", ru: "", en: "", de: "" } } })),
    );
    expect(missing["hero.headline.az"]).toBe("Hero başlığını yazın.");
    const noLink = await fields(
      await put(input({ hero: { ...defaultHero, ctaLabel: { az: "Bax" } } })),
    );
    expect(noLink["hero.ctaHref"]).toBe("Düymə üçün link yazın.");
    const noFilm = await fields(
      await put(
        input({ hero: { ...defaultHero, filmId: "00000000-0000-4000-8000-000000000000" } }),
      ),
    );
    expect(noFilm["hero.filmId"]).toBe("Film tapılmadı.");
    expect(siteHref.safeParse("http://example.com").success).toBe(false);
    expect(siteHref.safeParse("/mehsullar").success).toBe(true);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

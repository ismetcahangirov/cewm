import { randomBytes, randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { getDb } from "@/lib/db";
import { media, products, settings } from "@/lib/db/schema";
import { getFeaturedProducts, getHeroSlides, getHomeSections } from "@/lib/public/home";
import type { HomeSectionsDto, HomeSectionsInput } from "@/lib/validation/home-sections";
import { heroSlideHref, type SettingsDto, type SettingsInput } from "@/lib/validation/settings";

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
  { key: "projects", visible: true, title: null },
  { key: "logos", visible: true, title: null },
];

function input(overrides: Partial<HomeSectionsInput> = {}): HomeSectionsInput {
  return { heroSlides: [], sections: defaultSections, featuredIds: [], ...overrides };
}

function slide(imageId: string, title: string): HomeSectionsInput["heroSlides"][number] {
  return { imageId, title: { az: title, ru: "", en: "" }, lead: null, href: "" };
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
        "projects",
        "logos",
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
            { key: "logos", visible: false, title: { az: "Yox", ru: "", en: "" } },
            { key: "categories", visible: true, title: { az: "", ru: "Категории", en: "" } },
            { key: "projects", visible: false, title: null },
          ],
        }),
      ),
    );
    expect(body.sections).toEqual([
      { key: "products", visible: true, title: { az: "Yeni məhsullar", ru: null, en: null } },
      { key: "logos", visible: false, title: null },
      { key: "categories", visible: true, title: { az: "", ru: "Категории", en: null } },
      { key: "projects", visible: false, title: null },
    ]);
    expect(revalidateTag).toHaveBeenCalledWith("settings", { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith("catalog", { expire: 0 });

    expect(await getHomeSections("az")).toEqual([
      { key: "products", visible: true, title: "Yeni məhsullar" },
      { key: "logos", visible: false, title: null },
      { key: "categories", visible: true, title: null },
      { key: "projects", visible: false, title: null },
    ]);
    expect(
      (await getHomeSections("ru")).map((section) => ("title" in section ? section.title : null)),
    ).toEqual([null, null, "Категории", null]);
  });

  it("requires every section exactly once", async () => {
    const missing = await put(input({ sections: defaultSections.slice(0, 3) }));
    expect((await fields(missing)).sections).toBe("Bütün bölmələr bir dəfə göndərilməlidir.");
    const repeated = await put(
      input({ sections: [...defaultSections.slice(0, 3), defaultSections[0]] }),
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

  it("does not touch the slides when the general settings are saved", async () => {
    await saved(await put(input({ heroSlides: [slide(mediaIds.hero, "Qalır")] })));
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
    expect(after.heroSlides.map((item) => item.title.az)).toEqual(["Qalır"]);
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
              body: { az: paragraph("Bakıda 600 m² sərgi zalı."), ru: null, en: null },
              linkLabel: { az: "Ünvana bax", ru: "Адрес", en: "" },
              href: "/elaqe",
              mediaKind: "image",
              mediaId: mediaIds.wide,
              posterId: mediaIds.hero,
              layout: "media-right",
              mediaWidth: 60,
              tone: "cream",
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
      title: { az: "Showroom", ru: null, en: null },
      block: {
        eyebrow: { az: "Showroom", ru: null, en: null },
        body: { az: paragraph("Bakıda 600 m² sərgi zalı."), ru: null, en: null },
        linkLabel: { az: "Ünvana bax", ru: "Адрес", en: null },
        href: "/elaqe",
        mediaKind: "image",
        mediaId: mediaIds.wide,
        posterId: null,
        autoplay: true,
        sound: false,
        layout: "media-right",
        mediaWidth: 60,
        tone: "cream",
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
        tone: "cream",
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
    expect(wrongKind["sections.4.block.mediaId"]).toBe("Video tapılmadı.");

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
    expect(invalid["sections.4.block.layout"]).toBe("Fon düzülüşü üçün şəkil və ya video seçin.");
    expect(invalid["sections.5.block.href"]).toBe("Düymə üçün link yazın.");
    expect(invalid["sections.6.block.mediaId"]).toBe("Şəkil seçin.");
    expect(invalid["sections.7.title.az"]).toBe("Başlıq, mətn və ya media əlavə edin.");
    expect(invalid["sections.8.block.mediaWidth"]).toBe("Ən çox 70% ola bilər.");

    const tooMany = Array.from({ length: 13 }, () => custom(randomUUID()));
    expect(
      (await fields(await put(input({ sections: [...defaultSections, ...tooMany] })))).sections,
    ).toBe("Ən çox 12 əlavə bölmə ola bilər.");
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("home hero slides", () => {
  it("saves slides in order, normalises them and returns their images", async () => {
    const body = await saved(
      await put(
        input({
          heroSlides: [
            {
              imageId: mediaIds.hero,
              title: { az: " Ofis mebeli ", ru: "Офисная мебель", en: "" },
              lead: { az: "Layihədən quraşdırmaya qədər.", ru: "", en: "" },
              href: "/mehsullar",
            },
            {
              imageId: mediaIds.hero,
              title: { az: "Layihələr", ru: "", en: "" },
              lead: { az: "", ru: "", en: "" },
              href: "https://mebline.az/layiheler",
            },
            slide(mediaIds.hero, "Kataloq"),
          ],
        }),
      ),
    );
    expect(body.heroSlides).toEqual([
      {
        imageId: mediaIds.hero,
        mobileImageId: null,
        title: { az: "Ofis mebeli", ru: "Офисная мебель", en: null },
        lead: { az: "Layihədən quraşdırmaya qədər.", ru: null, en: null },
        href: "/mehsullar",
      },
      {
        imageId: mediaIds.hero,
        mobileImageId: null,
        title: { az: "Layihələr", ru: null, en: null },
        lead: null,
        href: "https://mebline.az/layiheler",
      },
      {
        imageId: mediaIds.hero,
        mobileImageId: null,
        title: { az: "Kataloq", ru: null, en: null },
        lead: null,
        href: null,
      },
    ]);
    expect(body.media.map((item) => item.id)).toContain(mediaIds.hero);

    const again = await saved(await call("/api/admin/home-sections", "GET", { cookie: editor }));
    expect(again.heroSlides).toEqual(body.heroSlides);

    const inUse = await call("/api/admin/media/[id]", "DELETE", {
      cookie: owner,
      params: { id: mediaIds.hero },
    });
    expect(inUse.status).toBe(409);

    expect((await saved(await put(input()))).heroSlides).toEqual([]);
  });

  it("allows at most three slides", async () => {
    const four = Array.from({ length: 4 }, (_, index) => slide(mediaIds.hero, `Slayd ${index}`));
    const response = await put(input({ heroSlides: four }));
    expect((await fields(response)).heroSlides).toBe("Ən çox 3 slayd ola bilər.");
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("requires a landscape raster image at least 1600 px wide", async () => {
    const result = await fields(
      await put(
        input({
          heroSlides: [
            slide(mediaIds.wide, "Dar"),
            slide(mediaIds.tall, "Şaquli"),
            slide(mediaIds.svg, "Vektor"),
          ],
        }),
      ),
    );
    expect(result).toEqual({
      "heroSlides.0.imageId":
        "Slayd şəklinin eni ən azı 1600 px olmalıdır. Bu şəklin eni 1200 px-dir.",
      "heroSlides.1.imageId":
        "Slayd şəkli üfüqi olmalıdır: eni hündürlüyündən böyük. Bu şəkil 1800 × 2400 px-dir.",
      "heroSlides.2.imageId": "JPG, PNG və ya WebP şəkil seçin.",
    });

    const missing = await fields(await put(input({ heroSlides: [slide(randomUUID(), "Yox")] })));
    expect(missing).toEqual({ "heroSlides.0.imageId": "Şəkil tapılmadı." });
  });

  it("serves an optional portrait image to phones", async () => {
    const body = await saved(
      await put(
        input({ heroSlides: [{ ...slide(mediaIds.hero, "Mobil"), mobileImageId: mediaIds.tall }] }),
      ),
    );
    expect(body.heroSlides[0]?.mobileImageId).toBe(mediaIds.tall);
    expect(body.media.map((item) => item.id)).toEqual(
      expect.arrayContaining([mediaIds.hero, mediaIds.tall]),
    );

    const [hero] = await getHeroSlides("az");
    expect(hero?.image.src).toContain(`tests/${run}/hero.jpeg`);
    expect(hero?.mobileImage).toMatchObject({ width: 1800, height: 2400 });
    expect(hero?.mobileImage?.src).toContain(`tests/${run}/tall.jpeg`);

    const result = await fields(
      await put(
        input({
          heroSlides: [
            { ...slide(mediaIds.hero, "Üfüqi"), mobileImageId: mediaIds.wide },
            { ...slide(mediaIds.hero, "Dar"), mobileImageId: mediaIds.narrowTall },
          ],
        }),
      ),
    );
    expect(result).toEqual({
      "heroSlides.0.mobileImageId":
        "Mobil şəkil şaquli olmalıdır: hündürlüyü enindən böyük. Bu şəkil 1200 × 630 px-dir.",
      "heroSlides.1.mobileImageId":
        "Mobil şəklin eni ən azı 900 px olmalıdır. Bu şəklin eni 600 px-dir.",
    });

    expect((await saved(await put(input()))).heroSlides).toEqual([]);
  });

  it("validates slide text and links", async () => {
    const result = await fields(
      await put(
        input({
          heroSlides: [
            {
              imageId: "",
              title: { az: "", ru: "", en: "" },
              lead: { az: "a".repeat(201) },
              href: "javascript:alert(1)",
            },
            { ...slide(mediaIds.hero, "b".repeat(81)), href: "//evil.example" },
          ],
        }),
      ),
    );
    expect(Object.keys(result).sort()).toEqual([
      "heroSlides.0.href",
      "heroSlides.0.imageId",
      "heroSlides.0.lead.az",
      "heroSlides.0.title.az",
      "heroSlides.1.href",
      "heroSlides.1.title.az",
    ]);

    for (const value of ["/", "/mehsullar/ofis-kursuleri?sort=new#top", "https://mebline.az/x"]) {
      expect(heroSlideHref.parse(value), value).toBe(value);
    }
    for (const value of ["", null, undefined]) expect(heroSlideHref.parse(value)).toBeNull();
    for (const value of ["http://mebline.az", "mehsullar", "/ bad", "/\\evil", "mailto:a@b.c"]) {
      expect(heroSlideHref.safeParse(value).success, value).toBe(false);
    }
  });
});

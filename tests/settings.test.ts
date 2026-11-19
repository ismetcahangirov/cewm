import { randomBytes, randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { mailtoHref, telHref, whatsappHref } from "@/lib/contact-links";
import { getDb } from "@/lib/db";
import { media, settings } from "@/lib/db/schema";
import { getSiteSettings, toSiteSettings } from "@/lib/public/settings";
import { organizationJsonLd, serializeJsonLd } from "@/lib/seo/json-ld";
import {
  legalNameWithoutMmc,
  settingsInputSchema,
  type SettingsDto,
  type SettingsInput,
} from "@/lib/validation/settings";

import { call, createUser, removeUsers, sessionCookie, testRun } from "./support/admin";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

const { run, domain, password } = testRun();
const siteUrl = "https://cewm.az";

let owner = "";
let editor = "";
let snapshot: typeof settings.$inferSelect | undefined;
const mediaIds: Record<"square" | "wide" | "pdf" | "svg", string> = {
  square: "",
  wide: "",
  pdf: "",
  svg: "",
};

async function insertMedia(
  name: string,
  mimeType: string,
  width: number | null,
  height: number | null,
): Promise<string> {
  const extension = mimeType === "application/pdf" ? "pdf" : mimeType.split("/")[1];
  const [row] = await getDb()
    .insert(media)
    .values({
      key: `tests/${run}/${name}.${extension?.replace("+xml", "")}`,
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

function input(overrides: Partial<SettingsInput> = {}): SettingsInput {
  return {
    logoLightId: mediaIds.svg,
    logoDarkId: mediaIds.wide,
    faviconId: mediaIds.square,
    phones: [
      { label: { az: "Ofis", ru: "Офис", en: "" }, number: "(012) 526 54 23" },
      { label: { az: "Mobil" }, number: "+994 55 255 54 23" },
    ],
    emails: [{ address: " Office@CEWM.az " }, { address: "sales@cewm.az" }],
    address: { az: "Ağ Şəhər, Bakı", ru: "", en: "Ag Seher, Baku" },
    mapUrl: "https://maps.google.com/?cid=1",
    workingHours: { az: "B.e.–Cümə: 09:00–18:00", ru: "", en: "" },
    whatsappNumber: "+994 55 255 54 23",
    socials: [
      { network: "instagram", url: "https://www.instagram.com/cewm.az" },
      { network: "facebook", url: "https://www.facebook.com/cewm.az" },
    ],
    seoTitle: { az: `CEWM ${run}`, ru: "", en: "" },
    seoDescription: { az: "Ofis mebeli", ru: "", en: "" },
    ogImageId: mediaIds.wide,
    legalName: "CEWM",
    consultationNotifyEmail: "",
    catalogueFileId: mediaIds.pdf,
    ...overrides,
  };
}

async function put(body: SettingsInput, cookie = owner): Promise<Response> {
  return call("/api/admin/settings", "PUT", { cookie, body });
}

async function fields(response: Response): Promise<Record<string, string>> {
  expect(response.status).toBe(400);
  return ((await response.json()) as { fields: Record<string, string> }).fields;
}

beforeAll(async () => {
  [snapshot] = await getDb().select().from(settings).where(eq(settings.id, 1));
  const ownerUser = await createUser("owner", domain, password);
  const editorUser = await createUser("editor", domain, password);
  owner = await sessionCookie(ownerUser.email, password);
  editor = await sessionCookie(editorUser.email, password);
  mediaIds.square = await insertMedia("favicon", "image/png", 512, 512);
  mediaIds.wide = await insertMedia("wide", "image/jpeg", 1200, 630);
  mediaIds.pdf = await insertMedia("catalogue", "application/pdf", null, null);
  mediaIds.svg = await insertMedia("logo", "image/svg+xml", null, null);
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
  await db.delete(media).where(inArray(media.id, Object.values(mediaIds)));
  await removeUsers(domain);
});

describe("settings API", () => {
  it("lets the owner read the settings and keeps editors out", async () => {
    const response = await call("/api/admin/settings", "GET", { cookie: owner });
    expect(response.status).toBe(200);
    const body = (await response.json()) as SettingsDto;
    expect(Array.isArray(body.phones)).toBe(true);
    expect(body.searchIndexing).toBe(true);
    expect((await call("/api/admin/settings", "GET", { cookie: editor })).status).toBe(403);
  });

  it("saves, normalises and returns the settings, then expires the public cache", async () => {
    const response = await put(input());
    expect(response.status, JSON.stringify(await response.clone().json())).toBe(200);
    const saved = (await response.json()) as SettingsDto;
    expect(saved).toMatchObject({
      phones: [
        { label: { az: "Ofis", ru: "Офис", en: null, de: null }, number: "+994125265423" },
        { label: { az: "Mobil", ru: null, en: null, de: null }, number: "+994552555423" },
      ],
      emails: ["office@cewm.az", "sales@cewm.az"],
      address: { az: "Ağ Şəhər, Bakı", ru: null, en: "Ag Seher, Baku" },
      whatsappNumber: "994552555423",
      legalName: "CEWM",
      consultationNotifyEmail: null,
      catalogueFileId: mediaIds.pdf,
      logoLightId: mediaIds.svg,
    });
    expect(saved.media.map((item) => item.id).sort()).toEqual(
      [mediaIds.svg, mediaIds.wide, mediaIds.square, mediaIds.pdf].sort(),
    );
    expect(revalidateTag).toHaveBeenCalledWith("settings", { expire: 0 });

    const again = await call("/api/admin/settings", "GET", { cookie: owner });
    expect(await again.json()).toEqual(saved);
  });

  it("refuses an editor and keeps every language of a field on save", async () => {
    const refused = await put(
      input({ consultationNotifyEmail: `notify-${run}@cewm.test` }),
      editor,
    );
    expect(refused.status).toBe(403);

    const response = await put(
      input({
        consultationNotifyEmail: `notify-${run}@cewm.test`,
        address: {
          az: "Ağ Şəhər, Bakı",
          ru: "Ак Шехер, Баку",
          en: "White City, Baku",
          de: "Weiße Stadt, Baku",
        },
        searchIndexing: false,
      }),
    );
    expect(response.status).toBe(200);
    const saved = (await response.json()) as SettingsDto;
    expect(saved).toMatchObject({
      consultationNotifyEmail: `notify-${run}@cewm.test`,
      address: {
        az: "Ağ Şəhər, Bakı",
        ru: "Ак Шехер, Баку",
        en: "White City, Baku",
        de: "Weiße Stadt, Baku",
      },
      searchIndexing: false,
    });
    expect((await getSiteSettings()).searchIndexing).toBe(false);
  });

  it("rejects a company name with MMC", async () => {
    const response = await put(input({ legalName: "CEWM MMC" }));
    expect((await fields(response)).legalName).toContain("MMC");
    expect(revalidateTag).not.toHaveBeenCalled();

    for (const value of ["cewm mmc", "MMC CEWM", "CEWM, Mmc.", "«CEWM» MMC-si"]) {
      expect(legalNameWithoutMmc.safeParse(value).success, value).toBe(false);
    }
    for (const value of ["CEWM", "Mmcx Group", "", null]) {
      expect(legalNameWithoutMmc.safeParse(value).success, String(value)).toBe(true);
    }
  });

  it("rejects missing media and media of the wrong kind", async () => {
    const missing = await fields(await put(input({ logoLightId: randomUUID() })));
    expect(missing.logoLightId).toBe("Şəkil tapılmadı.");

    const wrong = await fields(
      await put(
        input({
          ogImageId: mediaIds.svg,
          catalogueFileId: mediaIds.square,
          logoDarkId: mediaIds.pdf,
          faviconId: mediaIds.wide,
        }),
      ),
    );
    expect(Object.keys(wrong).sort()).toEqual([
      "catalogueFileId",
      "faviconId",
      "logoDarkId",
      "ogImageId",
    ]);
  });

  it("validates contact rows", async () => {
    const empty = await fields(await put(input({ phones: [] })));
    expect(empty.phones).toBe("Ən azı bir telefon nömrəsi əlavə edin.");

    const invalid = await fields(
      await put(
        input({
          phones: [
            { label: { az: "" }, number: "123" },
            { label: { az: "A" }, number: "055 255 54 23" },
            { label: { az: "B" }, number: "+994552555423" },
          ],
          emails: [{ address: "not-an-email" }],
          socials: [
            { network: "instagram", url: "http://instagram.com/cewm" },
            { network: "instagram", url: "https://instagram.com/cewm" },
          ],
          whatsappNumber: "12345",
          mapUrl: "javascript:alert(1)",
        }),
      ),
    );
    expect(Object.keys(invalid).sort()).toEqual([
      "emails.0.address",
      "mapUrl",
      "phones.0.label.az",
      "phones.0.number",
      "socials.0.url",
      "socials.1.network",
      "whatsappNumber",
    ]);

    const duplicate = await fields(
      await put(
        input({
          phones: [
            { label: { az: "A" }, number: "055 255 54 23" },
            { label: { az: "B" }, number: "+994552555423" },
          ],
        }),
      ),
    );
    expect(duplicate).toEqual({ "phones.1.number": "Bu nömrə artıq əlavə olunub." });
  });

  it("accepts empty optional fields", () => {
    const parsed = settingsInputSchema.parse(
      input({
        emails: [],
        socials: [],
        whatsappNumber: "",
        mapUrl: "",
        legalName: "",
        address: { az: "", ru: "", en: "" },
      }),
    );
    expect(parsed).toMatchObject({
      emails: [],
      whatsappNumber: null,
      mapUrl: null,
      legalName: null,
      address: null,
    });
  });
});

describe("public settings and structured data", () => {
  it("follows a phone change in settings through to the JSON-LD", async () => {
    expect((await put(input())).status).toBe(200);
    const before = organizationJsonLd(await getSiteSettings(), "az", siteUrl);
    expect(before).toMatchObject({
      "@type": "Organization",
      name: "CEWM",
      url: "https://cewm.az/",
      telephone: "+994125265423",
      email: "office@cewm.az",
      sameAs: ["https://www.instagram.com/cewm.az", "https://www.facebook.com/cewm.az"],
      address: { "@type": "PostalAddress", streetAddress: "Ağ Şəhər, Bakı", addressCountry: "AZ" },
    });
    expect(before.logo).toMatch(/^https:\/\/cewm\.az\/media\/tests\//);

    const changed = input({
      phones: [{ label: { az: "Satış", ru: "Продажи" }, number: "070 111 22 33" }],
    });
    expect((await put(changed)).status).toBe(200);
    const after = organizationJsonLd(await getSiteSettings(), "ru", siteUrl);
    expect(after.telephone).toBe("+994701112233");
    expect(after.url).toBe("https://cewm.az/ru");
    expect(after.contactPoint).toEqual([
      expect.objectContaining({ telephone: "+994701112233", name: "Продажи" }),
    ]);
    expect(after.address).toMatchObject({ streetAddress: "Ağ Şəhər, Bakı" });
  });

  it("maps a settings row to serialisable public settings", () => {
    const row = {
      id: 1,
      logoLightId: "logo",
      logoDarkId: null,
      faviconId: null,
      phones: [{ label: { az: "Ofis" }, number: "+994125265423" }],
      emails: [],
      address: null,
      mapUrl: null,
      workingHours: null,
      socials: [],
      hero: null,
      homeSections: [],
      whatsappNumber: "994552555423",
      legalName: null,
      consultationNotifyEmail: "private@cewm.az",
      seoTitle: null,
      seoDescription: null,
      ogImageId: null,
      catalogueFileId: null,
      textOverrides: {},
      searchIndexing: true,
      updatedAt: new Date(),
    };
    const mediaRow = {
      id: "logo",
      key: "uploads/2026/10/logo.png",
      mimeType: "image/png",
      width: 465,
      height: 203,
      size: 100,
      sha256: "x",
      alt: { az: "CEWM" },
      caption: null,
      lqip: null,
      originalId: null,
      cleanupStatus: null,
      cleanupNote: null,
      sourceUrl: null,
      legacyKey: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const site = toSiteSettings(row, [mediaRow]);
    expect(site.logoLight).toEqual({
      src: "/media/uploads/2026/10/logo.png",
      mimeType: "image/png",
      width: 465,
      height: 203,
      alt: { az: "CEWM" },
    });
    expect(JSON.stringify(site)).not.toContain("private@cewm.az");
    expect(JSON.parse(JSON.stringify(site))).toEqual(site);

    const first = organizationJsonLd(site, "az", siteUrl);
    const second = organizationJsonLd(
      toSiteSettings({ ...row, phones: [{ label: { az: "Ofis" }, number: "+994502223344" }] }, [
        mediaRow,
      ]),
      "az",
      siteUrl,
    );
    expect(first.telephone).toBe("+994125265423");
    expect(second.telephone).toBe("+994502223344");
    expect(first.name).toBe("CEWM");
    expect(toSiteSettings(null, [])).toMatchObject({ phones: [], logoLight: null });
  });

  it("escapes markup in serialised JSON-LD", () => {
    expect(serializeJsonLd({ "@type": "Thing", name: "</script><b>" })).toBe(
      '{"@type":"Thing","name":"\\u003c/script>\\u003cb>"}',
    );
  });
});

describe("contact links", () => {
  it("builds tel, WhatsApp and mailto links", () => {
    expect(telHref("055 255 54 23")).toBe("tel:+994552555423");
    expect(telHref("+994125265423")).toBe("tel:+994125265423");
    expect(whatsappHref("994552555423")).toBe("https://wa.me/994552555423");
    expect(whatsappHref("+994 55 255 54 23")).toBe("https://wa.me/994552555423");
    expect(whatsappHref("055 255 54 23", "Salam")).toBe("https://wa.me/994552555423?text=Salam");
    expect(mailtoHref("office@cewm.az")).toBe("mailto:office@cewm.az");
    expect(mailtoHref("office@cewm.az", "Təklif")).toBe(
      "mailto:office@cewm.az?subject=T%C9%99klif",
    );
  });
});

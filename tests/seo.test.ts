import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { buildRobots } from "@/lib/seo/robots";
import { getDb } from "@/lib/db";
import {
  categories,
  media,
  pages,
  posts,
  productCategories,
  productImages,
  products,
} from "@/lib/db/schema";
import type { SiteSettings } from "@/lib/public/settings";
import {
  breadcrumbJsonLd,
  businessJsonLd,
  localBusinessJsonLd,
  productJsonLd,
} from "@/lib/seo/json-ld";
import { pageMetadata, paginatedPaths, paginatedText } from "@/lib/seo/metadata";
import { buildLlmsTxt, getLlmsSource } from "@/lib/seo/llms";
import { buildSitemap, querySitemapSource } from "@/lib/seo/sitemap";

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));

vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  connection: async () => undefined,
}));

const siteUrl = "https://cewm.example";
const paths = {
  az: "/mehsul/masa",
  ru: "/ru/mehsul/stol",
  en: "/en/mehsul/desk",
  de: "/de/mehsul/tisch",
};

describe("page metadata", () => {
  it("sets canonical, hreflang alternates with x-default and a large Twitter card", () => {
    const metadata = pageMetadata({
      locale: "ru",
      title: "Стол",
      description: "  Рабочий стол  ",
      paths,
      image: { src: "/media/stol.jpg", width: 800, height: 600, alt: "Стол" },
    });
    expect(metadata.alternates?.canonical).toBe("/ru/mehsul/stol");
    expect(metadata.alternates?.languages).toEqual({ ...paths, "x-default": "/mehsul/masa" });
    expect(metadata.description).toBe("Рабочий стол");
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Стол",
      description: "Рабочий стол",
    });
    expect(metadata.openGraph).toMatchObject({
      url: "/ru/mehsul/stol",
      locale: "ru_RU",
      alternateLocale: ["az_AZ", "en_US", "de_DE"],
      siteName: "CEWM",
    });
  });

  it("leaves the image out and uses a small Twitter card when the page has none", () => {
    const metadata = pageMetadata({ locale: "de", title: "Tisch", paths });
    expect(metadata.openGraph).not.toHaveProperty("images");
    expect(metadata.twitter).toMatchObject({ card: "summary", title: "Tisch" });
    expect(metadata.alternates?.canonical).toBe("/de/mehsul/tisch");
  });

  it("prefers the page's own image and falls back to the title for its alt text", () => {
    const metadata = pageMetadata({
      locale: "az",
      title: "Masa",
      paths,
      image: { src: "/media/masa.jpg", width: 800, height: 600, alt: "" },
      absoluteTitle: true,
    });
    expect(metadata.title).toEqual({ absolute: "Masa" });
    expect(metadata.openGraph?.images).toEqual([
      { url: "/media/masa.jpg", alt: "Masa", width: 800, height: 600 },
    ]);
  });

  it("keeps paginated pages self-canonical with a page suffix", () => {
    expect(paginatedPaths(paths, 1)).toBe(paths);
    expect(paginatedPaths(paths, 3)).toEqual({
      az: "/mehsul/masa?page=3",
      ru: "/ru/mehsul/stol?page=3",
      en: "/en/mehsul/desk?page=3",
      de: "/de/mehsul/tisch?page=3",
    });
    expect(paginatedText("Masalar.", 1, "Səhifə 1")).toBe("Masalar.");
    expect(paginatedText("Masalar.", 2, "Səhifə 2")).toBe("Masalar – Səhifə 2");
  });
});

const settings: SiteSettings = {
  logoLight: { src: "/media/logo.svg", mimeType: "image/svg+xml", width: 1, height: 1, alt: null },
  logoDark: null,
  favicon: null,
  ogImage: null,
  catalogueFile: null,
  phones: [{ label: { az: "Ofis" }, number: "+994125265423" }],
  emails: ["office@cewm.az"],
  address: { az: "Bakı, Yaşıl ada küç. 7", ru: "Баку, ул. Яшыл ада 7" },
  mapUrl: "https://maps.google.com/?cid=1",
  workingHours: null,
  whatsappNumber: null,
  socials: [{ network: "instagram", url: "https://www.instagram.com/cewm.az" }],
  legalName: "CEWM",
  seoTitle: null,
  seoDescription: null,
  searchIndexing: true,
};

describe("JSON-LD builders", () => {
  it("describes a product with its brand and specifications", () => {
    const data = productJsonLd(
      {
        name: "Masa",
        url: "/mehsul/masa",
        images: ["/media/masa.jpg"],
        description: "İş masası",
        category: "Masalar",
        sku: "M-1",
        brand: "HOMAG",
        specs: [{ name: "Kəsmə uzunluğu", value: "3200 mm" }],
      },
      siteUrl,
    );
    expect(data).toMatchObject({
      "@type": "Product",
      "@id": `${siteUrl}/mehsul/masa#product`,
      url: `${siteUrl}/mehsul/masa`,
      image: [`${siteUrl}/media/masa.jpg`],
      description: "İş masası",
      category: "Masalar",
      sku: "M-1",
      brand: { "@type": "Brand", name: "HOMAG" },
      additionalProperty: [{ "@type": "PropertyValue", name: "Kəsmə uzunluğu", value: "3200 mm" }],
      offers: { "@type": "Offer", seller: { "@id": `${siteUrl}/#organization` } },
    });
    expect(JSON.stringify(data)).not.toContain("price");
  });

  it("builds a LocalBusiness from Settings in the page locale", () => {
    const store = localBusinessJsonLd(settings, "ru", siteUrl);
    expect(store).toMatchObject({
      "@type": "LocalBusiness",
      "@id": `${siteUrl}/#store`,
      url: `${siteUrl}/ru`,
      telephone: "+994125265423",
      email: "office@cewm.az",
      hasMap: "https://maps.google.com/?cid=1",
      image: `${siteUrl}/media/logo.svg`,
      address: { streetAddress: "Баку, ул. Яшыл ада 7", addressCountry: "AZ" },
      parentOrganization: { "@id": `${siteUrl}/#organization` },
      sameAs: ["https://www.instagram.com/cewm.az"],
    });
  });

  it("emits only the Organization when Settings has no address", () => {
    expect(localBusinessJsonLd({ ...settings, address: null }, "az", siteUrl)).toBeNull();
    const nodes = businessJsonLd({ ...settings, address: null }, "az", siteUrl);
    expect(nodes.map((node) => node["@type"])).toEqual(["Organization"]);
    expect(businessJsonLd(settings, "az", siteUrl).map((node) => node["@type"])).toEqual([
      "Organization",
      "LocalBusiness",
    ]);
  });

  it("lists breadcrumbs with absolute URLs", () => {
    expect(
      breadcrumbJsonLd([{ label: "Ana səhifə", href: "/" }, { label: "Masa" }], siteUrl),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana səhifə", item: `${siteUrl}/` },
        { "@type": "ListItem", position: 2, name: "Masa" },
      ],
    });
  });
});

describe("robots.txt", () => {
  it("allows the site, keeps crawlers out of admin and API and names the sitemap", () => {
    const result = buildRobots(true);
    expect(result.rules).toEqual([{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }]);
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it("keeps every crawler out while indexing is switched off", () => {
    expect(buildRobots(false).rules).toEqual([{ userAgent: "*", disallow: "/" }]);
  });
});

describe("sitemap", () => {
  const run = randomUUID().slice(0, 8);
  const slug = (name: string) => `seo-${name}-${run}`;
  const created = {
    media: [] as string[],
    categories: [] as string[],
    products: [] as string[],
    pages: [] as string[],
    posts: [] as string[],
  };
  let entries: MetadataRoute.Sitemap = [];
  const urls = () => entries.map((entry) => entry.url);
  const absolute = (path: string) => new URL(path, siteUrl).toString();

  beforeAll(async () => {
    const db = getDb();
    const [image] = await db
      .insert(media)
      .values({
        key: `test/${run}/seo.jpg`,
        mimeType: "image/jpeg",
        width: 800,
        height: 600,
        size: 1000,
        sha256: randomUUID(),
      })
      .returning({ id: media.id });
    created.media.push(image.id);

    const categoryRows = await db
      .insert(categories)
      .values([
        { slug: { az: slug("cat"), ru: slug("cat-ru") }, name: { az: "Kateqoriya" } },
        { slug: { az: slug("hidden-cat") }, name: { az: "Gizli" }, isActive: false },
      ])
      .returning({ id: categories.id });
    created.categories.push(...categoryRows.map((row) => row.id));
    const [active, hidden] = created.categories;

    const productRows = await db
      .insert(products)
      .values([
        {
          slug: { az: slug("live"), en: slug("live-en") },
          name: { az: "Canlı" },
          status: "published",
        },
        { slug: { az: slug("draft") }, name: { az: "Qaralama" }, status: "draft" },
        {
          slug: { az: slug("deleted") },
          name: { az: "Silinmiş" },
          status: "published",
          deletedAt: new Date(),
        },
        { slug: { az: slug("hidden") }, name: { az: "Gizli" }, status: "published" },
      ])
      .returning({ id: products.id });
    created.products.push(...productRows.map((row) => row.id));
    const [live, , , inHidden] = created.products;
    await db.insert(productCategories).values([
      { productId: live, categoryId: active },
      { productId: inHidden, categoryId: hidden },
    ]);
    await db.insert(productImages).values({ productId: live, mediaId: image.id, position: 0 });

    const pageRows = await db
      .insert(pages)
      .values([
        { slug: { az: slug("page") }, title: { az: "Səhifə" }, status: "published" },
        { slug: { az: slug("page-draft") }, title: { az: "Səhifə" }, status: "draft" },
      ])
      .returning({ id: pages.id });
    created.pages.push(...pageRows.map((row) => row.id));

    const postRows = await db
      .insert(posts)
      .values([
        {
          slug: { az: slug("post") },
          title: { az: "Yazı" },
          status: "published",
          publishedAt: new Date(Date.now() - 60_000),
        },
        {
          slug: { az: slug("post-future") },
          title: { az: "Gələcək" },
          status: "published",
          publishedAt: new Date(Date.now() + 86_400_000),
        },
        { slug: { az: slug("post-draft") }, title: { az: "Qaralama" }, status: "draft" },
      ])
      .returning({ id: posts.id });
    created.posts.push(...postRows.map((row) => row.id));

    entries = buildSitemap(await querySitemapSource(), siteUrl);
  });

  afterAll(async () => {
    const db = getDb();
    if (created.posts.length) await db.delete(posts).where(inArray(posts.id, created.posts));
    if (created.pages.length) await db.delete(pages).where(inArray(pages.id, created.pages));
    if (created.products.length)
      await db.delete(products).where(inArray(products.id, created.products));
    if (created.categories.length)
      await db.delete(categories).where(inArray(categories.id, created.categories));
    if (created.media.length) await db.delete(media).where(inArray(media.id, created.media));
  });

  it("lists every published page in all four locales", () => {
    const all = urls();
    for (const path of [
      "/",
      "/ru",
      "/en",
      "/mehsullar",
      "/ru/mehsullar",
      "/kateqoriyalar",
      "/en/kateqoriyalar",
      `/mehsullar/${slug("cat")}`,
      `/ru/mehsullar/${slug("cat-ru")}`,
      `/en/mehsullar/${slug("cat")}`,
      `/mehsul/${slug("live")}`,
      `/ru/mehsul/${slug("live")}`,
      `/en/mehsul/${slug("live-en")}`,
      `/de/mehsul/${slug("live")}`,
      "/de",
      `/en/${slug("page")}`,
      "/ru/bloq",
      `/bloq/${slug("post")}`,
    ]) {
      expect(all, path).toContain(absolute(path));
    }
  });

  it("leaves out drafts, deleted, scheduled and hidden content", () => {
    const listed = urls().join("\n");
    for (const name of [
      "draft",
      "deleted",
      "hidden",
      "hidden-cat",
      "page-draft",
      "post-future",
      "post-draft",
    ]) {
      expect(listed).not.toContain(`/${slug(name)}`);
    }
  });

  it("links the language versions and carries lastModified and images", () => {
    const entry = entries.find((item) => item.url === absolute(`/ru/mehsul/${slug("live")}`));
    expect(entry?.alternates?.languages).toEqual({
      az: absolute(`/mehsul/${slug("live")}`),
      ru: absolute(`/ru/mehsul/${slug("live")}`),
      en: absolute(`/en/mehsul/${slug("live-en")}`),
      de: absolute(`/de/mehsul/${slug("live")}`),
      "x-default": absolute(`/mehsul/${slug("live")}`),
    });
    expect(typeof entry?.lastModified).toBe("string");
    expect(entry?.images).toEqual([absolute(`/media/test/${run}/seo.jpg`)]);
  });
});

describe("llms.txt", () => {
  const run = randomUUID().slice(0, 8);
  const slug = (name: string) => `llms-${name}-${run}`;
  const created = { categories: [] as string[], pages: [] as string[] };
  let text = "";

  beforeAll(async () => {
    const db = getDb();
    const categoryRows = await db
      .insert(categories)
      .values([
        { slug: { az: slug("cat") }, name: { az: "Görünən kateqoriya" } },
        { slug: { az: slug("hidden") }, name: { az: "Gizli" }, isActive: false },
      ])
      .returning({ id: categories.id });
    created.categories.push(...categoryRows.map((row) => row.id));
    const pageRows = await db
      .insert(pages)
      .values([
        { slug: { az: slug("page") }, title: { az: "Dərc olunmuş" }, status: "published" },
        { slug: { az: slug("draft") }, title: { az: "Qaralama" }, status: "draft" },
      ])
      .returning({ id: pages.id });
    created.pages.push(...pageRows.map((row) => row.id));
    text = buildLlmsTxt(await getLlmsSource(), siteUrl);
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(pages).where(inArray(pages.id, created.pages));
    await db.delete(categories).where(inArray(categories.id, created.categories));
  });

  it("starts with the site name and summary", () => {
    expect(text).toMatch(/^# \S.*\n\n> \S/);
  });

  it("lists active categories and published pages with absolute links", () => {
    expect(text).toContain(`- [Görünən kateqoriya](${siteUrl}/mehsullar/${slug("cat")})`);
    expect(text).toContain(`- [Dərc olunmuş](${siteUrl}/${slug("page")})`);
    expect(text).toContain(`- en: ${siteUrl}/en`);
    expect(text).toContain(`- de: ${siteUrl}/de`);
  });

  it("leaves out inactive categories and drafts", () => {
    expect(text).not.toContain(slug("hidden"));
    expect(text).not.toContain(slug("draft"));
  });
});

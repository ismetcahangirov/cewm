import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import robots from "@/app/robots";
import { getDb } from "@/lib/db";
import {
  categories,
  media,
  pages,
  posts,
  productCategories,
  productImages,
  products,
  projects,
} from "@/lib/db/schema";
import type { SiteSettings } from "@/lib/public/settings";
import {
  breadcrumbJsonLd,
  businessJsonLd,
  localBusinessJsonLd,
  productJsonLd,
} from "@/lib/seo/json-ld";
import { pageMetadata, paginatedPaths, paginatedText } from "@/lib/seo/metadata";
import { ogImageUrl, ogTitleMaxLength, verifyOgRequest } from "@/lib/seo/og";
import { renderOgPng } from "@/lib/seo/og-image";
import { buildLlmsTxt, getLlmsSource } from "@/lib/seo/llms";
import { buildSitemap, querySitemapSource } from "@/lib/seo/sitemap";

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));

const siteUrl = "https://mebline.example";
const paths = { az: "/mehsul/masa", ru: "/ru/mehsul/stol", en: "/en/mehsul/desk" };

function ogParams(url: string): URLSearchParams {
  return new URL(url, siteUrl).searchParams;
}

describe("page metadata", () => {
  it("sets canonical, hreflang alternates with x-default and a large Twitter card", () => {
    const metadata = pageMetadata({
      locale: "ru",
      title: "Стол",
      description: "  Рабочий стол  ",
      paths,
      eyebrow: "Столы",
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
      alternateLocale: ["az_AZ", "en_US"],
      siteName: "Mebline",
    });
  });

  it("uses a signed generated image when the page has no image of its own", () => {
    const metadata = pageMetadata({ locale: "az", title: "Masa", paths, eyebrow: "Masalar" });
    const [image] = metadata.openGraph?.images as { url: string; width: number }[];
    expect(image.url.startsWith("/og.png?")).toBe(true);
    expect(image.width).toBe(1200);
    expect(verifyOgRequest(ogParams(image.url))).toEqual({ eyebrow: "Masalar", title: "Masa" });
    expect(metadata.twitter).toMatchObject({ images: [{ url: image.url, alt: "Masa" }] });
  });

  it("prefers the page's own image and falls back to the title for its alt text", () => {
    const metadata = pageMetadata({
      locale: "az",
      title: "Masa",
      paths,
      eyebrow: "Masalar",
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
    });
    expect(paginatedText("Masalar.", 1, "Səhifə 1")).toBe("Masalar.");
    expect(paginatedText("Masalar.", 2, "Səhifə 2")).toBe("Masalar – Səhifə 2");
  });
});

describe("generated Open Graph images", () => {
  it("rejects tampered, unsigned or oversized text", () => {
    const params = ogParams(ogImageUrl({ eyebrow: "Kürsülər", title: "Rəhbər kürsüsü" }));
    expect(verifyOgRequest(params)).toEqual({ eyebrow: "Kürsülər", title: "Rəhbər kürsüsü" });

    const tampered = new URLSearchParams(params);
    tampered.set("t", "Başqa mətn");
    expect(verifyOgRequest(tampered)).toBeNull();

    const unsigned = new URLSearchParams(params);
    unsigned.delete("s");
    expect(verifyOgRequest(unsigned)).toBeNull();

    const long = new URLSearchParams(params);
    long.set("t", "a".repeat(ogTitleMaxLength + 1));
    expect(verifyOgRequest(long)).toBeNull();
  });

  it("shortens long titles before signing", () => {
    const params = ogParams(ogImageUrl({ eyebrow: "Bloq", title: "söz ".repeat(60) }));
    const text = verifyOgRequest(params);
    expect(text?.title.length).toBeLessThanOrEqual(ogTitleMaxLength);
    expect(text?.title.endsWith("…")).toBe(true);
  });

  it("renders a 1200x630 PNG with Azerbaijani and Cyrillic text", async () => {
    const png = await renderOgPng({ eyebrow: "Ofis mebeli", title: "Əla şüşə çəkmə – Офис" });
    expect([...png.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    expect(view.getUint32(16)).toBe(1200);
    expect(view.getUint32(20)).toBe(630);
  });
});

const settings: SiteSettings = {
  logoLight: { src: "/media/logo.svg", mimeType: "image/svg+xml", width: 1, height: 1, alt: null },
  logoDark: null,
  favicon: null,
  ogImage: null,
  catalogueFile: null,
  phones: [{ label: { az: "Ofis" }, number: "+994125265423" }],
  emails: ["office@mebline.az"],
  address: { az: "Bakı, Yaşıl ada küç. 7", ru: "Баку, ул. Яшыл ада 7" },
  mapUrl: "https://maps.google.com/?cid=1",
  workingHours: null,
  whatsappNumber: null,
  socials: [{ network: "instagram", url: "https://www.instagram.com/mebline.az" }],
  legalName: "Mebline",
  seoTitle: null,
  seoDescription: null,
};

describe("JSON-LD builders", () => {
  it("describes a product without offers", () => {
    const data = productJsonLd(
      {
        name: "Masa",
        url: "/mehsul/masa",
        images: ["/media/masa.jpg"],
        description: "İş masası",
        category: "Masalar",
        sku: "M-1",
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
      brand: { "@type": "Brand", name: "Mebline" },
    });
    expect(data).not.toHaveProperty("offers");
    expect(JSON.stringify(data)).not.toContain("offers");
  });

  it("builds a FurnitureStore from Settings in the page locale", () => {
    const store = localBusinessJsonLd(settings, "ru", siteUrl);
    expect(store).toMatchObject({
      "@type": "FurnitureStore",
      "@id": `${siteUrl}/#store`,
      url: `${siteUrl}/ru`,
      telephone: "+994125265423",
      email: "office@mebline.az",
      hasMap: "https://maps.google.com/?cid=1",
      image: `${siteUrl}/brand/logo.png`,
      address: { streetAddress: "Баку, ул. Яшыл ада 7", addressCountry: "AZ" },
      parentOrganization: { "@id": `${siteUrl}/#organization` },
      sameAs: ["https://www.instagram.com/mebline.az"],
    });
  });

  it("emits only the Organization when Settings has no address", () => {
    expect(localBusinessJsonLd({ ...settings, address: null }, "az", siteUrl)).toBeNull();
    const nodes = businessJsonLd({ ...settings, address: null }, "az", siteUrl);
    expect(nodes.map((node) => node["@type"])).toEqual(["Organization"]);
    expect(businessJsonLd(settings, "az", siteUrl).map((node) => node["@type"])).toEqual([
      "Organization",
      "FurnitureStore",
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
    const result = robots();
    expect(result.rules).toEqual([{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }]);
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});

describe("sitemap", () => {
  const run = randomUUID().slice(0, 8);
  const slug = (name: string) => `seo-${name}-${run}`;
  const created = {
    media: [] as string[],
    categories: [] as string[],
    products: [] as string[],
    projects: [] as string[],
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

    const projectRows = await db
      .insert(projects)
      .values([
        { slug: { az: slug("project") }, title: { az: "Layihə" }, status: "published" },
        { slug: { az: slug("project-draft") }, title: { az: "Layihə" }, status: "draft" },
      ])
      .returning({ id: projects.id });
    created.projects.push(...projectRows.map((row) => row.id));

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
    if (created.projects.length)
      await db.delete(projects).where(inArray(projects.id, created.projects));
    if (created.products.length)
      await db.delete(products).where(inArray(products.id, created.products));
    if (created.categories.length)
      await db.delete(categories).where(inArray(categories.id, created.categories));
    if (created.media.length) await db.delete(media).where(inArray(media.id, created.media));
  });

  it("lists every published page in all three locales", () => {
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
      "/layiheler",
      `/layiheler/${slug("project")}`,
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
      "project-draft",
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
  });

  it("leaves out inactive categories and drafts", () => {
    expect(text).not.toContain(slug("hidden"));
    expect(text).not.toContain(slug("draft"));
  });
});

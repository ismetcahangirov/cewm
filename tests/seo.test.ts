import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { SiteSettings } from "@/lib/public/settings";
import { homeOfferCatalog } from "@/lib/seo/catalog-links";
import { ogImagePath } from "@/lib/seo/config";
import { queryCorpus } from "@/lib/seo/corpus";
import { categoryFactBlock, companyFactBlock, productFactBlock } from "@/lib/seo/facts";
import { changedUrls, indexNowBody, isPublicHost, snapshotOf } from "@/lib/seo/indexnow";
import {
  aboutPageJsonLd,
  blogPostingJsonLd,
  breadcrumbJsonLd,
  businessJsonLd,
  collectionPageJsonLd,
  contactPageJsonLd,
  faqPageJsonLd,
  organizationJsonLd,
  parseAddress,
  productJsonLd,
  serializeJsonLd,
  websiteJsonLd,
  type JsonLd,
} from "@/lib/seo/json-ld";
import { buildLlmsFullTxt, buildLlmsTxt } from "@/lib/seo/llms";
import { productMarkdown, richTextToMarkdown } from "@/lib/seo/markdown";
import { resolveMarkdown } from "@/lib/seo/markdown-route";
import { pageMetadata, paginatedPaths, paginatedText } from "@/lib/seo/metadata";
import type { Corpus, CorpusProduct } from "@/lib/seo/model";
import { resolveOgCard } from "@/lib/seo/og-card";
import { buildRobots } from "@/lib/seo/robots";
import { markdownHref, markdownRewrite, normalizePathname, seoRewrite } from "@/lib/seo/rewrites";
import { rootMetadata, verificationMetadata } from "@/lib/seo/root";
import { buildSitemap, buildSitemapUrls } from "@/lib/seo/sitemap";
import { seoSettingsSchema } from "@/lib/validation/settings";
import { clampText, describeEntity, fitDescription, fitTitle } from "@/lib/seo/text";
import { validateJsonLdNode } from "@/lib/seo/validate";

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

const settings: SiteSettings = {
  logoLight: { src: "/media/logo.png", mimeType: "image/png", width: 465, height: 203, alt: null },
  logoDark: null,
  favicon: null,
  ogImage: null,
  catalogueFile: { src: "/media/catalogue.pdf", mimeType: "application/pdf", size: 1000 },
  phones: [{ label: { az: "Ofis", ru: "Офис" }, number: "+994124800570" }],
  emails: ["office@cewm.example"],
  address: {
    az: "S. Vəzirov küç. 17A, AZ1025, Bakı",
    ru: "ул. С. Везирова 17A, AZ1025, Баку",
    en: "17A S. Vezirov Street, AZ1025, Baku",
  },
  mapUrl: "https://maps.google.com/?cid=1",
  workingHours: null,
  whatsappNumber: null,
  socials: [{ network: "instagram", url: "https://www.instagram.com/cewm.az" }],
  legalName: "CEWM",
  seoTitle: null,
  seoDescription: null,
  searchIndexing: true,
  seo: {},
};

function doc(text: string) {
  return {
    type: "doc" as const,
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

const product: CorpusProduct = {
  id: "p1",
  slug: { az: "masa", ru: "stol", en: "desk" },
  name: { az: "Masa MX-1", ru: "Стол MX-1", en: "Desk MX-1" },
  sku: "MX-1",
  brand: "HOMAG",
  shortDescription: { az: doc("Masa kəsmə üçündür. İkinci cümlə."), ru: doc("Стол для раскроя.") },
  description: null,
  benefits: [{ az: "Dəqiq kəsmə", ru: "Точный раскрой" }],
  specs: [
    { label: { az: "Uzunluq", ru: "Длина" }, value: { az: "3200" }, unit: { az: "mm" } },
    { label: { az: "Qalınlıq" }, value: { az: "60" }, unit: null },
  ],
  categoryIds: ["c1"],
  images: [{ key: "a/masa.jpg", width: 800, height: 600, alt: { az: "Masa" }, caption: null }],
  documents: [{ title: { az: "Kataloq" }, key: "a/masa.pdf" }],
  seoTitle: null,
  seoDescription: null,
  updatedAt: "2026-11-01T10:00:00.000Z",
};

const corpus: Corpus = {
  settings,
  settingsUpdatedAt: "2026-10-01T10:00:00.000Z",
  brands: [{ name: "HOMAG", websiteUrl: "https://www.homag.com", description: null }],
  categories: [
    {
      id: "c1",
      parentId: null,
      slug: { az: "kesme", ru: "raskroy" },
      name: { az: "Kəsmə", ru: "Раскрой" },
      description: { az: doc("Kəsmə mərkəzləri.") },
      seoTitle: null,
      seoDescription: null,
      image: null,
      updatedAt: "2026-10-15T10:00:00.000Z",
    },
  ],
  products: [product],
  pages: [
    {
      id: "g1",
      kind: "contact",
      slug: { az: "elaqe", ru: "kontakty" },
      title: { az: "Əlaqə", ru: "Контакты" },
      content: null,
      cover: null,
      seoTitle: null,
      seoDescription: null,
      updatedAt: "2026-09-01T10:00:00.000Z",
    },
  ],
  posts: [],
  persons: [],
};

type RobotsRule = {
  userAgent: string | string[];
  allow?: string;
  disallow?: string | string[];
};

function rulesOf(searchIndexing: boolean, policy: "open" | "search-only" | "closed"): RobotsRule[] {
  return buildRobots(searchIndexing, policy).rules as RobotsRule[];
}

function groupWith(rules: RobotsRule[], agent: string): RobotsRule | undefined {
  return rules.find((rule) => Array.isArray(rule.userAgent) && rule.userAgent.includes(agent));
}

describe("text fitting", () => {
  it("cuts at a word boundary and marks the cut", () => {
    expect(clampText("a ".repeat(100), 20).length).toBeLessThanOrEqual(20);
    expect(clampText("Qısa mətn", 50)).toBe("Qısa mətn");
    expect(clampText("Çox uzun başlıq burada davam edir", 20)).toMatch(/…$/);
  });

  it("limits Russian titles tighter than Latin ones and reserves room for the site name", () => {
    const long = "Портальный обрабатывающий центр с ЧПУ для мебельного производства";
    expect(fitTitle(long, "ru", 7).length).toBeLessThanOrEqual(48);
    expect(fitTitle(long, "en", 0).length).toBeLessThanOrEqual(60);
  });

  it("keeps the model number when a long title has to be shortened", () => {
    const title = fitTitle("Сверлильный и шкантозабивной станок с ЧПУ DRILLTEQ D-510", "ru", 7);
    expect(title.length).toBeLessThanOrEqual(48);
    expect(title.endsWith("DRILLTEQ D-510")).toBe(true);
    expect(fitTitle("Qısa ad MX-1", "az", 7)).toBe("Qısa ad MX-1");
  });

  it("starts an entity description with its name, adds the summary and pads to a useful length", () => {
    const text = describeEntity({
      locale: "en",
      name: "DRILLTEQ D-200",
      admin: "Operation made easy.",
      summary: "Horizontal drilling and dowel insertion under full control of the operator.",
      fallback: "DRILLTEQ D-200 in the CEWM catalogue. Request a consultation.",
    });
    expect(text.startsWith("DRILLTEQ D-200: Operation made easy.")).toBe(true);
    expect(text.length).toBeGreaterThanOrEqual(90);
    expect(text.length).toBeLessThanOrEqual(155);
    expect(
      describeEntity({
        locale: "az",
        name: "X",
        admin:
          "X modelinin təsviri belədir və kifayət qədər uzundur, buna görə ad əlavə olunmur və mətn olduğu kimi qalır.",
        fallback: "f",
      }),
    ).toMatch(/^X modelinin/);
  });

  it("pads a short description from the next part and stays inside the limit", () => {
    const text = fitDescription(
      [
        "Qısa.",
        "Daha uzun ikinci cümlə burada, məhsulun təyinatını izah edir və sətri tamamlayır, ona görə də uzunluq kifayət edir.",
      ],
      "az",
    );
    expect(text.length).toBeGreaterThanOrEqual(90);
    expect(text.length).toBeLessThanOrEqual(155);
    expect(fitDescription([null, "  "], "en")).toBe("");
  });
});

describe("page metadata", () => {
  it("sets canonical, hreflang for translated locales with x-default and a large Twitter card", () => {
    const metadata = pageMetadata({
      locale: "ru",
      title: "Стол",
      description: "  Рабочий стол  ",
      paths,
      og: { kind: "product", slug: "stol" },
    });
    expect(metadata.alternates?.canonical).toBe("/ru/mehsul/stol");
    expect(metadata.alternates?.languages).toEqual({ ...paths, "x-default": "/mehsul/masa" });
    expect(metadata.description).toBe("Рабочий стол");
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image", title: "Стол" });
    expect(metadata.openGraph).toMatchObject({
      url: "/ru/mehsul/stol",
      locale: "ru_RU",
      alternateLocale: ["az_AZ", "en_US", "de_DE"],
      siteName: "CEWM",
      images: [{ url: "/og/ru/product/stol.png", width: 1200, height: 630 }],
    });
  });

  it("drops a missing translation from hreflang and points its page at the Azerbaijani one", () => {
    const metadata = pageMetadata({
      locale: "de",
      title: "Tisch",
      paths,
      availableLocales: ["az", "ru"],
    });
    expect(metadata.alternates?.canonical).toBe("/mehsul/masa");
    expect(metadata.alternates?.languages).toEqual({
      az: paths.az,
      ru: paths.ru,
      "x-default": paths.az,
    });
    expect(metadata.openGraph).toMatchObject({ alternateLocale: ["az_AZ", "ru_RU"] });
  });

  it("always has a social image: generated one, the page photo or the site default", () => {
    expect(pageMetadata({ locale: "az", title: "Masa", paths }).openGraph?.images).toEqual([
      { url: ogImagePath("az", "home"), alt: "Masa", width: 1200, height: 630 },
    ]);
    const photo = pageMetadata({
      locale: "az",
      title: "Masa",
      paths,
      image: { src: "/media/masa.jpg", width: 800, height: 600, alt: "" },
      absoluteTitle: true,
    });
    expect(photo.title).toEqual({ absolute: "Masa" });
    expect(photo.openGraph?.images).toEqual([
      { url: "/media/masa.jpg", alt: "Masa", width: 800, height: 600 },
    ]);
  });

  it("clamps long titles and descriptions per language", () => {
    const metadata = pageMetadata({
      locale: "ru",
      title: "Очень длинный заголовок страницы про портальный обрабатывающий центр",
      description: "слово ".repeat(60),
      paths,
    });
    expect(String(metadata.title).length).toBeLessThanOrEqual(48);
    expect(metadata.description?.length).toBeLessThanOrEqual(140);
  });

  it("advertises the Markdown alternate and article dates", () => {
    const metadata = pageMetadata({
      locale: "az",
      title: "Yazı",
      paths,
      markdownPath: "/mehsul/masa.md",
      type: "article",
      publishedTime: "2026-01-01T00:00:00.000Z",
      modifiedTime: "2026-02-01T00:00:00.000Z",
    });
    expect(metadata.alternates?.types).toEqual({ "text/markdown": "/mehsul/masa.md" });
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-01-01T00:00:00.000Z",
      modifiedTime: "2026-02-01T00:00:00.000Z",
    });
  });

  it("marks noindex pages and keeps paginated pages self-canonical with a page suffix", () => {
    expect(pageMetadata({ locale: "az", title: "X", paths, noIndex: true }).robots).toEqual({
      index: false,
      follow: true,
    });
    expect(paginatedPaths(paths, 1)).toBe(paths);
    expect(paginatedPaths(paths, 3).ru).toBe("/ru/mehsul/stol?page=3");
    expect(paginatedText("Masalar.", 2, "Səhifə 2")).toBe("Masalar – Səhifə 2");
  });

  it("adds search engine verification tags only for the codes that are set", () => {
    expect(verificationMetadata({})).toBeUndefined();
    expect(
      verificationMetadata({
        googleVerification: "g-code",
        yandexVerification: "y-code",
        bingVerification: "b-code",
      }),
    ).toEqual({ google: "g-code", yandex: "y-code", other: { "msvalidate.01": "b-code" } });
    const root = rootMetadata({
      origin: siteUrl,
      siteName: "CEWM",
      description: "d",
      searchIndexing: false,
      seo: { googleVerification: "g-code" },
    });
    expect(root.robots).toEqual({ index: false, follow: false });
    expect(root.verification).toEqual({ google: "g-code" });
  });
});

function validate(node: JsonLd): string[] {
  return validateJsonLdNode(node);
}

describe("JSON-LD builders", () => {
  it("builds one Organization and LocalBusiness entity from settings, in the page locale", () => {
    const [business, ...rest] = businessJsonLd(settings, "ru", siteUrl, {
      description: "Партнёр HOMAG",
      brands: [{ name: "HOMAG", websiteUrl: "https://www.homag.com" }],
      hasOfferCatalog: [{ name: "Раскрой", url: "/ru/mehsullar/raskroy" }],
    });
    expect(rest).toEqual([]);
    expect(business).toMatchObject({
      "@type": ["Organization", "LocalBusiness"],
      "@id": `${siteUrl}/#organization`,
      name: "CEWM",
      alternateName: "HOMAG Azerbaijan",
      url: `${siteUrl}/ru`,
      telephone: "+994124800570",
      email: "office@cewm.example",
      hasMap: "https://maps.google.com/?cid=1",
      address: {
        "@type": "PostalAddress",
        streetAddress: "ул. С. Везирова 17A",
        postalCode: "AZ1025",
        addressLocality: "Баку",
        addressCountry: "AZ",
      },
      logo: { "@type": "ImageObject", url: `${siteUrl}/media/logo.png`, width: 465, height: 203 },
      brand: [{ "@type": "Brand", name: "HOMAG", url: "https://www.homag.com" }],
      contactPoint: [expect.objectContaining({ telephone: "+994124800570", name: "Офис" })],
    });
    expect(validate(business as JsonLd)).toEqual([]);
    expect(JSON.stringify(business)).not.toMatch(/parentOrganization|aggregateRating/);
  });

  it("falls back to a plain Organization when there is no address", () => {
    const data = organizationJsonLd({ ...settings, address: null }, "az", siteUrl);
    expect(data["@type"]).toBe("Organization");
    expect(data).not.toHaveProperty("address");
  });

  it("splits an address into the parts the text states and invents none", () => {
    expect(parseAddress("S. Vəzirov küç. 17A, AZ1025, Bakı")).toEqual({
      streetAddress: "S. Vəzirov küç. 17A",
      postalCode: "AZ1025",
      addressLocality: "Bakı",
    });
    expect(parseAddress("Somewhere 5")).toEqual({ streetAddress: "Somewhere 5" });
  });

  it("describes a product with its brand, specifications and documents but no offer", () => {
    const data = productJsonLd(
      {
        name: "Masa",
        url: "/mehsul/masa",
        images: ["/media/masa.jpg"],
        description: "İş masası",
        category: "Masalar",
        sku: "M-1",
        brand: "HOMAG",
        specs: [
          { name: "Uzunluq", value: "3200", unit: "mm" },
          { name: "Rejim", value: "Avtomat" },
        ],
        documents: [{ name: "Kataloq", url: "/media/k.pdf" }],
      },
      siteUrl,
    );
    expect(data).toMatchObject({
      "@type": "Product",
      "@id": `${siteUrl}/mehsul/masa#product`,
      url: `${siteUrl}/mehsul/masa`,
      image: [`${siteUrl}/media/masa.jpg`],
      brand: { "@type": "Brand", name: "HOMAG" },
      additionalProperty: [
        { "@type": "PropertyValue", name: "Uzunluq", value: "3200", unitText: "mm" },
        { "@type": "PropertyValue", name: "Rejim", value: "Avtomat" },
      ],
      subjectOf: [
        expect.objectContaining({ "@type": "DigitalDocument", url: `${siteUrl}/media/k.pdf` }),
      ],
    });
    expect(validate(data)).toEqual([]);
    expect(JSON.stringify(data)).not.toMatch(/price|offers|rating|review/i);
  });

  it("builds breadcrumbs, collection pages with item lists, about and contact pages", () => {
    const crumbs = breadcrumbJsonLd(
      [
        { label: "Ana səhifə", href: "/" },
        { label: "Məhsullar", href: "/mehsullar" },
        { label: "Masa" },
      ],
      siteUrl,
    );
    expect(validate(crumbs)).toEqual([]);
    expect(crumbs.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Ana səhifə", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Məhsullar", item: `${siteUrl}/mehsullar` },
      { "@type": "ListItem", position: 3, name: "Masa" },
    ]);

    const collection = collectionPageJsonLd({
      name: "Kəsmə",
      url: "/mehsullar/kesme",
      locale: "az",
      siteUrl,
      items: [{ name: "Masa", url: "/mehsul/masa", image: "/media/masa.jpg" }],
    });
    expect(validate(collection)).toEqual([]);
    expect(collection.mainEntity).toMatchObject({
      "@type": "ItemList",
      numberOfItems: 1,
      itemListElement: [
        { position: 1, url: `${siteUrl}/mehsul/masa`, image: `${siteUrl}/media/masa.jpg` },
      ],
    });

    const about = aboutPageJsonLd({
      name: "Haqqımızda",
      url: "/haqqimizda",
      locale: "az",
      siteUrl,
    });
    const contact = contactPageJsonLd({ name: "Əlaqə", url: "/elaqe", locale: "az", siteUrl });
    expect(about).toMatchObject({
      "@type": "AboutPage",
      about: { "@id": `${siteUrl}/#organization` },
    });
    expect(contact).toMatchObject({
      "@type": "ContactPage",
      mainEntity: { "@id": `${siteUrl}/#organization` },
    });
    expect(validate(about)).toEqual([]);
    expect(validate(contact)).toEqual([]);
  });

  it("builds WebSite and BlogPosting with real dates and a publisher", () => {
    const site = websiteJsonLd({ locale: "en", siteUrl });
    expect(site).toMatchObject({
      "@type": "WebSite",
      url: `${siteUrl}/en`,
      inLanguage: "en",
      alternateName: "HOMAG Azerbaijan",
    });
    expect(site).not.toHaveProperty("potentialAction");
    const post = blogPostingJsonLd({
      headline: "Yazı",
      url: "/bloq/yazi",
      image: "/media/y.jpg",
      datePublished: "2026-01-01T00:00:00.000Z",
      dateModified: "2026-02-01T00:00:00.000Z",
      locale: "az",
      siteUrl,
      publisherName: "CEWM",
      logo: "/media/logo.png",
    });
    expect(validate(post)).toEqual([]);
    expect(post).toMatchObject({
      dateModified: "2026-02-01T00:00:00.000Z",
      publisher: { logo: { url: `${siteUrl}/media/logo.png` } },
    });
  });

  it("emits FAQPage only when real questions exist", () => {
    expect(faqPageJsonLd([])).toBeNull();
    expect(faqPageJsonLd([{ question: " ", answer: "x" }])).toBeNull();
    const faq = faqPageJsonLd([{ question: "Q?", answer: "A." }]);
    expect(faq && validate(faq)).toEqual([]);
  });

  it("serialises without allowing a script break-out", () => {
    const text = serializeJsonLd({ "@type": "Thing", name: "</script><b>" });
    expect(text).not.toContain("</script>");
    expect(JSON.parse(text)).toMatchObject({ name: "</script><b>" });
  });

  it("lists root categories for the offer catalog", () => {
    expect(homeOfferCatalog(corpus, "ru")).toEqual([
      { name: "Раскрой", url: "/ru/mehsullar/raskroy" },
    ]);
  });
});

describe("SEO settings", () => {
  it("keeps only valid verification codes and defaults the AI policy to open", () => {
    expect(
      seoSettingsSchema.parse({ googleVerification: " abc_DEF-123 ", bingVerification: "" }),
    ).toEqual({
      googleVerification: "abc_DEF-123",
      aiCrawlers: "open",
    });
    expect(seoSettingsSchema.safeParse({ googleVerification: "<script>" }).success).toBe(false);
    expect(seoSettingsSchema.safeParse({ indexNowKey: "short" }).success).toBe(false);
    expect(
      seoSettingsSchema.parse({ indexNowKey: "abcdef0123456789", aiCrawlers: "closed" }),
    ).toEqual({
      indexNowKey: "abcdef0123456789",
      aiCrawlers: "closed",
    });
    expect(seoSettingsSchema.safeParse({ aiCrawlers: "everything" }).success).toBe(false);
  });
});

describe("robots.txt", () => {
  it("allows answer engines and user fetchers by default and names the sitemap", () => {
    const result = buildRobots(true);
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
    const rules = rulesOf(true, "open");
    expect(rules[0]).toEqual({ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/md/"] });
    const answers = groupWith(rules, "OAI-SearchBot");
    expect(answers?.userAgent).toEqual(
      expect.arrayContaining(["ChatGPT-User", "Claude-User", "PerplexityBot", "Perplexity-User"]),
    );
    expect(answers?.allow).toBe("/");
  });

  it("keeps training crawlers out under search-only and everything AI out under closed", () => {
    expect(groupWith(rulesOf(true, "open"), "GPTBot")?.disallow).toEqual([
      "/admin",
      "/api",
      "/md/",
    ]);
    expect(groupWith(rulesOf(true, "search-only"), "GPTBot")?.disallow).toBe("/");
    expect(groupWith(rulesOf(true, "search-only"), "ChatGPT-User")?.allow).toBe("/");
    const closed = rulesOf(true, "closed");
    expect(groupWith(closed, "ChatGPT-User")?.disallow).toBe("/");
    expect(closed[0]).toMatchObject({ userAgent: "*", allow: "/" });
  });

  it("keeps every crawler out while indexing is switched off", () => {
    expect(rulesOf(false, "open")).toEqual([{ userAgent: "*", disallow: "/" }]);
  });
});

describe("sitemap from a corpus", () => {
  it("lists translated locales only, with reciprocal alternates and x-default", () => {
    const urls = buildSitemapUrls(corpus, siteUrl);
    const productUrls = urls.filter((url) => /\/mehsul\//.test(url.loc));
    expect(productUrls.map((url) => url.loc)).toEqual([
      `${siteUrl}/mehsul/masa`,
      `${siteUrl}/ru/mehsul/stol`,
      `${siteUrl}/en/mehsul/desk`,
    ]);
    for (const url of productUrls) {
      expect(url.languages).toEqual({
        az: `${siteUrl}/mehsul/masa`,
        ru: `${siteUrl}/ru/mehsul/stol`,
        en: `${siteUrl}/en/mehsul/desk`,
        "x-default": `${siteUrl}/mehsul/masa`,
      });
      expect(Object.values(url.languages)).toContain(url.loc);
      expect(url.lastModified).toBe("2026-11-01T10:00:00.000Z");
      expect(url.images).toEqual([`${siteUrl}/media/a/masa.jpg`]);
    }
  });

  it("uses the newest database date for the home page and has no blog without posts", () => {
    const entries = buildSitemap(corpus, siteUrl);
    expect(entries.find((entry) => entry.url === `${siteUrl}/`)?.lastModified).toBe(
      "2026-11-01T10:00:00.000Z",
    );
    expect(entries.some((entry) => entry.url.includes("/bloq"))).toBe(false);
    expect(entries.some((entry) => entry.url === `${siteUrl}/de`)).toBe(true);
  });
});

describe("rewrites and normalisation", () => {
  it("maps Markdown addresses to the md route and back", () => {
    expect(markdownRewrite("/mehsul/masa.md")).toBe("/md/az/mehsul/masa");
    expect(markdownRewrite("/ru/mehsul/stol.md")).toBe("/md/ru/mehsul/stol");
    expect(markdownRewrite("/index.md")).toBe("/md/az");
    expect(markdownRewrite("/de/index.md")).toBe("/md/de");
    expect(markdownRewrite("/mehsul/masa")).toBeNull();
    expect(markdownHref("/")).toBe("/index.md");
    expect(markdownHref("/ru")).toBe("/ru/index.md");
    expect(markdownHref("/ru/mehsul/stol?page=2")).toBe("/ru/mehsul/stol.md");
  });

  it("serves the IndexNow key file only for key-shaped root text files", () => {
    expect(seoRewrite("/0123456789abcdef.txt")).toBe("/indexnow-key/0123456789abcdef");
    expect(seoRewrite("/robots.txt")).toBeNull();
    expect(seoRewrite("/llms-full.txt")).toBeNull();
    expect(seoRewrite("/short.txt")).toBeNull();
  });

  it("collapses slashes and lower-cases ASCII letters without touching encoded bytes", () => {
    expect(normalizePathname("/Mehsullar/", true)).toBe("/mehsullar");
    expect(normalizePathname("//ru//Mehsul//X", true)).toBe("/ru/mehsul/x");
    expect(normalizePathname("/%D0%90B", true)).toBe("/%D0%90b");
    expect(normalizePathname("/AbCdEfGh12.txt", true)).toBe("/AbCdEfGh12.txt");
    expect(normalizePathname("/admin/Users/", false)).toBe("/admin/Users");
    expect(normalizePathname("/", true)).toBe("/");
  });
});

describe("generative engine files", () => {
  async function context(locale: "az" | "ru" | "en" | "de") {
    return { corpus, locale, dict: await getDictionary(locale), siteUrl };
  }

  it("builds llms.txt in the proposed shape with real facts and language links", async () => {
    const text = buildLlmsTxt(await context("en"));
    expect(text).toMatch(/^# CEWM\n\n> .+\n\n- /);
    expect(text).toContain("- Address: 17A S. Vezirov Street, AZ1025, Baku");
    expect(text).toContain("- Brands: HOMAG");
    expect(text).toMatch(/\n## [^\n]+\n\n- \[/);
    expect(text).toContain(`[Desk MX-1](${siteUrl}/en/mehsul/desk): HOMAG.`);
    expect(text).toContain(`${siteUrl}/ru/llms.txt`);
    expect(text).toContain(`${siteUrl}/en/llms-full.txt`);
    expect(text).toContain("## Optional");
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("leaves untranslated machines out of the German file and keeps them in Azerbaijani", async () => {
    expect(buildLlmsTxt(await context("de"))).not.toContain("/mehsul/");
    expect(buildLlmsTxt(await context("az"))).toContain(`${siteUrl}/mehsul/masa`);
  });

  it("builds llms-full.txt with machine sections, specification tables and documents", async () => {
    const text = buildLlmsFullTxt(await context("az"));
    expect(text).toContain("### Masa MX-1");
    expect(text).toContain("| Uzunluq | 3200 mm |");
    expect(text).toContain(`[Kataloq](${siteUrl}/media/a/masa.pdf)`);
    expect(text).toContain("- Dəqiq kəsmə");
  });

  it("renders fact blocks from admin content with answer-first text", async () => {
    const dict = await getDictionary("az");
    const company = companyFactBlock(corpus, "az", dict);
    expect(company.answer).toBe(dict.meta.description);
    expect(company.facts).toEqual(
      expect.arrayContaining([
        { label: dict.contact.address, value: "S. Vəzirov küç. 17A, AZ1025, Bakı" },
        { label: "Brendlər", value: "HOMAG" },
        { label: "Sayt dilləri", value: "Azərbaycanca, Rusca, İngiliscə, Almanca" },
      ]),
    );
    const block = productFactBlock(corpus, product, "az", dict);
    expect(block.answer).toBe("Masa kəsmə üçündür. İkinci cümlə.");
    expect(block.facts.slice(0, 3)).toEqual([
      { label: dict.product.brand, value: "HOMAG" },
      { label: "Model", value: "MX-1" },
      { label: "Kateqoriya", value: "Kəsmə" },
    ]);
    const category = categoryFactBlock(
      corpus,
      corpus.categories[0],
      "ru",
      await getDictionary("ru"),
    );
    expect(category.facts[1]).toEqual({ label: "Оборудование", value: "Стол MX-1" });
  });

  it("converts rich text to Markdown", () => {
    expect(
      richTextToMarkdown({
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Başlıq" }] },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "qalın", marks: [{ type: "bold" }] },
              { type: "text", text: " və " },
              {
                type: "text",
                text: "link",
                marks: [{ type: "link", attrs: { href: "https://x.az" } }],
              },
            ],
          },
          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [{ type: "paragraph", content: [{ type: "text", text: "bir" }] }],
              },
              {
                type: "listItem",
                content: [{ type: "paragraph", content: [{ type: "text", text: "iki" }] }],
              },
            ],
          },
        ],
      }),
    ).toBe("#### Başlıq\n\n**qalın** və [link](https://x.az)\n\n- bir\n- iki");
    expect(richTextToMarkdown(null)).toBe("");
  });

  it("resolves Markdown alternates for products, categories and pages, and nothing else", async () => {
    const ctx = await context("ru");
    const found = resolveMarkdown(ctx, ["mehsul", "stol"]);
    expect(found?.canonical).toBe(`${siteUrl}/ru/mehsul/stol`);
    expect(found?.body).toMatch(/^# Стол MX-1\n\nURL: /);
    expect(resolveMarkdown(ctx, ["mehsullar", "raskroy"])?.body).toContain("# Раскрой");
    expect(resolveMarkdown(ctx, ["kontakty"])?.body).toContain("# Контакты");
    expect(resolveMarkdown(ctx, [])?.body).toContain("# CEWM");
    expect(resolveMarkdown(ctx, ["mehsul", "yoxdur"])).toBeNull();
    expect(resolveMarkdown(await context("de"), ["mehsul", "masa"])).toBeNull();
    expect(productMarkdown(ctx, product)).not.toContain("undefined");
  });

  it("builds the social card from the database fields of each kind", async () => {
    const dict = await getDictionary("ru");
    expect(resolveOgCard(corpus, dict, "ru", "product", "stol")).toMatchObject({
      title: "Стол MX-1",
      eyebrow: "HOMAG / Раскрой",
      imageKey: "a/masa.jpg",
    });
    expect(resolveOgCard(corpus, dict, "ru", "product", "yoxdur")).toBeNull();
    expect(resolveOgCard(corpus, dict, "ru", "category", "raskroy")?.imageKey).toBe("a/masa.jpg");
    expect(resolveOgCard(corpus, dict, "ru", "home", "default")?.title).toBe(dict.meta.homeTitle);
    expect(resolveOgCard(corpus, dict, "ru", "catalogue", "default")?.title).toBe(
      dict.catalog.title,
    );
  });
});

describe("IndexNow", () => {
  it("only reports addresses whose date changed, or that disappeared", () => {
    const before = snapshotOf(corpus, siteUrl);
    expect(changedUrls(before, before)).toEqual([]);
    const next = new Map(before);
    next.set(`${siteUrl}/mehsul/masa`, "2026-12-01T00:00:00.000Z");
    next.delete(`${siteUrl}/en/mehsul/desk`);
    expect(changedUrls(before, next).sort()).toEqual([
      `${siteUrl}/en/mehsul/desk`,
      `${siteUrl}/mehsul/masa`,
    ]);
  });

  it("on the first run only reports what changed in the last minutes", () => {
    const now = Date.parse("2026-11-01T10:05:00.000Z");
    const first = changedUrls(null, snapshotOf(corpus, siteUrl), now);
    expect(first).toContain(`${siteUrl}/mehsul/masa`);
    expect(first).not.toContain(`${siteUrl}/elaqe`);
  });

  it("builds the request body and refuses non-public hosts", () => {
    expect(indexNowBody(["https://cewm.az/"], "abcdef12", "https://cewm.az")).toEqual({
      host: "cewm.az",
      key: "abcdef12",
      keyLocation: "https://cewm.az/abcdef12.txt",
      urlList: ["https://cewm.az/"],
    });
    expect(isPublicHost("https://cewm.az")).toBe(true);
    expect(isPublicHost("http://localhost:3071")).toBe(false);
    expect(isPublicHost("http://127.0.0.1:3000")).toBe(false);
  });
});

describe("corpus from the database", () => {
  const run = randomUUID().slice(0, 8);
  const slug = (name: string) => `seo-${name}-${run}`;
  const created = {
    media: [] as string[],
    categories: [] as string[],
    products: [] as string[],
    pages: [] as string[],
    posts: [] as string[],
  };
  let result: Corpus;
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
        {
          slug: { az: slug("cat"), ru: slug("cat-ru") },
          name: { az: "Kateqoriya", ru: "Категория" },
        },
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
          name: { az: "Canlı", en: "Live" },
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

    result = await queryCorpus();
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

  it("lists published content in the sitemap with only the translated locales", () => {
    const urls = buildSitemap(result, siteUrl).map((entry) => entry.url);
    for (const path of [
      "/",
      "/de",
      "/mehsullar",
      "/kateqoriyalar",
      `/mehsullar/${slug("cat")}`,
      `/ru/mehsullar/${slug("cat-ru")}`,
      `/mehsul/${slug("live")}`,
      `/en/mehsul/${slug("live-en")}`,
      `/${slug("page")}`,
      "/bloq",
      `/bloq/${slug("post")}`,
    ]) {
      expect(urls, path).toContain(absolute(path));
    }
    expect(urls).not.toContain(absolute(`/ru/mehsul/${slug("live")}`));
    expect(urls).not.toContain(absolute(`/de/mehsul/${slug("live")}`));
    expect(urls).not.toContain(absolute(`/en/mehsullar/${slug("cat")}`));
  });

  it("leaves out drafts, deleted, scheduled and hidden content", () => {
    const listed = buildSitemap(result, siteUrl)
      .map((entry) => entry.url)
      .join("\n");
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

  it("carries real lastmod dates, images and shared alternates", () => {
    const entry = buildSitemap(result, siteUrl).find(
      (item) => item.url === absolute(`/en/mehsul/${slug("live-en")}`),
    );
    expect(entry?.alternates?.languages).toEqual({
      az: absolute(`/mehsul/${slug("live")}`),
      en: absolute(`/en/mehsul/${slug("live-en")}`),
      "x-default": absolute(`/mehsul/${slug("live")}`),
    });
    expect(entry?.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry?.images).toEqual([absolute(`/media/test/${run}/seo.jpg`)]);
  });
});

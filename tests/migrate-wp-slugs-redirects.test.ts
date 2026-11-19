import { describe, expect, it } from "vitest";

import type { CrawlRedirectPath } from "../scripts/migrate-wp/crawl";
import type { Plan } from "../scripts/migrate-wp/plan-types";
import {
  categoryKeyFromPath,
  resolveRedirects,
  stripPagination,
} from "../scripts/migrate-wp/redirects";
import { assignSlugs, decideSlug, isSaneOldSlug } from "../scripts/migrate-wp/slugs";

describe("slug mapping", () => {
  it("keeps clean old slugs and rejects language suffixes and Cyrillic", () => {
    expect(isSaneOldSlug("cutting")).toBe(true);
    expect(isSaneOldSlug("cutting-az")).toBe(false);
    expect(isSaneOldSlug("раскроечный-центр")).toBe(false);
    expect(decideSlug({ name: "Раскроечные центры с ЧПУ", oldSlug: "cutting" })).toEqual({
      slug: "cutting",
      origin: "old",
    });
    expect(decideSlug({ name: "CNC kəsmə mərkəzləri", oldSlug: "cutting-az" })).toEqual({
      slug: "cnc-kesme-merkezleri",
      origin: "derived",
    });
    expect(decideSlug({ name: null, oldSlug: "x-ru" })).toBeNull();
  });

  it("keeps slugs unique inside one language and leaves empty names without a slug", () => {
    const result = assignSlugs([
      {
        key: "a",
        byLocale: {
          az: { name: "woodStore" },
          ru: { name: "woodStore" },
          en: { name: null },
          de: { name: "woodStore" },
        },
      },
      {
        key: "b",
        byLocale: {
          az: { name: "woodStore" },
          ru: { name: "Другой" },
          en: { name: "woodStore" },
          de: { name: "Ein anderer" },
        },
      },
    ]);
    expect(result[0].slugs).toEqual({
      az: "woodstore",
      ru: "woodstore",
      en: null,
      de: "woodstore",
    });
    expect(result[1].slugs.az).toBe("woodstore-2");
    expect(result[1].slugs.ru).toBe("drugoy");
    expect(result[1].slugs.en).toBe("woodstore");
  });
});

const slug = (
  az: string,
  ru: string | null = null,
  en: string | null = null,
  de: string | null = null,
) => ({ az, ru, en, de });

const plan = {
  products: [
    {
      legacyKey: "wp-product:g1",
      name: { az: "A", ru: null, en: null, de: null },
      slug: slug("a-machine", "a-mashina", null, "a-maschine"),
      wpIds: { az: 814, ru: 359, en: 816, de: 819 },
      droppedWpIds: [812],
    },
  ],
  categories: [
    {
      key: "cutting",
      slug: slug("cnc-kesme", "cutting", "cutting", "zuschnitt"),
      name: { az: "Kəsmə", ru: "Раскроечные центры с ЧПУ", en: "Cutting", de: "Zuschnitt" },
    },
  ],
  pages: [
    { kind: "contact", slug: slug("elaqe", "kontakty", "contact", "kontakte") },
    { kind: "consultation", slug: slug("meslehet", "konsultaciya", "consultation", "beratung") },
  ],
} as unknown as Plan;

function entry(overrides: Partial<CrawlRedirectPath>): CrawlRedirectPath {
  return {
    path: "/",
    language: "ru",
    type: "other",
    role: null,
    wp_id: null,
    title: "",
    aliases: [],
    translations: {},
    ...overrides,
  };
}

describe("redirect targets", () => {
  it("parses category and pagination addresses", () => {
    expect(categoryKeyFromPath("/az/c/products-az/cutting-az/")).toBe("cutting");
    expect(categoryKeyFromPath("/c/products/cutting/")).toBe("cutting");
    expect(categoryKeyFromPath("/de/c/products/cnc-de/")).toBe("cnc");
    expect(categoryKeyFromPath("/c/products/")).toBeNull();
    expect(stripPagination("/author/x/page/3/")).toBe("/author/x");
    expect(stripPagination("/author/x/")).toBeNull();
  });

  const resolved = resolveRedirects(
    [
      entry({
        path: "/az/products-az/software-az/812/",
        language: "az",
        type: "product",
        wp_id: 812,
      }),
      entry({ path: "/products/software/359/", language: "ru", type: "product", wp_id: 359 }),
      entry({
        path: "/en/products-en/software-en/816/",
        language: "en",
        type: "product",
        wp_id: 816,
      }),
      entry({ path: "/", type: "home", role: "home" }),
      entry({ path: "/az/home-az/", language: "az", type: "home", role: "home" }),
      entry({ path: "/de/home-de/", language: "de", type: "home", role: "home" }),
      entry({ path: "/c/products/cutting/", type: "product-category", role: "category" }),
      entry({
        path: "/az/c/products-az/cutting-az/",
        language: "az",
        type: "product-category",
        role: "category",
      }),
      entry({ path: "/c/products/", type: "page", role: "products-root-category" }),
      entry({ path: "/contact/", type: "page", role: "contact" }),
      entry({ path: "/az/start-az/", language: "az", type: "page", role: "consultation" }),
      entry({ path: "/author/g1/", role: "author" }),
      entry({ path: "/author/g1/page/2/", role: "pagination" }),
      entry({ path: "/t/раскроечные-центры-с-чпу/", aliases: ["/t/%d1%80/"], role: "unknown" }),
      entry({ path: "/c/blog/", role: "category-blog" }),
      entry({ path: "/блог/page/2/", role: "pagination" }),
      entry({ path: "/zzz/", role: "unknown" }),
    ],
    plan,
  );
  const map = new Map(resolved.entries.map((item) => [item.fromPath, item.toPath]));

  it("sends old Russian addresses to /ru, Azerbaijani ones to the unprefixed default", () => {
    expect(map.get("/products/software/359")).toBe("/ru/mehsul/a-mashina");
    expect(map.get("/az/products-az/software-az/812")).toBe("/mehsul/a-machine");
    expect(map.get("/en/products-en/software-en/816")).toBe("/en/mehsul/a-machine");
  });

  it("falls back to the default-language slug when a language has none", () => {
    const fallback = resolveRedirects(
      [entry({ path: "/en/x/1/", language: "en", type: "product", wp_id: 816 })],
      {
        ...plan,
        products: [{ ...plan.products[0], slug: slug("a-machine", null, null, null) }],
      } as Plan,
    );
    expect(fallback.entries[0].toPath).toBe("/en/mehsul/a-machine");
  });

  it("maps the language homes, categories, pages and archives", () => {
    expect(map.get("/az/home-az")).toBe("/");
    expect(map.get("/de/home-de")).toBe("/de");
    expect(map.get("/c/products/cutting")).toBe("/ru/mehsullar/cutting");
    expect(map.get("/az/c/products-az/cutting-az")).toBe("/mehsullar/cnc-kesme");
    expect(map.get("/c/products")).toBe("/ru/mehsullar");
    expect(map.get("/contact")).toBe("/ru/kontakty");
    expect(map.get("/az/start-az")).toBe("/meslehet");
    expect(map.get("/author/g1")).toBe("/ru");
    expect(map.get("/author/g1/page/2")).toBe("/ru");
    expect(map.get("/c/blog")).toBe("/ru/bloq");
    expect(map.get("/блог/page/2")).toBe("/ru/bloq");
  });

  it("maps a tag archive to its category and includes the encoded alias", () => {
    expect(map.get("/t/раскроечные-центры-с-чпу")).toBe("/ru/mehsullar/cutting");
    expect(map.get("/t/р")).toBe("/ru/mehsullar/cutting");
  });

  it("does not redirect the old Russian home and reports what it cannot resolve", () => {
    expect(map.has("/")).toBe(false);
    expect(resolved.served.map((item) => item.path)).toContain("/");
    expect(resolved.unresolved.map((item) => item.path)).toEqual(["/zzz/"]);
  });
});

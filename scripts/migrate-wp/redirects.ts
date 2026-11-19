import { localePath, type Locale } from "../../lib/i18n/config";
import { pickLocale, type Localized } from "../../lib/i18n/localized";
import { normalizeLegacyPath } from "../../lib/legacy-redirects";
import { routes } from "../../lib/routes";
import { slugify } from "../../lib/slug";
import type { CrawlRedirectPath } from "./crawl";
import type { Plan } from "./plan-types";

export type RedirectEntry = {
  fromPath: string;
  toPath: string;
  language: Locale;
  reason: string;
};

export type RedirectResolution = {
  entries: RedirectEntry[];
  served: { path: string; reason: string }[];
  unresolved: { path: string; reason: string }[];
};

function localizedSlug(slug: Record<Locale, string | null>): Localized {
  return { az: slug.az ?? "", ru: slug.ru, en: slug.en, de: slug.de };
}

export function categoryKeyFromPath(path: string): string | null {
  const decoded = normalizeLegacyPath(path);
  const match = /^(?:\/(?:az|en|de))?\/c\/products(?:-(?:az|en|de))?\/([a-z0-9-]+)$/.exec(decoded);
  if (!match) return null;
  return match[1].replace(/-(?:az|en|de)$/, "");
}

export function stripPagination(path: string): string | null {
  const normalized = normalizeLegacyPath(path);
  const match = /^(.*)\/page\/\d+$/.exec(normalized);
  return match ? match[1] || "/" : null;
}

export function resolveRedirects(paths: CrawlRedirectPath[], plan: Plan): RedirectResolution {
  const productByWpId = new Map<number, Plan["products"][number]>();
  for (const product of plan.products) {
    for (const id of Object.values(product.wpIds)) productByWpId.set(id, product);
    for (const id of product.droppedWpIds) productByWpId.set(id, product);
  }
  const categoryByKey = new Map(plan.categories.map((category) => [category.key, category]));
  const pageByKind = new Map(plan.pages.map((page) => [page.kind, page]));
  const byPath = new Map<string, CrawlRedirectPath>();
  for (const entry of paths) {
    byPath.set(normalizeLegacyPath(entry.path), entry);
    for (const alias of entry.aliases) byPath.set(normalizeLegacyPath(alias), entry);
  }

  const productUrl = (product: Plan["products"][number], locale: Locale) =>
    localePath(locale, routes.product(pickLocale(localizedSlug(product.slug), locale)));
  const categoryUrl = (category: Plan["categories"][number], locale: Locale) =>
    localePath(locale, routes.category(pickLocale(localizedSlug(category.slug), locale)));
  const pageUrl = (kind: "contact" | "consultation", locale: Locale) => {
    const page = pageByKind.get(kind);
    return page
      ? localePath(locale, routes.page(pickLocale(localizedSlug(page.slug), locale)))
      : null;
  };

  const tagTarget = (path: string, locale: Locale): string | null => {
    const match = /^\/t\/(.+)$/.exec(normalizeLegacyPath(path));
    if (!match) return null;
    const wanted = slugify(match[1]);
    const category = plan.categories.find((item) => slugify(item.name.ru ?? "") === wanted);
    return category ? categoryUrl(category, locale) : null;
  };

  function target(entry: CrawlRedirectPath): { to: string | null; reason: string } {
    const locale = entry.language;
    const path = normalizeLegacyPath(entry.path);
    if (entry.type === "product" || entry.type === "blog-post") {
      const product = entry.wp_id ? productByWpId.get(entry.wp_id) : undefined;
      return product
        ? { to: productUrl(product, locale), reason: "product" }
        : { to: null, reason: "product record not found" };
    }
    if (entry.type === "home") return { to: localePath(locale, "/"), reason: "home" };
    if (entry.type === "product-category") {
      const key = categoryKeyFromPath(path);
      if (key === null) return { to: null, reason: "category path not recognised" };
      const category = categoryByKey.get(key);
      return category
        ? { to: categoryUrl(category, locale), reason: "category" }
        : { to: null, reason: `category ${key} not found` };
    }
    if (entry.type === "page") {
      if (entry.role === "contact" || entry.role === "consultation") {
        return { to: pageUrl(entry.role, locale), reason: entry.role };
      }
      if (entry.role === "blog-index")
        return { to: localePath(locale, routes.blog()), reason: "blog" };
      return { to: localePath(locale, routes.catalogue()), reason: "catalogue" };
    }
    const key = categoryKeyFromPath(path);
    if (key && categoryByKey.has(key)) {
      return { to: categoryUrl(categoryByKey.get(key) as never, locale), reason: "category" };
    }
    if (entry.role === "author") return { to: localePath(locale, "/"), reason: "author archive" };
    if (entry.role === "category-blog" || /^\/(?:blog|блог)$/.test(path)) {
      return { to: localePath(locale, routes.blog()), reason: "blog" };
    }
    if (entry.role === "category-uncategorized" || /\/c\/(?:без-рубрики)$/.test(path)) {
      return { to: localePath(locale, routes.catalogue()), reason: "empty category" };
    }
    if (entry.role === "category-portfolio")
      return { to: localePath(locale, "/"), reason: "empty category" };
    const tag = tagTarget(path, locale);
    if (tag) return { to: tag, reason: "tag archive" };
    if (entry.role === "pagination") {
      const base = stripPagination(path);
      const baseEntry = base ? byPath.get(base) : undefined;
      if (baseEntry) {
        const inner = target(baseEntry);
        return { to: inner.to, reason: `pagination of ${inner.reason}` };
      }
      if (base && /^\/(?:blog|блог)$/.test(base)) {
        return { to: localePath(locale, routes.blog()), reason: "pagination of blog" };
      }
    }
    return { to: null, reason: "no rule" };
  }

  const seen = new Set<string>();
  const result: RedirectResolution = { entries: [], served: [], unresolved: [] };
  for (const entry of paths) {
    const { to, reason } = target(entry);
    const sources = [entry.path, ...entry.aliases];
    if (!to) {
      result.unresolved.push({ path: entry.path, reason });
      continue;
    }
    for (const source of sources) {
      const fromPath = normalizeLegacyPath(source);
      if (seen.has(fromPath)) continue;
      seen.add(fromPath);
      if (fromPath === "/") {
        result.served.push({
          path: fromPath,
          reason: "the old Russian home is now the Azerbaijani home and cannot be redirected",
        });
        continue;
      }
      if (fromPath === normalizeLegacyPath(to)) {
        result.served.push({ path: fromPath, reason: "same address on the new site" });
        continue;
      }
      result.entries.push({ fromPath, toPath: to, language: entry.language, reason });
    }
  }
  return result;
}

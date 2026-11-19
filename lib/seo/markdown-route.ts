import { localePath } from "@/lib/i18n/config";
import { pickLocale } from "@/lib/i18n/localized";
import { routes } from "@/lib/routes";

import {
  categoryMarkdown,
  homeMarkdown,
  pageMarkdown,
  postMarkdown,
  productMarkdown,
} from "./markdown";
import { buildLlmsTxt, type LlmsContext } from "./llms";
import { hasLocale } from "./model";

type Match = { body: string; canonical: string };

const routeSegments = {
  catalogue: routes.catalogue().slice(1),
  categories: routes.categories().slice(1),
  product: routes.product("x").split("/")[1] ?? "",
  blog: routes.blog().slice(1),
};

function bySlug<
  T extends { slug: { az: string; ru?: string | null; en?: string | null; de?: string | null } },
>(items: T[], locale: LlmsContext["locale"], slug: string): T | undefined {
  return (
    items.find((item) => item.slug[locale] === slug) ?? items.find((item) => item.slug.az === slug)
  );
}

export function resolveMarkdown(context: LlmsContext, path: string[]): Match | null {
  const { corpus, locale, siteUrl } = context;
  const canonical = (route: string) => new URL(localePath(locale, route), siteUrl).toString();
  const [first, second, ...extra] = path;
  if (extra.length) return null;

  if (!first) return { body: `${homeMarkdown(context)}\n`, canonical: canonical(routes.home()) };

  if (first === routeSegments.product && second) {
    const product = bySlug(corpus.products, locale, second);
    if (!product || !hasLocale(product.name, locale)) return null;
    return {
      body: `${productMarkdown(context, product)}\n`,
      canonical: canonical(routes.product(pickLocale(product.slug, locale))),
    };
  }
  if (first === routeSegments.catalogue && second) {
    const category = bySlug(corpus.categories, locale, second);
    if (!category || !hasLocale(category.name, locale)) return null;
    return {
      body: `${categoryMarkdown(context, category)}\n`,
      canonical: canonical(routes.category(pickLocale(category.slug, locale))),
    };
  }
  if (first === routeSegments.blog && second) {
    const post = bySlug(corpus.posts, locale, second);
    if (!post || !hasLocale(post.title, locale)) return null;
    return {
      body: `${postMarkdown(context, post)}\n`,
      canonical: canonical(routes.post(pickLocale(post.slug, locale))),
    };
  }
  if (!second && (first === routeSegments.catalogue || first === routeSegments.categories)) {
    return {
      body: buildLlmsTxt(context),
      canonical: canonical(
        first === routeSegments.catalogue ? routes.catalogue() : routes.categories(),
      ),
    };
  }
  if (!second && first === routeSegments.blog) {
    return corpus.posts.length
      ? { body: buildLlmsTxt(context), canonical: canonical(routes.blog()) }
      : null;
  }
  if (!second) {
    const page = bySlug(corpus.pages, locale, first);
    if (!page || !hasLocale(page.title, locale)) return null;
    return {
      body: `${pageMarkdown(context, page)}\n`,
      canonical: canonical(routes.page(pickLocale(page.slug, locale))),
    };
  }
  return null;
}

import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

import type { OgKind } from "./config";
import { companyName, productCategory } from "./facts";
import { localizedText, summaryText, type Corpus } from "./model";
import { clampText } from "./text";

export type OgCard = {
  title: string;
  eyebrow: string;
  subtitle: string;
  imageKey: string | null;
};

const titleMax = 96;
const subtitleMax = 120;

function card(title: string, eyebrow: string, subtitle: string, imageKey: string | null): OgCard {
  return {
    title: clampText(title, titleMax),
    eyebrow: clampText(eyebrow, 60),
    subtitle: clampText(subtitle, subtitleMax),
    imageKey,
  };
}

function matchSlug<T extends { slug: { az: string } & Partial<Record<Locale, string | null>> }>(
  items: T[],
  locale: Locale,
  slug: string,
): T | undefined {
  return (
    items.find((item) => item.slug[locale] === slug) ?? items.find((item) => item.slug.az === slug)
  );
}

export function resolveOgCard(
  corpus: Corpus,
  dict: Dictionary,
  locale: Locale,
  kind: OgKind,
  slug: string,
): OgCard | null {
  const site = companyName(corpus);
  const firstImage = (images: { key: string }[]) => images[0]?.key ?? null;

  switch (kind) {
    case "home":
      return card(
        dict.meta.homeTitle,
        "",
        "",
        firstImage(corpus.products.flatMap((product) => product.images)),
      );
    case "catalogue":
      return card(dict.catalog.title, site, dict.catalog.description, null);
    case "categories":
      return card(dict.catalog.indexTitle, site, dict.catalog.indexDescription, null);
    case "blog":
      return card(dict.blog.title, site, dict.blog.description, null);
    case "product": {
      const product = matchSlug(corpus.products, locale, slug);
      if (!product) return null;
      const category = productCategory(corpus, product);
      return card(
        localizedText(product.name, locale),
        [product.brand, category ? localizedText(category.name, locale) : null]
          .filter(Boolean)
          .join(" / ") || site,
        summaryText(product.shortDescription, product.description, locale, subtitleMax),
        firstImage(product.images),
      );
    }
    case "category": {
      const category = matchSlug(corpus.categories, locale, slug);
      if (!category) return null;
      const imageKey =
        category.image?.key ??
        firstImage(
          corpus.products
            .filter((product) => product.categoryIds.includes(category.id))
            .flatMap((product) => product.images),
        );
      return card(
        localizedText(category.name, locale),
        dict.catalog.title,
        summaryText(category.description, null, locale, subtitleMax),
        imageKey,
      );
    }
    case "page": {
      const page = matchSlug(corpus.pages, locale, slug);
      if (!page) return null;
      return card(
        localizedText(page.title, locale),
        site,
        summaryText(page.content, null, locale, subtitleMax),
        page.cover?.key ?? null,
      );
    }
    case "post": {
      const post = matchSlug(corpus.posts, locale, slug);
      if (!post) return null;
      return card(
        localizedText(post.title, locale),
        dict.blog.title,
        localizedText(post.excerpt, locale),
        post.cover?.key ?? null,
      );
    }
  }
}

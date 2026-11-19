import type { MetadataRoute } from "next";

import { defaultLocale, localePath, locales, type Locale } from "@/lib/i18n/config";
import { pickLocale, type Localized } from "@/lib/i18n/localized";
import { routes } from "@/lib/routes";

import { hasLocale, type Corpus, type CorpusImage } from "./model";

const maxImagesPerUrl = 10;

export function blogLocales(corpus: Corpus): Locale[] {
  return locales.filter((locale) => corpus.posts.some((post) => hasLocale(post.title, locale)));
}

type Entry = MetadataRoute.Sitemap[number];

function latest(dates: (string | null | undefined)[]): string | undefined {
  const values = dates.filter((date): date is string => Boolean(date)).sort();
  return values.at(-1);
}

export type SitemapUrl = {
  loc: string;
  lastModified?: string;
  languages: Record<string, string>;
  images: string[];
};

function imagePaths(images: CorpusImage[] | undefined): string[] {
  return (images ?? []).slice(0, maxImagesPerUrl).map((image) => routes.media(image.key));
}

export function buildSitemapUrls(corpus: Corpus, siteUrl: string): SitemapUrl[] {
  const absolute = (path: string) => new URL(path, siteUrl).toString();

  const entries = (
    build: (locale: Locale) => string,
    lastModified: string | undefined,
    available: readonly Locale[] = locales,
    images: string[] = [],
  ): SitemapUrl[] => {
    const present = locales.filter((locale) => available.includes(locale));
    const languages: Record<string, string> = Object.fromEntries(
      present.map((locale) => [locale, absolute(build(locale))]),
    );
    languages["x-default"] = absolute(build(defaultLocale));
    return present.map((locale) => ({
      loc: absolute(build(locale)),
      ...(lastModified ? { lastModified } : {}),
      languages,
      images: images.map(absolute),
    }));
  };

  const fromItems = <T extends { slug: Localized; updatedAt: string }>(
    items: T[],
    title: (item: T) => Localized,
    route: (slug: string) => string,
    images?: (item: T) => CorpusImage[] | undefined,
  ) =>
    items.flatMap((item) =>
      entries(
        (locale) => localePath(locale, route(pickLocale(item.slug, locale))),
        item.updatedAt,
        locales.filter((locale) => hasLocale(title(item), locale)),
        imagePaths(images?.(item)),
      ),
    );

  const catalogUpdated = latest([
    ...corpus.categories.map((item) => item.updatedAt),
    ...corpus.products.map((item) => item.updatedAt),
  ]);
  const postsUpdated = latest(corpus.posts.map((item) => item.updatedAt));
  const homeUpdated = latest([corpus.settingsUpdatedAt, catalogUpdated, postsUpdated]);

  return [
    ...entries((locale) => localePath(locale, routes.home()), homeUpdated),
    ...entries((locale) => localePath(locale, routes.catalogue()), catalogUpdated),
    ...(corpus.categories.length
      ? entries((locale) => localePath(locale, routes.categories()), catalogUpdated)
      : []),
    ...fromItems(
      corpus.categories,
      (item) => item.name,
      routes.category,
      (item) => (item.image ? [item.image] : undefined),
    ),
    ...fromItems(
      corpus.products,
      (item) => item.name,
      routes.product,
      (item) => item.images,
    ),
    ...fromItems(
      corpus.pages,
      (item) => item.title,
      routes.page,
      (item) => (item.cover ? [item.cover] : undefined),
    ),
    ...entries((locale) => localePath(locale, routes.blog()), postsUpdated, blogLocales(corpus)),
    ...fromItems(
      corpus.posts,
      (item) => item.title,
      routes.post,
      (item) => (item.cover ? [item.cover] : undefined),
    ),
  ];
}

export function buildSitemap(corpus: Corpus, siteUrl: string): MetadataRoute.Sitemap {
  return buildSitemapUrls(corpus, siteUrl).map((url): Entry => ({
    url: url.loc,
    ...(url.lastModified ? { lastModified: url.lastModified } : {}),
    alternates: { languages: url.languages },
    ...(url.images.length ? { images: url.images } : {}),
  }));
}

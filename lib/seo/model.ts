import { pickRichText, richTextToPlain, type RichTextDoc } from "@/lib/content/rich-text";
import type { ProductSpec } from "@/lib/db/schema/catalog";
import type { pageKind } from "@/lib/db/schema/content";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import { pickLocale, type Localized } from "@/lib/i18n/localized";
import type { SiteSettings } from "@/lib/public/settings";

import { firstSentences } from "./text";

export type CorpusImage = {
  key: string;
  width: number | null;
  height: number | null;
  alt: Localized | null;
  caption: Localized | null;
};

export type CorpusBrand = {
  name: string;
  websiteUrl: string | null;
  description: Localized | null;
};

export type CorpusCategory = {
  id: string;
  parentId: string | null;
  slug: Localized;
  name: Localized;
  description: Localized<RichTextDoc> | null;
  seoTitle: Localized | null;
  seoDescription: Localized | null;
  image: CorpusImage | null;
  updatedAt: string;
};

export type CorpusProduct = {
  id: string;
  slug: Localized;
  name: Localized;
  sku: string | null;
  brand: string | null;
  shortDescription: Localized<RichTextDoc> | null;
  description: Localized<RichTextDoc> | null;
  benefits: Localized[];
  specs: ProductSpec[];
  categoryIds: string[];
  images: CorpusImage[];
  documents: { title: Localized; key: string }[];
  seoTitle: Localized | null;
  seoDescription: Localized | null;
  updatedAt: string;
};

type PageKind = (typeof pageKind.enumValues)[number];

export type CorpusPage = {
  id: string;
  kind: PageKind | null;
  slug: Localized;
  title: Localized;
  content: Localized<RichTextDoc> | null;
  cover: CorpusImage | null;
  seoTitle: Localized | null;
  seoDescription: Localized | null;
  updatedAt: string;
};

export type CorpusPost = {
  id: string;
  slug: Localized;
  title: Localized;
  excerpt: Localized | null;
  content: Localized<RichTextDoc> | null;
  cover: CorpusImage | null;
  seoTitle: Localized | null;
  seoDescription: Localized | null;
  publishedAt: string;
  updatedAt: string;
};

export type CorpusPerson = {
  name: Localized;
  role: Localized;
  phones: string[];
  email: string | null;
};

export type Corpus = {
  settings: SiteSettings;
  settingsUpdatedAt: string | null;
  brands: CorpusBrand[];
  categories: CorpusCategory[];
  products: CorpusProduct[];
  pages: CorpusPage[];
  posts: CorpusPost[];
  persons: CorpusPerson[];
};

export type EntityKind = "product" | "category" | "page" | "post";

export function hasLocale(field: Localized | null | undefined, locale: Locale): boolean {
  if (locale === defaultLocale) return true;
  return Boolean(field?.[locale]?.trim());
}

export function translatedIn(title: Localized): Locale[] {
  return locales.filter((locale) => hasLocale(title, locale));
}

export function localizedText(field: Localized | null | undefined, locale: Locale): string {
  return field ? pickLocale(field, locale).trim() : "";
}

export function plainText(
  field: Localized<RichTextDoc> | null | undefined,
  locale: Locale,
): string {
  return richTextToPlain(pickRichText(field, locale));
}

export function summaryText(
  summary: Localized<RichTextDoc> | null | undefined,
  body: Localized<RichTextDoc> | null | undefined,
  locale: Locale,
  max = 240,
): string {
  const text = plainText(summary, locale) || plainText(body, locale);
  return text ? firstSentences(text, max) : "";
}

export function entityTitle(
  entity: CorpusProduct | CorpusCategory | CorpusPage | CorpusPost,
): Localized {
  return "title" in entity ? entity.title : entity.name;
}

import { readFileSync } from "node:fs";
import path from "node:path";

import type { Locale } from "../../lib/i18n/config";

export type PerLocale<T> = Partial<Record<Locale, T>>;

export type CrawlSpecRow = { label: string; value: string; section?: boolean; group?: string };

export type CrawlGalleryItem = {
  image: string;
  caption: string;
  alt: string;
  image_file: string | null;
  image_broken?: boolean;
};

export type CrawlDocument = {
  title: string;
  url: string;
  language_hint?: string;
  file_type: string;
};

export type CrawlProductRecord = {
  wp_id: number;
  language: Locale;
  url: string;
  slug: string;
  suggested_slug: string;
  name: string;
  short_description: string;
  short_description_live: string;
  short_description_is_auto_excerpt: boolean;
  description_html: string;
  headings: string[];
  benefits: string[];
  specs: CrawlSpecRow[];
  gallery: CrawlGalleryItem[];
  cover_image: string | null;
  videos: unknown[];
  documents: CrawlDocument[];
  date: string;
};

export type CrawlProduct = {
  group: string;
  key: string;
  category_key: string;
  order: number;
  duplicate_posts: { wp_id: number; language: Locale; url: string }[];
  translations: PerLocale<CrawlProductRecord>;
};

export type CrawlCategoryRecord = {
  wp_id: number;
  slug: string;
  url: string;
  name: string;
  description: string;
  card_name: string | null;
  cover_image: string | null;
};

export type CrawlCategory = {
  key: string;
  order: number | null;
  parent_key: string | null;
  translations: PerLocale<CrawlCategoryRecord>;
};

export type CrawlPageRecord = {
  wp_id: number;
  slug: string;
  url: string;
  title: string;
  body_html: string;
  body_is_empty_placeholder: boolean;
};

export type CrawlPage = { role: string; translations: PerLocale<CrawlPageRecord> };

export type CrawlHomeBrand = {
  name: string;
  logo: string | null;
  image: string | null;
  text: string;
  link: string | null;
};

export type CrawlHome = {
  title_tag: string;
  hero: { headline: string; buttons: { label: string; url: string }[] };
  brands: CrawlHomeBrand[];
  categories_section: { heading: string | null };
  clients: { heading: string | null; logos: { image: string; alt: string }[] };
  featured_products: { heading: string | null; items: { title: string; url: string }[] };
};

export type CrawlPerson = { name: string; role: string; phones: string[]; emails: string[] };

export type CrawlContacts = {
  address: string | null;
  people: CrawlPerson[];
  whatsapp: string | null;
  emails: string[];
  phones: string[];
  working_hours: string | null;
  map: string | null;
};

export type CrawlContent = {
  categories: CrawlCategory[];
  products: CrawlProduct[];
  pages: CrawlPage[];
  home: PerLocale<CrawlHome>;
  contacts: PerLocale<CrawlContacts>;
  logo: PerLocale<string>;
  favicon: { url: string }[];
};

export type CrawlMediaItem = {
  original_url: string;
  file: string | null;
  sha1: string | null;
  width: number | null;
  height: number | null;
  kind: string;
  content_type: string;
  bytes: number;
};

export type CrawlRedirectPath = {
  path: string;
  language: Locale;
  type: string;
  role: string | null;
  wp_id: number | null;
  title: string;
  aliases: string[];
  translations: PerLocale<string>;
};

export type CrawlSeo = { title_tag: string | null; meta_description: string | null };

export type CrawlExtLink = { status: number; ctype: string; final: string };

export type Crawl = {
  dir: string;
  content: CrawlContent;
  media: Record<string, CrawlMediaItem>;
  seo: Map<string, CrawlSeo>;
  redirectPaths: CrawlRedirectPath[];
  extLinks: Record<string, CrawlExtLink>;
};

function readJson<T>(dir: string, name: string): T {
  return JSON.parse(readFileSync(path.join(dir, name), "utf8")) as T;
}

function seoKey(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname).replace(/\/+$/, "") || "/";
  } catch {
    return url;
  }
}

export function seoLookup(crawl: Crawl, url: string): CrawlSeo | null {
  return crawl.seo.get(seoKey(url)) ?? null;
}

export function loadCrawl(dir: string): Crawl {
  const seoRaw = readJson<Record<string, CrawlSeo>>(dir, "seo.json");
  return {
    dir,
    content: readJson<CrawlContent>(dir, "content.json"),
    media: readJson<{ items: Record<string, CrawlMediaItem> }>(dir, "media.json").items,
    seo: new Map(Object.entries(seoRaw).map(([url, value]) => [seoKey(url), value])),
    redirectPaths: readJson<CrawlRedirectPath[]>(dir, "redirect-paths.json"),
    extLinks: readJson<Record<string, CrawlExtLink>>(dir, "extlinks.json"),
  };
}

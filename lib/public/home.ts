import "server-only";

import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { publicTags } from "@/lib/cache/tags";
import { getDb } from "@/lib/db";
import {
  categories,
  logos,
  media,
  pages,
  productImages,
  products,
  projects,
  settings,
} from "@/lib/db/schema";
import type {
  CustomBlockLayout,
  CustomBlockTone,
  HomeSectionKey,
  SettingsCustomSection,
} from "@/lib/db/schema/settings";
import { pickRichText, type RichTextDoc } from "@/lib/content/rich-text";
import { localePath, type Locale } from "@/lib/i18n/config";
import { pickExact, pickLocale } from "@/lib/i18n/localized";
import { routes } from "@/lib/routes";
import { isCustomSection, normalizeHomeSections } from "@/lib/validation/home-sections";

import { productCards } from "./catalog";
import { splitProductName, toPublicImage, type PublicImage } from "./images";

export type HomeVideo = {
  src: string;
  type: string;
  label: string | null;
  autoplay: boolean;
  sound: boolean;
};

export type CustomBlock = {
  eyebrow: string | null;
  title: string | null;
  body: RichTextDoc | null;
  link: { label: string; href: string } | null;
  image: PublicImage | null;
  video: HomeVideo | null;
  poster: PublicImage | null;
  layout: CustomBlockLayout;
  mediaWidth: number;
  tone: CustomBlockTone;
};

export type HomeSection =
  | { key: HomeSectionKey; visible: boolean; title: string | null }
  | { key: "custom"; id: string; visible: boolean; block: CustomBlock };

export type HeroSlide = {
  id: string;
  title: string;
  lead: string | null;
  href: string | null;
  image: PublicImage;
  mobileImage: PublicImage | null;
};

export type HomeCategory = { id: string; name: string; href: string; image: PublicImage | null };

export type HomeProduct = {
  id: string;
  model: string;
  type: string | null;
  category: string | null;
  href: string;
  image: PublicImage | null;
  hoverImage: PublicImage | null;
};

export type HomeProject = {
  id: string;
  title: string;
  excerpt: string | null;
  client: string | null;
  isVisual: boolean;
  href: string;
  image: PublicImage;
};

export type HomeLogo = { id: string; name: string; url: string | null; image: PublicImage };

export type LogoGroup = {
  group: "partners";
  href: string | null;
  logos: HomeLogo[];
};

const imageColumns = {
  key: media.key,
  width: media.width,
  height: media.height,
  alt: media.alt,
  lqip: media.lqip,
};

const heroLimit = 3;
const productLimit = 6;
const projectLimit = 8;

const visibleProduct = and(eq(products.status, "published"), isNull(products.deletedAt));

function internalHref(href: string | null, locale: Locale): string | null {
  if (!href) return null;
  return href.startsWith("/") ? localePath(locale, href) : href;
}

async function configuredHeroSlides(locale: Locale): Promise<HeroSlide[]> {
  const [row] = await getDb()
    .select({ slides: settings.heroSlides })
    .from(settings)
    .where(eq(settings.id, 1));
  const slides = (row?.slides ?? []).slice(0, heroLimit);
  if (!slides.length) return [];
  const images = await getDb()
    .select({ id: media.id, ...imageColumns })
    .from(media)
    .where(
      inArray(
        media.id,
        slides.flatMap((slide) =>
          slide.mobileImageId ? [slide.imageId, slide.mobileImageId] : [slide.imageId],
        ),
      ),
    );
  const byId = new Map(images.map((image) => [image.id, image]));
  return slides.flatMap((slide, index) => {
    const title = pickLocale(slide.title, locale);
    const image = toPublicImage(byId.get(slide.imageId), locale, title);
    if (!image) return [];
    return [
      {
        id: `${slide.imageId}-${index}`,
        title,
        lead: slide.lead ? pickLocale(slide.lead, locale) || null : null,
        href: internalHref(slide.href, locale),
        image,
        mobileImage: slide.mobileImageId
          ? toPublicImage(byId.get(slide.mobileImageId), locale, title)
          : null,
      },
    ];
  });
}

async function roomPhotoHeroSlides(locale: Locale): Promise<HeroSlide[]> {
  const rows = await getDb()
    .selectDistinctOn([products.isFeatured, products.sortOrder, products.id], {
      productId: products.id,
      name: products.name,
      slug: products.slug,
      ...imageColumns,
    })
    .from(productImages)
    .innerJoin(products, eq(products.id, productImages.productId))
    .innerJoin(media, eq(media.id, productImages.mediaId))
    .where(
      and(
        visibleProduct,
        eq(media.cleanupStatus, "not-applicable"),
        sql`${media.width} >= 1600 and ${media.width} > ${media.height}`,
      ),
    )
    .orderBy(
      desc(products.isFeatured),
      asc(products.sortOrder),
      asc(products.id),
      asc(productImages.position),
    )
    .limit(heroLimit);
  return rows.flatMap((row) => {
    const { model, type } = splitProductName(pickLocale(row.name, locale));
    const image = toPublicImage(row, locale, model);
    if (!image) return [];
    return [
      {
        id: row.productId,
        title: model,
        lead: type,
        href: localePath(locale, routes.product(pickLocale(row.slug, locale))),
        image,
        mobileImage: null,
      },
    ];
  });
}

export async function getHeroSlides(locale: Locale): Promise<HeroSlide[]> {
  "use cache";
  cacheTag(publicTags.settings, publicTags.catalog);
  cacheLife("hours");
  const configured = await configuredHeroSlides(locale);
  return configured.length ? configured : roomPhotoHeroSlides(locale);
}

export async function getHomeCategories(locale: Locale): Promise<HomeCategory[]> {
  "use cache";
  cacheTag(publicTags.catalog);
  cacheLife("hours");
  const rows = await getDb()
    .select({ id: categories.id, slug: categories.slug, name: categories.name, ...imageColumns })
    .from(categories)
    .leftJoin(media, eq(media.id, categories.imageId))
    .where(and(isNull(categories.parentId), eq(categories.isActive, true)))
    .orderBy(asc(categories.sortOrder), asc(categories.createdAt));
  return rows.map((row) => {
    const name = pickLocale(row.name, locale);
    return {
      id: row.id,
      name,
      href: localePath(locale, routes.category(pickLocale(row.slug, locale))),
      image: toPublicImage(row, locale, name),
    };
  });
}

function pickWithFallback(
  field: { az: string; ru?: string | null; en?: string | null } | null,
  locale: Locale,
): string | null {
  return pickExact(field, locale) ?? pickExact(field, "az");
}

function toCustomBlock(
  section: SettingsCustomSection,
  files: Map<string, typeof media.$inferSelect>,
  locale: Locale,
): CustomBlock {
  const { block } = section;
  const title = pickWithFallback(section.title, locale);
  const file = block.mediaId ? files.get(block.mediaId) : undefined;
  const poster = block.posterId ? files.get(block.posterId) : undefined;
  const label = pickWithFallback(block.linkLabel, locale);
  const image = block.mediaKind === "image" ? toPublicImage(file, locale, title ?? "") : null;
  const video =
    block.mediaKind === "video" && file
      ? {
          src: routes.media(file.key),
          type: file.mimeType,
          label: file.alt ? pickLocale(file.alt, locale) || null : null,
          autoplay: block.autoplay,
          sound: block.sound,
        }
      : null;
  return {
    eyebrow: pickWithFallback(block.eyebrow, locale),
    title,
    body: pickRichText(block.body, locale),
    link: label && block.href ? { label, href: block.href } : null,
    image,
    video,
    poster: video ? toPublicImage(poster, locale, "") : null,
    layout: image || video ? block.layout : "media-top",
    mediaWidth: block.mediaWidth,
    tone: block.tone,
  };
}

export async function getHomeSections(locale: Locale): Promise<HomeSection[]> {
  "use cache";
  cacheTag(publicTags.settings, publicTags.catalog);
  cacheLife("hours");
  const [row] = await getDb()
    .select({ sections: settings.homeSections })
    .from(settings)
    .where(eq(settings.id, 1));
  const sections = normalizeHomeSections(row?.sections ?? []);
  const ids = sections.flatMap((section) =>
    isCustomSection(section)
      ? [section.block.mediaId, section.block.posterId].filter((id) => id !== null)
      : [],
  );
  const rows = ids.length ? await getDb().select().from(media).where(inArray(media.id, ids)) : [];
  const files = new Map(rows.map((file) => [file.id, file]));
  return sections.map((section) =>
    isCustomSection(section)
      ? {
          key: "custom",
          id: section.id,
          visible: section.visible,
          block: toCustomBlock(section, files, locale),
        }
      : {
          key: section.key,
          visible: section.visible,
          title: pickExact(section.title, locale),
        },
  );
}

async function productRows(featuredOnly: boolean) {
  const order = [asc(products.sortOrder), desc(products.publishedAt), asc(products.id)];
  return getDb()
    .select({ id: products.id, slug: products.slug, name: products.name })
    .from(products)
    .where(featuredOnly ? and(visibleProduct, eq(products.isFeatured, true)) : visibleProduct)
    .orderBy(...(featuredOnly ? [asc(products.featuredPosition), ...order] : order))
    .limit(productLimit);
}

export async function getFeaturedProducts(locale: Locale): Promise<HomeProduct[]> {
  "use cache";
  cacheTag(publicTags.catalog);
  cacheLife("hours");
  const featured = await productRows(true);
  const rows = featured.length ? featured : await productRows(false);
  if (!rows.length) return [];
  return productCards(rows, locale);
}

export async function getHomeProjects(locale: Locale): Promise<HomeProject[]> {
  "use cache";
  cacheTag(publicTags.content, publicTags.catalog);
  cacheLife("hours");
  const rows = await getDb()
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      excerpt: projects.excerpt,
      client: projects.clientName,
      type: projects.type,
      ...imageColumns,
    })
    .from(projects)
    .innerJoin(media, eq(media.id, projects.coverId))
    .where(eq(projects.status, "published"))
    .orderBy(asc(projects.sortOrder), desc(projects.createdAt))
    .limit(projectLimit);
  return rows.flatMap((row) => {
    const title = pickLocale(row.title, locale);
    const image = toPublicImage(row, locale, title);
    if (!image) return [];
    return [
      {
        id: row.id,
        title,
        excerpt: row.excerpt ? pickLocale(row.excerpt, locale) || null : null,
        client: row.client,
        isVisual: row.type === "3d-visual",
        href: localePath(locale, routes.project(pickLocale(row.slug, locale))),
        image,
      },
    ];
  });
}

export type PageKind = (typeof pages.kind.enumValues)[number];

export async function getPageLinks(locale: Locale): Promise<Partial<Record<PageKind, string>>> {
  "use cache";
  cacheTag(publicTags.content);
  cacheLife("hours");
  const rows = await getDb()
    .select({ kind: pages.kind, slug: pages.slug })
    .from(pages)
    .where(and(isNotNull(pages.kind), eq(pages.status, "published")));
  return Object.fromEntries(
    rows.flatMap((row) =>
      row.kind ? [[row.kind, localePath(locale, routes.page(pickLocale(row.slug, locale)))]] : [],
    ),
  );
}

export async function getLogoGroups(locale: Locale): Promise<LogoGroup[]> {
  "use cache";
  cacheTag(publicTags.content, publicTags.catalog);
  cacheLife("hours");
  const [rows, links] = await Promise.all([
    getDb()
      .select({
        id: logos.id,
        name: logos.name,
        url: logos.url,
        ...imageColumns,
      })
      .from(logos)
      .innerJoin(media, eq(media.id, logos.imageId))
      .where(and(eq(logos.isActive, true), eq(logos.group, "partners")))
      .orderBy(asc(logos.sortOrder), asc(logos.createdAt)),
    getPageLinks(locale),
  ]);
  const items = rows.flatMap((row) => {
    const image = toPublicImage(row, locale, row.name);
    return image ? [{ id: row.id, name: row.name, url: row.url, image }] : [];
  });
  return items.length ? [{ group: "partners", href: links.partners ?? null, logos: items }] : [];
}

export async function getCategoryImages(locale: Locale): Promise<Record<string, PublicImage>> {
  "use cache";
  cacheTag(publicTags.catalog);
  cacheLife("hours");
  const rows = await getDb()
    .select({ slug: categories.slug, name: categories.name, ...imageColumns })
    .from(categories)
    .innerJoin(media, eq(media.id, categories.imageId))
    .where(eq(categories.isActive, true));
  return Object.fromEntries(
    rows.flatMap((row) => {
      const image = toPublicImage(row, locale, pickLocale(row.name, locale));
      if (!image) return [];
      return [[localePath(locale, routes.category(pickLocale(row.slug, locale))), image]];
    }),
  );
}

import type { Metadata } from "next";

import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

import { ogImagePath, ogImageSize, openGraphLocales, siteName, type OgKind } from "./config";
import { clampText, descriptionLimits, fitTitle } from "./text";

export { openGraphLocales, siteName };

export type MetadataImage = {
  src: string;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
};

export type PageMetadataInput = {
  locale: Locale;
  title: string;
  description?: string | null;
  paths: Record<Locale, string>;
  availableLocales?: readonly Locale[];
  image?: MetadataImage | null;
  og?: { kind: OgKind; slug?: string } | null;
  absoluteTitle?: boolean;
  type?: "website" | "article";
  noIndex?: boolean;
  markdownPath?: string | null;
  publishedTime?: string | null;
  modifiedTime?: string | null;
};

type SocialImage = { src: string; width: number | null; height: number | null; alt: string };

function socialImage(input: PageMetadataInput, title: string): SocialImage {
  if (input.og) {
    return {
      src: ogImagePath(input.locale, input.og.kind, input.og.slug),
      ...ogImageSize,
      alt: title,
    };
  }
  if (input.image) {
    return {
      src: input.image.src,
      width: input.image.width ?? null,
      height: input.image.height ?? null,
      alt: input.image.alt?.trim() || title,
    };
  }
  return { src: ogImagePath(input.locale, "home"), ...ogImageSize, alt: title };
}

export function translatedLocales(available: readonly Locale[] | undefined): Locale[] {
  const present = available ? locales.filter((code) => available.includes(code)) : [...locales];
  return present.includes(defaultLocale) ? present : [defaultLocale, ...present];
}

export function pageMetadata(input: PageMetadataInput): Metadata {
  const { locale } = input;
  const reserved = input.absoluteTitle ? 0 : siteName.length + 3;
  const title = fitTitle(input.title, locale, reserved);
  const rawDescription = input.description?.trim();
  const description = rawDescription
    ? clampText(rawDescription, descriptionLimits[locale].max)
    : undefined;
  const translated = translatedLocales(input.availableLocales);
  const canonical = translated.includes(locale) ? input.paths[locale] : input.paths[defaultLocale];
  const image = socialImage(input, title);
  const languages: Record<string, string> = Object.fromEntries(
    translated.map((code) => [code, input.paths[code]]),
  );
  languages["x-default"] = input.paths[defaultLocale];
  const article = input.type === "article";

  return {
    title: input.absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical,
      languages,
      ...(input.markdownPath ? { types: { "text/markdown": input.markdownPath } } : {}),
    },
    openGraph: {
      type: input.type ?? "website",
      url: canonical,
      title,
      description,
      locale: openGraphLocales[locale],
      alternateLocale: translated
        .filter((code) => code !== locale)
        .map((code) => openGraphLocales[code]),
      siteName,
      images: [
        {
          url: image.src,
          alt: image.alt,
          ...(image.width && image.height ? { width: image.width, height: image.height } : {}),
        },
      ],
      ...(article && input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(article && input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image.src, alt: image.alt }],
    },
    robots: input.noIndex ? { index: false, follow: true } : undefined,
  };
}

export function paginatedPaths(
  paths: Record<Locale, string>,
  page: number,
): Record<Locale, string> {
  if (page < 2) return paths;
  return Object.fromEntries(
    Object.entries(paths).map(([code, path]) => [code, `${path}?page=${page}`]),
  ) as Record<Locale, string>;
}

export function paginatedText(text: string, page: number, suffix: string): string {
  return page < 2 ? text : `${text.replace(/[\s.]+$/, "")} – ${suffix}`;
}

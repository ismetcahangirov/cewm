import type { Metadata } from "next";

import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

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
  image?: MetadataImage | null;
  absoluteTitle?: boolean;
  type?: "website" | "article";
  noIndex?: boolean;
};

export const openGraphLocales: Record<Locale, string> = {
  az: "az_AZ",
  ru: "ru_RU",
  en: "en_US",
  de: "de_DE",
};

export const siteName = "CEWM";

type SocialImage = { src: string; width: number | null; height: number | null; alt: string };

function socialImage(input: PageMetadataInput): SocialImage | null {
  if (!input.image) return null;
  return {
    src: input.image.src,
    width: input.image.width ?? null,
    height: input.image.height ?? null,
    alt: input.image.alt?.trim() || input.title,
  };
}

export function pageMetadata(input: PageMetadataInput): Metadata {
  const description = input.description?.trim() || undefined;
  const canonical = input.paths[input.locale];
  const image = socialImage(input);
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description,
    alternates: {
      canonical,
      languages: { ...input.paths, "x-default": input.paths[defaultLocale] },
    },
    openGraph: {
      type: input.type ?? "website",
      url: canonical,
      title: input.title,
      description,
      locale: openGraphLocales[input.locale],
      alternateLocale: locales
        .filter((code) => code !== input.locale)
        .map((code) => openGraphLocales[code]),
      siteName,
      ...(image
        ? {
            images: [
              {
                url: image.src,
                alt: image.alt,
                ...(image.width && image.height
                  ? { width: image.width, height: image.height }
                  : {}),
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: input.title,
      description,
      ...(image ? { images: [{ url: image.src, alt: image.alt }] } : {}),
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

import type { Metadata } from "next";

import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

import { ogImageSize, ogImageUrl } from "./og";

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
  eyebrow: string;
  absoluteTitle?: boolean;
  type?: "website" | "article";
  noIndex?: boolean;
};

export const openGraphLocales: Record<Locale, string> = {
  az: "az_AZ",
  ru: "ru_RU",
  en: "en_US",
};

export const siteName = "Mebline";

type SocialImage = { src: string; width: number | null; height: number | null; alt: string };

function socialImage(input: PageMetadataInput): SocialImage {
  if (input.image) {
    return {
      src: input.image.src,
      width: input.image.width ?? null,
      height: input.image.height ?? null,
      alt: input.image.alt?.trim() || input.title,
    };
  }
  return {
    src: ogImageUrl({ eyebrow: input.eyebrow, title: input.title }),
    width: ogImageSize.width,
    height: ogImageSize.height,
    alt: input.title,
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
      images: [
        {
          url: image.src,
          alt: image.alt,
          ...(image.width && image.height ? { width: image.width, height: image.height } : {}),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
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

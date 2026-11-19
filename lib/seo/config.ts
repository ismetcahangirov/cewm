import { locales, type Locale } from "@/lib/i18n/config";

export const siteName = "CEWM";

export const siteAlternateName = "HOMAG Azerbaijan";

export const openGraphLocales: Record<Locale, string> = {
  az: "az_AZ",
  ru: "ru_RU",
  en: "en_US",
  de: "de_DE",
};

const languageNames: Record<Locale, Record<Locale, string>> = {
  az: { az: "Azərbaycanca", ru: "Rusca", en: "İngiliscə", de: "Almanca" },
  ru: { az: "Азербайджанский", ru: "Русский", en: "Английский", de: "Немецкий" },
  en: { az: "Azerbaijani", ru: "Russian", en: "English", de: "German" },
  de: { az: "Aserbaidschanisch", ru: "Russisch", en: "Englisch", de: "Deutsch" },
};

export function languageName(language: Locale, inLocale: Locale): string {
  return languageNames[inLocale][language];
}

export const ogImageSize = { width: 1200, height: 630 } as const;

export const ogKinds = [
  "home",
  "product",
  "category",
  "page",
  "post",
  "catalogue",
  "categories",
  "blog",
] as const;

export type OgKind = (typeof ogKinds)[number];

export function ogImagePath(locale: Locale, kind: OgKind, slug = "default"): string {
  return `/og/${locale}/${kind}/${encodeURIComponent(slug)}.png`;
}

export const reservedRootTextFiles = new Set(["robots", "llms", "llms-full", "humans", "security"]);

export const markdownSuffix = ".md";

export const publicLocales: readonly Locale[] = locales;

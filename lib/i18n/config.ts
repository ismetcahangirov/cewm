export const locales = ["az", "ru", "en", "de"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "az";

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (locales as readonly string[]).includes(value);
}

export function localePath(locale: Locale, path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return normalized;
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}

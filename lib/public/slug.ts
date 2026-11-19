import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { permanentRedirect } from "next/navigation";

import { localePath, locales, type Locale } from "@/lib/i18n/config";
import { pickLocale, type Localized } from "@/lib/i18n/localized";

export function slugMatches(column: AnyPgColumn, locale: Locale, slug: string): SQL {
  return sql`(${column}->>${locale} = ${slug} or (coalesce(${column}->>${locale}, '') = '' and ${column}->>'az' = ${slug}) or ${column}->>'az' = ${slug})`;
}

export function localizedPaths(
  slug: Localized,
  build: (slug: string) => string,
): Record<Locale, string> {
  return Object.fromEntries(
    locales.map((locale) => [locale, localePath(locale, build(pickLocale(slug, locale)))]),
  ) as Record<Locale, string>;
}

export function staticPaths(path: string): Record<Locale, string> {
  return Object.fromEntries(locales.map((locale) => [locale, localePath(locale, path)])) as Record<
    Locale,
    string
  >;
}

export function redirectToCanonicalSlug(
  slug: Localized,
  locale: Locale,
  requested: string,
  build: (slug: string) => string,
  search = "",
): void {
  const canonical = pickLocale(slug, locale);
  if (canonical !== requested)
    permanentRedirect(`${localePath(locale, build(canonical))}${search}`);
}

export function slugRank(column: AnyPgColumn, locale: Locale, slug: string): SQL {
  return sql`(${column}->>${locale} = ${slug}) desc`;
}

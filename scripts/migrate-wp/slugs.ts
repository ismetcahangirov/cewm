import { locales, type Locale } from "../../lib/i18n/config";
import { slugify, uniqueSlug } from "../../lib/slug";

export type SlugMap = Record<Locale, string | null>;

const languageSuffix = /-(?:az|ru|en|de)$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSaneOldSlug(slug: string | null | undefined): slug is string {
  return Boolean(slug) && slugPattern.test(slug as string) && !languageSuffix.test(slug as string);
}

export type SlugInput = {
  name: string | null;
  oldSlug?: string | null;
};

export type SlugDecision = { slug: string; origin: "old" | "derived" };

export function decideSlug(input: SlugInput): SlugDecision | null {
  if (isSaneOldSlug(input.oldSlug)) return { slug: input.oldSlug, origin: "old" };
  const derived = input.name ? slugify(input.name) : "";
  return derived ? { slug: derived, origin: "derived" } : null;
}

export type SlugAssignment<K extends string> = {
  key: K;
  slugs: SlugMap;
  origins: Record<Locale, "old" | "derived" | null>;
};

export function assignSlugs<K extends string>(
  inputs: { key: K; byLocale: Record<Locale, SlugInput> }[],
  reserved: readonly string[] = [],
): SlugAssignment<K>[] {
  const taken = Object.fromEntries(locales.map((locale) => [locale, new Set(reserved)])) as Record<
    Locale,
    Set<string>
  >;
  const olds = inputs.map((input) =>
    locales.map((locale) => [locale, decideSlug(input.byLocale[locale])] as const),
  );
  for (const row of olds) {
    for (const [locale, decision] of row) {
      if (decision?.origin === "old") taken[locale].add(decision.slug);
    }
  }
  return inputs.map((input, index) => {
    const slugs = {} as SlugMap;
    const origins = {} as Record<Locale, "old" | "derived" | null>;
    for (const [locale, decision] of olds[index]) {
      if (!decision) {
        slugs[locale] = null;
        origins[locale] = null;
      } else if (decision.origin === "old") {
        slugs[locale] = decision.slug;
        origins[locale] = "old";
      } else {
        slugs[locale] = uniqueSlug(decision.slug, taken[locale]);
        origins[locale] = "derived";
      }
    }
    return { key: input.key, slugs, origins };
  });
}

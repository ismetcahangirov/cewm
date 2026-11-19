import { localePath, type Locale } from "@/lib/i18n/config";
import { pickLocale } from "@/lib/i18n/localized";
import { routes } from "@/lib/routes";

import { hasLocale, localizedText, type Corpus } from "./model";

export function homeOfferCatalog(corpus: Corpus, locale: Locale): { name: string; url: string }[] {
  return corpus.categories
    .filter((category) => !category.parentId && hasLocale(category.name, locale))
    .map((category) => ({
      name: localizedText(category.name, locale),
      url: localePath(locale, routes.category(pickLocale(category.slug, locale))),
    }));
}

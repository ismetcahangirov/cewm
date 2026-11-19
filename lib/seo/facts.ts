import { pickExact } from "@/lib/i18n/localized";
import { locales, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { fill } from "@/lib/i18n/format";

import { languageName, siteName } from "./config";
import {
  hasLocale,
  localizedText,
  summaryText,
  type Corpus,
  type CorpusCategory,
  type CorpusProduct,
} from "./model";
import { firstSentences } from "./text";

export type Fact = { label: string; value: string };

export type FactBlock = {
  id: string;
  heading: string;
  answer: string;
  facts: Fact[];
};

type FactLabels = {
  keyFacts: string;
  brands: string;
  languages: string;
  machinesCount: string;
  categoriesCount: string;
  machines: string;
  model: string;
  category: string;
  keySpecs: string;
};

export const factLabels: Record<Locale, FactLabels> = {
  az: {
    keyFacts: "Əsas faktlar",
    brands: "Brendlər",
    languages: "Sayt dilləri",
    machinesCount: "Kataloqdakı avadanlıq",
    categoriesCount: "Kateqoriyalar",
    machines: "Avadanlıq",
    model: "Model",
    category: "Kateqoriya",
    keySpecs: "Əsas göstəricilər",
  },
  ru: {
    keyFacts: "Ключевые факты",
    brands: "Бренды",
    languages: "Языки сайта",
    machinesCount: "Оборудования в каталоге",
    categoriesCount: "Категорий",
    machines: "Оборудование",
    model: "Модель",
    category: "Категория",
    keySpecs: "Основные параметры",
  },
  en: {
    keyFacts: "Key facts",
    brands: "Brands",
    languages: "Site languages",
    machinesCount: "Machines in the catalogue",
    categoriesCount: "Categories",
    machines: "Machines",
    model: "Model",
    category: "Category",
    keySpecs: "Key specifications",
  },
  de: {
    keyFacts: "Wichtige Fakten",
    brands: "Marken",
    languages: "Sprachen der Website",
    machinesCount: "Maschinen im Katalog",
    categoriesCount: "Kategorien",
    machines: "Maschinen",
    model: "Modell",
    category: "Kategorie",
    keySpecs: "Wichtige Kenndaten",
  },
};

const keySpecLimit = 6;
const answerLimit = 260;

export function companyName(corpus: Corpus): string {
  return corpus.settings.legalName?.trim() || siteName;
}

export function companyStatement(corpus: Corpus, locale: Locale, dict: Dictionary): string {
  return pickExact(corpus.settings.seoDescription, locale) ?? dict.meta.description;
}

export function contactFacts(corpus: Corpus, locale: Locale, dict: Dictionary): Fact[] {
  const { settings } = corpus;
  const rows: Fact[] = [];
  const address = localizedText(settings.address, locale);
  if (address) rows.push({ label: dict.contact.address, value: address });
  for (const phone of settings.phones) {
    rows.push({
      label: localizedText(phone.label, locale) || dict.contact.phone,
      value: phone.number,
    });
  }
  if (settings.emails.length) {
    rows.push({ label: dict.contact.email, value: settings.emails.join(", ") });
  }
  const hours = localizedText(settings.workingHours, locale);
  if (hours) rows.push({ label: dict.contact.hours, value: hours });
  return rows;
}

export function companyFactBlock(corpus: Corpus, locale: Locale, dict: Dictionary): FactBlock {
  const labels = factLabels[locale];
  const rows: Fact[] = contactFacts(corpus, locale, dict);
  if (corpus.brands.length) {
    rows.push({ label: labels.brands, value: corpus.brands.map((brand) => brand.name).join(", ") });
  }
  rows.push({ label: labels.machinesCount, value: String(corpus.products.length) });
  rows.push({
    label: labels.categoriesCount,
    value: String(corpus.categories.filter((category) => !category.parentId).length),
  });
  rows.push({
    label: labels.languages,
    value: locales.map((code) => languageName(code, locale)).join(", "),
  });
  return {
    id: "company-facts",
    heading: `${companyName(corpus)}: ${labels.keyFacts}`,
    answer: companyStatement(corpus, locale, dict),
    facts: rows,
  };
}

export function productSpecFacts(product: CorpusProduct, locale: Locale): Fact[] {
  return product.specs.flatMap((spec) => {
    const label = localizedText(spec.label, locale);
    const value = localizedText(spec.value, locale);
    if (!label || !value) return [];
    const unit = spec.unit ? localizedText(spec.unit, locale) : "";
    return [{ label, value: unit ? `${value} ${unit}` : value }];
  });
}

export function productCategory(corpus: Corpus, product: CorpusProduct): CorpusCategory | null {
  const id = product.categoryIds[0];
  return corpus.categories.find((category) => category.id === id) ?? null;
}

export function productFactBlock(
  corpus: Corpus,
  product: CorpusProduct,
  locale: Locale,
  dict: Dictionary,
): FactBlock {
  const labels = factLabels[locale];
  const name = localizedText(product.name, locale);
  const category = productCategory(corpus, product);
  const rows: Fact[] = [];
  if (product.brand) rows.push({ label: dict.product.brand, value: product.brand });
  if (product.sku) rows.push({ label: labels.model, value: product.sku });
  if (category) rows.push({ label: labels.category, value: localizedText(category.name, locale) });
  rows.push(...productSpecFacts(product, locale).slice(0, keySpecLimit));
  return {
    id: "product-facts",
    heading: `${name}: ${labels.keyFacts}`,
    answer:
      summaryText(product.shortDescription, product.description, locale, answerLimit) ||
      fill(dict.product.description, { name }),
    facts: rows,
  };
}

export function categoryFactBlock(
  corpus: Corpus,
  category: CorpusCategory,
  locale: Locale,
  dict: Dictionary,
): FactBlock {
  const labels = factLabels[locale];
  const name = localizedText(category.name, locale);
  const members = corpus.products.filter(
    (product) => product.categoryIds.includes(category.id) && hasLocale(product.name, locale),
  );
  const rows: Fact[] = [{ label: labels.machinesCount, value: String(members.length) }];
  if (members.length) {
    rows.push({
      label: labels.machines,
      value: members
        .slice(0, 12)
        .map((product) => localizedText(product.name, locale))
        .join("; "),
    });
  }
  return {
    id: "category-facts",
    heading: `${name}: ${labels.keyFacts}`,
    answer:
      firstSentences(summaryText(category.description, null, locale, 400), answerLimit) ||
      fill(dict.catalog.categoryDescription, { name }),
    facts: rows,
  };
}

export function factBlockMarkdown(block: FactBlock): string {
  return [
    `**${block.answer}**`,
    "",
    ...block.facts.map((fact) => `- ${fact.label}: ${fact.value}`),
  ].join("\n");
}

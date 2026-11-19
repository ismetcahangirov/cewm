import { localePath, locales, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { routes } from "@/lib/routes";

import { languageName } from "./config";
import { companyFactBlock, companyName, companyStatement, contactFacts, factLabels } from "./facts";
import {
  categoryMarkdown,
  categoryUrl,
  pageMarkdown,
  pageUrl,
  postMarkdown,
  postUrl,
  productMarkdown,
  productUrl,
} from "./markdown";
import { hasLocale, localizedText, summaryText, type Corpus } from "./model";

export type LlmsContext = { corpus: Corpus; locale: Locale; dict: Dictionary; siteUrl: string };

export function llmsPath(locale: Locale, full = false): string {
  return localePath(locale, full ? "/llms-full.txt" : "/llms.txt");
}

function link(title: string, target: string, note?: string): string {
  return note ? `- [${title}](${target}): ${note}` : `- [${title}](${target})`;
}

function visible(context: LlmsContext) {
  const { corpus, locale } = context;
  return {
    categories: corpus.categories.filter((item) => hasLocale(item.name, locale)),
    products: corpus.products.filter((item) => hasLocale(item.name, locale)),
    pages: corpus.pages.filter((item) => hasLocale(item.title, locale)),
    posts: corpus.posts.filter((item) => hasLocale(item.title, locale)),
  };
}

function header(context: LlmsContext): string[] {
  const { corpus, locale, dict } = context;
  const company = companyFactBlock(corpus, locale, dict);
  return [
    `# ${companyName(corpus)}`,
    "",
    `> ${companyStatement(corpus, locale, dict)}`,
    "",
    ...company.facts.map((fact) => `- ${fact.label}: ${fact.value}`),
  ];
}

export function buildLlmsTxt(context: LlmsContext): string {
  const { corpus, locale, dict, siteUrl } = context;
  const absolute = (path: string) => new URL(path, siteUrl).toString();
  const items = visible(context);
  const labels = factLabels[locale];
  const lines = header(context);

  const roots = items.categories.filter((category) => !category.parentId);
  if (roots.length) {
    lines.push("", `## ${dict.catalog.categories}`, "");
    for (const category of roots) {
      const count = items.products.filter((product) =>
        product.categoryIds.includes(category.id),
      ).length;
      const summary = summaryText(category.description, null, locale, 140);
      const note = [summary, `${labels.machinesCount}: ${count}`].filter(Boolean).join(" ");
      lines.push(link(localizedText(category.name, locale), categoryUrl(context, category), note));
    }
  }

  if (items.products.length) {
    lines.push("", `## ${labels.machines}`, "");
    for (const product of items.products) {
      const summary = summaryText(product.shortDescription, product.description, locale, 150);
      const note = [product.brand, summary].filter(Boolean).join(". ");
      lines.push(
        link(localizedText(product.name, locale), productUrl(context, product), note || undefined),
      );
    }
  }

  if (items.pages.length || items.posts.length) {
    lines.push("", `## ${dict.meta.siteName}`, "");
    for (const page of items.pages)
      lines.push(link(localizedText(page.title, locale), pageUrl(context, page)));
    if (items.posts.length)
      lines.push(
        link(dict.blog.title, absolute(localePath(locale, routes.blog())), dict.blog.description),
      );
    for (const post of items.posts)
      lines.push(link(localizedText(post.title, locale), postUrl(context, post)));
  }

  lines.push("", `## ${labels.languages}`, "");
  for (const code of locales) {
    lines.push(link(languageName(code, locale), absolute(llmsPath(code))));
  }

  lines.push(
    "",
    "## Optional",
    "",
    link(`${companyName(corpus)}: full text`, absolute(llmsPath(locale, true))),
  );
  lines.push(link("Sitemap", absolute("/sitemap.xml")));
  if (corpus.settings.catalogueFile) {
    lines.push(link(dict.common.catalogue, absolute(corpus.settings.catalogueFile.src)));
  }
  return `${lines.join("\n")}\n`;
}

export function buildLlmsFullTxt(context: LlmsContext): string {
  const { corpus, locale, dict } = context;
  const items = visible(context);
  const labels = factLabels[locale];
  const lines = header(context);
  const contact = contactFacts(corpus, locale, dict);
  if (!contact.length) lines.push("");

  const roots = items.categories.filter((category) => !category.parentId);
  if (roots.length) {
    lines.push("", `## ${dict.catalog.categories}`, "");
    for (const category of roots) lines.push(categoryMarkdown(context, category, { level: 3 }), "");
  }
  if (items.products.length) {
    lines.push(`## ${labels.machines}`, "");
    for (const product of items.products)
      lines.push(productMarkdown(context, product, { level: 3 }), "");
  }
  if (items.pages.length) {
    lines.push(`## ${dict.meta.siteName}`, "");
    for (const page of items.pages) lines.push(pageMarkdown(context, page, { level: 3 }), "");
  }
  if (items.posts.length) {
    lines.push(`## ${dict.blog.title}`, "");
    for (const post of items.posts) lines.push(postMarkdown(context, post, { level: 3 }), "");
  }
  return `${lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()}\n`;
}

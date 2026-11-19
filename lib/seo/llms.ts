import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { publicTags } from "@/lib/cache/tags";
import { getDb } from "@/lib/db";
import { categories, pages } from "@/lib/db/schema";
import { defaultLocale, localePath, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pickExact, pickLocale } from "@/lib/i18n/localized";
import { getSiteSettings } from "@/lib/public/settings";
import { routes } from "@/lib/routes";

export type LlmsLink = { title: string; path: string; note?: string | null };

export type LlmsSource = {
  name: string;
  summary: string;
  legalName: string | null;
  catalogue: LlmsLink[];
  sections: LlmsLink[];
  pages: LlmsLink[];
  contact: { label: string; value: string }[];
  locales: { locale: Locale; path: string }[];
};

function list(links: LlmsLink[], siteUrl: string): string[] {
  return links.map((link) => {
    const url = new URL(link.path, siteUrl).toString();
    return link.note ? `- [${link.title}](${url}): ${link.note}` : `- [${link.title}](${url})`;
  });
}

export function buildLlmsTxt(source: LlmsSource, siteUrl: string): string {
  const lines = [`# ${source.name}`, "", `> ${source.summary}`];
  if (source.legalName && source.legalName !== source.name) lines.push("", source.legalName);
  const blocks: [string, string[]][] = [
    ["Catalogue", list(source.catalogue, siteUrl)],
    ["Sections", list(source.sections, siteUrl)],
    ["Pages", list(source.pages, siteUrl)],
    ["Contact", source.contact.map((item) => `- ${item.label}: ${item.value}`)],
    [
      "Languages",
      source.locales.map((item) => `- ${item.locale}: ${new URL(item.path, siteUrl).toString()}`),
    ],
  ];
  for (const [heading, items] of blocks) {
    if (items.length) lines.push("", `## ${heading}`, "", ...items);
  }
  return `${lines.join("\n")}\n`;
}

export async function getLlmsSource(): Promise<LlmsSource> {
  "use cache";
  cacheTag(publicTags.catalog, publicTags.content, publicTags.settings);
  cacheLife("hours");
  const locale = defaultLocale;
  const db = getDb();
  const [dict, settings, categoryRows, pageRows] = await Promise.all([
    getDictionary(locale),
    getSiteSettings(),
    db
      .select({ slug: categories.slug, name: categories.name })
      .from(categories)
      .where(and(isNull(categories.parentId), eq(categories.isActive, true)))
      .orderBy(asc(categories.sortOrder), asc(categories.createdAt)),
    db
      .select({ slug: pages.slug, title: pages.title })
      .from(pages)
      .where(eq(pages.status, "published"))
      .orderBy(asc(pages.createdAt)),
  ]);
  const address = settings.address ? pickLocale(settings.address, locale) : "";
  const hours = settings.workingHours ? pickLocale(settings.workingHours, locale) : "";
  return {
    name: dict.meta.siteName,
    summary: pickExact(settings.seoDescription, locale) ?? dict.meta.description,
    legalName: settings.legalName,
    catalogue: [
      { title: dict.common.allProducts, path: routes.catalogue() },
      ...categoryRows.map((row) => ({
        title: pickLocale(row.name, locale),
        path: routes.category(pickLocale(row.slug, locale)),
      })),
    ],
    sections: [{ title: dict.blog.title, path: routes.blog(), note: dict.blog.description }],
    pages: pageRows.map((row) => ({
      title: pickLocale(row.title, locale),
      path: routes.page(pickLocale(row.slug, locale)),
    })),
    contact: [
      ...settings.phones.map((phone) => ({
        label: pickLocale(phone.label, locale) || dict.contact.phone,
        value: phone.number,
      })),
      ...settings.emails.map((email) => ({ label: dict.contact.email, value: email })),
      ...(address ? [{ label: dict.contact.address, value: address }] : []),
      ...(hours ? [{ label: dict.contact.hours, value: hours }] : []),
    ],
    locales: locales.map((item) => ({
      locale: item,
      path: localePath(item, routes.home()),
    })),
  };
}

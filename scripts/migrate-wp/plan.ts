import path from "node:path";

import { richTextToPlain, summarize } from "../../lib/content/rich-text";
import { locales, type Locale } from "../../lib/i18n/config";
import { normalizeAzerbaijaniPhone } from "../../lib/phone";
import {
  seoLookup,
  type Crawl,
  type CrawlProduct,
  type CrawlProductRecord,
  type CrawlSpecRow,
} from "./crawl";
import {
  cleanDescription,
  htmlPlain,
  htmlToRichText,
  leadParagraph,
  paragraphDoc,
  sanitizeHtml,
} from "./html";
import type {
  BrandPlan,
  CategoryPlan,
  ClientPlan,
  DocumentPlan,
  Docs,
  EntityRef,
  Flag,
  FlagKind,
  HomePlan,
  MediaPlan,
  PagePlan,
  PersonPlan,
  Plan,
  ProductPlan,
  SettingsPlan,
  SpecRowPlan,
  Texts,
} from "./plan-types";
import { assignSlugs } from "./slugs";
import {
  cleanText,
  hasMixedScriptWord,
  isShouting,
  judgeText,
  languageProblem,
  repairMixedScript,
  sentenceCaseIfShouting,
  trimTo,
} from "./text";
import { splitLabelUnit, splitValueUnit } from "./units";

const siteSuffix = /\s+[—–-]\s+CEWM \| HOMAG Azerbaijan$/;

export const lowResolutionWidth = 1200;

export const reservedPageSlugs = ["mehsullar", "mehsul", "kateqoriyalar", "bloq"];

const seedCategorySlugs: Record<string, string> = {
  cutting: "kesme",
  edgebanding: "kenar-ortme",
  cnc: "cnc-emal-merkezleri",
  drilling: "desme-ve-skant-vurma",
  assembly: "montaj-texnologiyasi",
  packing: "qablasdirma-texnologiyasi",
  software: "proqram-teminati",
};

function perLocale<T>(make: (locale: Locale) => T): Record<Locale, T> {
  return Object.fromEntries(locales.map((locale) => [locale, make(locale)])) as Record<Locale, T>;
}

export function stripSiteSuffix(title: string | null | undefined): string {
  return cleanText(title).replace(siteSuffix, "");
}

class Context {
  readonly flags: Flag[] = [];
  readonly notes: string[] = [];
  readonly media = new Map<string, MediaPlan>();
  constructor(readonly crawl: Crawl) {}

  flag(
    kind: FlagKind,
    entity: EntityRef,
    detail: string,
    where: { locale?: Locale; field?: string } = {},
  ): void {
    this.flags.push({ kind, entity, detail, ...where });
  }

  mediaFor(url: string | null | undefined, usedBy: string, alt?: Partial<Record<Locale, string>>) {
    if (!url) return null;
    const items = this.crawl.media;
    const item = items[url] ?? items[encodeURI(url)] ?? items[decodeURI(url)];
    if (!item?.file || !item.sha1) return null;
    let plan = this.media.get(item.sha1);
    if (!plan) {
      plan = {
        sha1: item.sha1,
        file: path.join(this.crawl.dir, item.file),
        contentType: item.content_type,
        width: item.width,
        height: item.height,
        urls: [],
        alt: {},
        altFallback: null,
        usedBy: [],
        lowResolution: (item.width ?? Infinity) < lowResolutionWidth,
      };
      this.media.set(item.sha1, plan);
    }
    if (!plan.urls.includes(item.original_url)) plan.urls.push(item.original_url);
    if (!plan.usedBy.includes(usedBy)) plan.usedBy.push(usedBy);
    for (const [locale, text] of Object.entries(alt ?? {})) {
      if (text && !plan.alt[locale as Locale]) plan.alt[locale as Locale] = text;
    }
    return plan;
  }
}

function emptyTexts(): Texts {
  return { az: null, ru: null, en: null, de: null };
}

function emptyDocs(): Docs {
  return { az: null, ru: null, en: null, de: null };
}

function judgeField(
  ctx: Context,
  entity: EntityRef,
  value: string | null | undefined,
  locale: Locale,
  field: string,
): string | null {
  const verdict = judgeText(value, locale);
  if (verdict.problem) {
    const kind: FlagKind = verdict.problem === "mixed-script" ? "mixed-script" : "wrong-language";
    ctx.flag(
      kind,
      entity,
      `${field}: ${verdict.problem}, not imported (left empty): "${trimTo(cleanText(value), 90)}"`,
      { locale, field },
    );
  }
  return verdict.text;
}

function productEntity(group: CrawlProduct, name: string): EntityRef {
  return { type: "product", key: `wp-product:${group.group}`, label: name };
}

function recordsOf(product: CrawlProduct): [Locale, CrawlProductRecord][] {
  return locales.flatMap((locale) => {
    const record = product.translations[locale];
    return record ? [[locale, record] as [Locale, CrawlProductRecord]] : [];
  });
}

function benefitRows(
  ctx: Context,
  entity: EntityRef,
  product: CrawlProduct,
): { rows: Texts[]; counts: Record<Locale, number> } {
  const lists = perLocale((locale) =>
    (product.translations[locale]?.benefits ?? []).map((text) =>
      judgeField(ctx, entity, text, locale, "benefits"),
    ),
  );
  const counts = perLocale((locale) => lists[locale].length);
  const size = Math.max(...locales.map((locale) => lists[locale].length));
  const rows: Texts[] = [];
  for (let index = 0; index < size; index++) {
    const row = perLocale((locale) => lists[locale][index] ?? null);
    if (!row.az) {
      const others = locales
        .filter((locale) => row[locale])
        .map((locale) => `${locale}: ${row[locale]}`);
      if (others.length) {
        ctx.flag(
          "benefit-mismatch",
          entity,
          `benefit ${index + 1} has no Azerbaijani text, not imported. Add it in the admin: ${others.join(" | ")}`,
          { field: "benefits" },
        );
      }
      continue;
    }
    rows.push(row);
  }
  const lengths = new Set(locales.map((locale) => counts[locale]));
  if (lengths.size > 1) {
    ctx.flag(
      "benefit-mismatch",
      entity,
      `the languages have different numbers of benefits (${locales.map((l) => `${l} ${counts[l]}`).join(", ")}); rows are paired by position, check the pairing`,
      { field: "benefits" },
    );
  }
  return { rows, counts };
}

type ParsedSpec = { label: string | null; value: string | null; unit: string | null };

function parseSpecs(
  ctx: Context,
  entity: EntityRef,
  rows: CrawlSpecRow[],
  locale: Locale,
  droppedSections: string[],
): ParsedSpec[] {
  const parsed: ParsedSpec[] = [];
  let section: string | null = null;
  let qualifying = false;
  for (const row of rows) {
    const label = cleanText(row.label);
    if (row.section || (!cleanText(row.value) && !label.includes("["))) {
      section = label;
      qualifying = true;
      droppedSections.push(label);
      continue;
    }
    let text = label;
    if (qualifying && section && /^\p{Ll}/u.test(text)) text = `${section}: ${text}`;
    else qualifying = false;
    const split = splitLabelUnit(text);
    const labelText = judgeText(split.value, locale);
    const valueText = judgeText(row.value, locale);
    if (labelText.problem || valueText.problem) {
      const kind: FlagKind =
        labelText.problem === "mixed-script" || valueText.problem === "mixed-script"
          ? "mixed-script"
          : "wrong-language";
      ctx.flag(
        kind,
        entity,
        `spec row "${trimTo(label, 60)}": wrong-language or corrupted text, row left empty in this language`,
        { locale, field: "specs" },
      );
      parsed.push({ label: null, value: null, unit: null });
      continue;
    }
    parsed.push({ label: labelText.text, value: valueText.text, unit: split.unit });
  }
  return parsed;
}

function specRows(ctx: Context, entity: EntityRef, product: CrawlProduct): SpecRowPlan[] {
  const dropped: Record<Locale, string[]> = { az: [], ru: [], en: [], de: [] };
  const lists = perLocale((locale) =>
    parseSpecs(ctx, entity, product.translations[locale]?.specs ?? [], locale, dropped[locale]),
  );
  const counts = perLocale((locale) => lists[locale].length);
  const size = Math.max(...locales.map((locale) => lists[locale].length));
  const result: SpecRowPlan[] = [];
  for (let index = 0; index < size; index++) {
    const cells = perLocale((locale) => lists[locale][index] ?? null);
    const az = cells.az;
    if (!az?.label || !az.value) {
      const others = locales
        .filter((locale) => cells[locale]?.label)
        .map((locale) => `${locale}: ${cells[locale]?.label} = ${cells[locale]?.value ?? ""}`);
      if (others.length) {
        ctx.flag(
          "spec-mismatch",
          entity,
          `spec row ${index + 1} has no Azerbaijani label or value, not imported. Add it in the admin: ${others.join(" | ")}`,
          { field: "specs" },
        );
      }
      continue;
    }
    const label = perLocale((locale) => cells[locale]?.label ?? null);
    const value = perLocale((locale) => cells[locale]?.value ?? null);
    const present = locales.filter((locale) => value[locale]);
    const splits = present.map((locale) => ({
      locale,
      ...splitValueUnit(value[locale] as string),
    }));
    let unit: Texts | null = null;
    const azSplit = splits.find((split) => split.locale === "az");
    const bareNumber = /^[\d\s.,/–—\-±|]+$/;
    if (azSplit?.unit && splits.every((split) => split.unit || bareNumber.test(split.value))) {
      unit = emptyTexts();
      for (const split of splits) {
        unit[split.locale] = split.unit;
        value[split.locale] = split.value;
      }
    } else if (cells.az?.unit && locales.every((locale) => !value[locale] || cells[locale]?.unit)) {
      unit = perLocale((locale) => cells[locale]?.unit ?? null);
    }
    result.push({ label, value, unit });
  }
  if (new Set(Object.values(counts)).size > 1) {
    ctx.flag(
      "spec-mismatch",
      entity,
      `the languages have different numbers of spec rows (${locales.map((l) => `${l} ${counts[l]}`).join(", ")}); each language was imported as it is, rows paired by position, check the table in every language`,
      { field: "specs" },
    );
  }
  const sections = new Set(locales.flatMap((locale) => dropped[locale]));
  if (sections.size) {
    ctx.flag(
      "cleaned",
      entity,
      `spec group headers dropped (the data model has no spec groups): ${[...sections].join("; ")}`,
      { field: "specs" },
    );
  }
  return result;
}

function documentPlans(ctx: Context, entity: EntityRef, product: CrawlProduct): DocumentPlan[] {
  const byUrl = new Map<string, DocumentPlan>();
  for (const [locale, record] of recordsOf(product)) {
    for (const doc of record.documents) {
      const link = ctx.crawl.extLinks[doc.url];
      const alive = Boolean(link && [200, 206].includes(link.status) && /pdf/i.test(link.ctype));
      if (!alive) {
        if (locale === "ru" || !product.translations.ru?.documents.some((d) => d.url === doc.url)) {
          const known = ctx.flags.some(
            (flag) =>
              flag.kind === "dead-link" &&
              flag.entity.key === entity.key &&
              flag.detail.includes(doc.url),
          );
          if (!known) {
            ctx.flag(
              "dead-link",
              entity,
              `brochure link skipped (${link ? `HTTP ${link.status}` : "not checked"}): ${doc.url}`,
              { locale, field: "documents" },
            );
          }
        }
        continue;
      }
      const existing = byUrl.get(doc.url) ?? {
        url: doc.url,
        downloadUrl: link?.final ?? doc.url,
        title: emptyTexts(),
      };
      const title = repairMixedScript(
        cleanText(doc.title).replace(/\s*\((?:PDF|ZIP)[^)]*\)\s*$/i, ""),
        locale,
      );
      existing.title[locale] = trimTo(title, 160) || null;
      byUrl.set(doc.url, existing);
    }
  }
  return [...byUrl.values()];
}

function seoTitleOf(ctx: Context, url: string, locale: Locale, name: string | null): string | null {
  if (!name) return null;
  const tag = stripSiteSuffix(seoLookup(ctx.crawl, url)?.title_tag);
  const repaired = repairMixedScript(tag, locale);
  if (!repaired || hasMixedScriptWord(repaired) || languageProblem(repaired, locale)) return null;
  return trimTo(repaired, 120);
}

function seoDescriptionOf(doc: Docs[Locale], fallback: string | null): string | null {
  const plain = doc ? richTextToPlain(doc) : (fallback ?? "");
  return plain ? summarize(plain, 160) : null;
}

function buildProduct(ctx: Context, product: CrawlProduct, featured: Set<string>): ProductPlan {
  const records = recordsOf(product);
  const nameFor = (locale: Locale) =>
    cleanText(product.translations[locale]?.name ?? product.translations.az?.name ?? "");
  const entity = productEntity(product, nameFor("az") || product.key);

  const name = emptyTexts();
  for (const [locale, record] of records) {
    name[locale] = judgeField(ctx, entity, record.name, locale, "name");
  }

  const shortDescription = emptyDocs();
  const description = emptyDocs();
  const derivedShort: Record<Locale, boolean> = { az: false, ru: false, en: false, de: false };
  for (const [locale, record] of records) {
    let short = judgeField(
      ctx,
      entity,
      record.short_description_live || record.short_description,
      locale,
      "shortDescription",
    );
    let derived = !record.short_description_live && Boolean(short);
    if (!short && !record.short_description_live) {
      const lead = leadParagraph(record.description_html);
      const verdict = lead ? judgeText(lead, locale) : { text: null, problem: null };
      short = verdict.text;
      derived = Boolean(short);
    }
    if (derived && short) {
      derivedShort[locale] = true;
      ctx.flag(
        "derived",
        entity,
        "short description derived from the bold lead sentence of the description (the old site showed none); the lead was removed from the body so it is not repeated",
        { locale, field: "shortDescription" },
      );
    }
    shortDescription[locale] = paragraphDoc(short);

    const cleaned = cleanDescription(repairMixedScript(record.description_html, locale), {
      leadToRemove: derivedShort[locale] ? short : null,
    });
    for (const fragment of cleaned.removedFragments) {
      ctx.flag("cleaned", entity, `brochure fragment removed from the body: ${fragment}`, {
        locale,
        field: "description",
      });
    }
    const keptParagraphs: string[] = [];
    for (const html of cleaned.html.split("\n").filter(Boolean)) {
      const plain = htmlPlain(html);
      const problem = hasMixedScriptWord(plain)
        ? "mixed-script"
        : (languageProblem(plain, locale) ??
          (locale !== "ru" && /[Ѐ-ӿ]{4}/.test(plain) ? "cyrillic-in-latin-language" : null));
      if (problem) {
        ctx.flag(
          problem === "mixed-script" ? "mixed-script" : "wrong-language",
          entity,
          `description paragraph not imported (${problem}): "${trimTo(plain, 90)}"`,
          { locale, field: "description" },
        );
        continue;
      }
      keptParagraphs.push(html);
    }
    description[locale] = keptParagraphs.length ? htmlToRichText(keptParagraphs.join("\n")) : null;
  }
  if (product.translations.en && !name.en) {
    ctx.flag(
      "missing-translation",
      entity,
      "the English record is written in Russian; no English text was imported, the page falls back to Azerbaijani",
      { locale: "en" },
    );
  }

  for (const [locale, record] of records) {
    const headingProblems = record.headings.filter((heading) => hasMixedScriptWord(heading));
    for (const heading of headingProblems) {
      ctx.flag(
        "corrupted-heading",
        entity,
        `corrupted section heading "${heading}" in the source; headings are not imported, the page template supplies the ${locale} heading`,
        { locale, field: "headings" },
      );
    }
  }

  const { rows: benefits } = benefitRows(ctx, entity, product);
  const specs = specRows(ctx, entity, product);

  const coverUrl =
    product.translations.ru?.cover_image ?? records.find(([, r]) => r.cover_image)?.[1].cover_image;
  const imageOrder: string[] = [];
  const altBySha: Record<string, Partial<Record<Locale, string>>> = {};
  const galleries = perLocale(() => new Set<string>());
  const note = (sha1: string, locale: Locale, caption: string | null) => {
    if (!imageOrder.includes(sha1)) imageOrder.push(sha1);
    galleries[locale].add(sha1);
    if (caption) (altBySha[sha1] ??= {})[locale] = trimTo(caption, 250);
  };
  const cover = ctx.mediaFor(coverUrl, entity.label);
  if (cover) {
    imageOrder.push(cover.sha1);
    for (const locale of locales)
      if (product.translations[locale]) galleries[locale].add(cover.sha1);
  }
  const orderedRecords = [...records].sort(([a], [b]) => (a === "ru" ? -1 : b === "ru" ? 1 : 0));
  for (const [locale, record] of orderedRecords) {
    for (const item of record.gallery) {
      const media = ctx.mediaFor(item.image, entity.label);
      if (!media) {
        if (locale === "ru" || !record.gallery.length) {
          ctx.flag(
            "missing-image",
            entity,
            `gallery image missing on the old site (404): ${item.image}`,
            {
              field: "gallery",
            },
          );
        }
        continue;
      }
      const caption = judgeField(ctx, entity, item.caption, locale, "gallery caption");
      note(media.sha1, locale, caption);
    }
  }
  const sizes = new Set(locales.map((locale) => [...galleries[locale]].sort().join(",")));
  if (sizes.size > 1) {
    ctx.flag(
      "gallery-mismatch",
      entity,
      `the languages show different gallery images (${locales.map((l) => `${l} ${galleries[l].size}`).join(", ")}); the union is imported, one gallery for every language`,
      { field: "gallery" },
    );
  }
  for (const sha1 of imageOrder) {
    const plan = ctx.media.get(sha1);
    if (!plan) continue;
    const alt = altBySha[sha1] ?? {};
    for (const [locale, text] of Object.entries(alt)) {
      if (text && !plan.alt[locale as Locale]) plan.alt[locale as Locale] = text;
    }
    plan.altFallback ??= name.az ?? entity.label;
  }

  const documents = documentPlans(ctx, entity, product);
  for (const doc of documents) {
    if (!doc.title.az) {
      const first = locales.map((l) => doc.title[l]).find(Boolean) ?? null;
      doc.title.az = first;
    }
  }

  const seoTitle = emptyTexts();
  const seoDescription = emptyTexts();
  for (const [locale, record] of records) {
    seoTitle[locale] = seoTitleOf(ctx, record.url, locale, name[locale]);
    seoDescription[locale] = name[locale]
      ? seoDescriptionOf(shortDescription[locale], htmlPlain(record.description_html))
      : null;
  }

  return {
    legacyKey: entity.key,
    group: product.group,
    categoryKey: product.category_key,
    order: product.order,
    name,
    slug: { az: null, ru: null, en: null, de: null },
    oldSlug: perLocale((locale) => product.translations[locale]?.slug ?? null),
    shortDescription,
    description,
    benefits,
    specs,
    images: imageOrder.filter((sha1) => ctx.media.has(sha1)).map((sha1) => ({ sha1 })),
    documents,
    seoTitle,
    seoDescription,
    wpIds: Object.fromEntries(records.map(([locale, record]) => [locale, record.wp_id])),
    droppedWpIds: product.duplicate_posts.map((post) => post.wp_id),
    featured: featured.has(product.group),
  };
}

function flagMissingTranslations(ctx: Context, product: ProductPlan, label: string): void {
  const entity: EntityRef = { type: "product", key: product.legacyKey, label };
  for (const field of ["shortDescription", "description"] as const) {
    const others = locales.filter((locale) => locale !== "az" && product[field][locale]);
    if (!product[field].az && others.length) {
      ctx.flag(
        "missing-translation",
        entity,
        `${field} has text in ${others.join(", ")} but none in az; the admin requires Azerbaijani, so it was not imported (add the Azerbaijani text first)`,
        { field },
      );
    }
  }
  const present = (locale: Locale) => ({
    name: Boolean(product.name[locale]),
    "short description": Boolean(product.shortDescription[locale]),
    description: Boolean(product.description[locale]),
    benefits: product.benefits.some((row) => row[locale]),
    specs: product.specs.some((row) => row.value[locale]),
  });
  const base = present("az");
  const empty = Object.entries(base)
    .filter(([, value]) => !value)
    .map(([field]) => field);
  if (empty.length) {
    ctx.flag("missing-translation", entity, `empty in every language: ${empty.join(", ")}`, {
      field: empty.join(", "),
    });
  }
  for (const locale of locales) {
    if (locale === "az") continue;
    const here = present(locale);
    const gaps = Object.entries(base)
      .filter(([field, value]) => value && !here[field as keyof typeof here])
      .map(([field]) => field);
    if (gaps.length) {
      ctx.flag("missing-translation", entity, `empty in ${locale}: ${gaps.join(", ")}`, { locale });
    }
  }
}

function flagLimits(ctx: Context, product: ProductPlan, label: string): void {
  const entity: EntityRef = { type: "product", key: product.legacyKey, label };
  const over: string[] = [];
  const check = (texts: Texts, max: number, field: string) => {
    for (const locale of locales) {
      if ((texts[locale]?.length ?? 0) > max) over.push(`${field} (${locale})`);
    }
  };
  check(product.name, 200, "name");
  product.benefits.forEach((row, index) => check(row, 200, `benefit ${index + 1}`));
  product.specs.forEach((row, index) => {
    check(row.label, 120, `spec ${index + 1} label`);
    check(row.value, 250, `spec ${index + 1} value`);
    if (row.unit) check(row.unit, 30, `spec ${index + 1} unit`);
  });
  if (over.length) {
    ctx.flag(
      "cleaned",
      entity,
      `text longer than the admin field limit: ${over.join(", ")}; kept in full, the admin asks to shorten it the next time the product is saved`,
    );
  }
}

function buildCategories(ctx: Context): CategoryPlan[] {
  const categories = ctx.crawl.content.categories.filter((category) => category.parent_key);
  const slugs = assignSlugs(
    categories.map((category) => ({
      key: category.key,
      byLocale: perLocale((locale) => {
        const record = category.translations[locale];
        return { name: cleanText(record?.name) || null, oldSlug: record?.slug };
      }),
    })),
  );
  const seenDescription = new Map<string, string>();
  return categories
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((category, index) => {
      const entity: EntityRef = {
        type: "category",
        key: `wp-category:${category.key}`,
        label: cleanText(category.translations.az?.name) || category.key,
      };
      const name = emptyTexts();
      const description = emptyDocs();
      const seoTitle = emptyTexts();
      const seoDescription = emptyTexts();
      for (const locale of locales) {
        const record = category.translations[locale];
        if (!record) continue;
        name[locale] = judgeField(ctx, entity, record.name, locale, "name");
        const text = judgeField(ctx, entity, record.description, locale, "description");
        const signature = `${locale}:${text}`;
        if (text && seenDescription.has(signature)) {
          ctx.flag(
            "duplicate-dropped",
            entity,
            `description is a copy of the ${seenDescription.get(signature)} description on the old hub page; left empty, write a new text`,
            { locale, field: "description" },
          );
        } else if (text) {
          seenDescription.set(signature, entity.label);
          description[locale] = paragraphDoc(text);
        }
        seoTitle[locale] = seoTitleOf(ctx, record.url, locale, name[locale]);
        seoDescription[locale] = seoDescriptionOf(description[locale], null);
      }
      const record = category.translations.ru ?? category.translations.az;
      const image = ctx.mediaFor(
        record?.cover_image,
        entity.label,
        perLocale((l) => name[l] ?? undefined),
      );
      const slug = slugs.find((entry) => entry.key === category.key)?.slugs ?? {
        az: null,
        ru: null,
        en: null,
        de: null,
      };
      for (const locale of locales) {
        if (category.translations[locale] && !description[locale] && locale === "az") {
          ctx.flag("missing-translation", entity, "no description in az", { locale });
        }
      }
      return {
        legacyKey: entity.key,
        key: category.key,
        order: index,
        name,
        slug,
        oldSlug: perLocale((locale) => category.translations[locale]?.slug ?? null),
        description,
        imageSha1: image?.sha1 ?? null,
        seoTitle,
        seoDescription,
        seedSlugAz: seedCategorySlugs[category.key] ?? null,
      };
    });
}

function buildBrands(ctx: Context): BrandPlan[] {
  const home = ctx.crawl.content.home;
  const names = ["LEUCO", "Saf Teknik", "Scheuch"];
  const brands: BrandPlan[] = [
    {
      legacyKey: "wp-brand:homag",
      name: "HOMAG",
      slug: "homag",
      description: emptyTexts(),
      websiteUrl: null,
      logoSha1: null,
      order: 0,
    },
  ];
  for (const [index, name] of names.entries()) {
    const entity: EntityRef = { type: "brand", key: `wp-brand:${name}`, label: name };
    const description = emptyTexts();
    let link: string | null = null;
    let logo: string | null = null;
    for (const locale of locales) {
      const entry = home[locale]?.brands.find((brand) => brand.name === name);
      if (!entry) continue;
      description[locale] = judgeField(ctx, entity, entry.text, locale, "description");
      if (description[locale] && description[locale].length > 2000) {
        description[locale] = trimTo(description[locale], 2000);
      }
      link ??= entry.link;
      logo ??= entry.logo;
    }
    const media = ctx.mediaFor(logo, name);
    ctx.flag(
      "not-imported",
      entity,
      "the brand photo shown on the old home page has no field in the data model; only the logo was imported",
    );
    brands.push({
      legacyKey: entity.key,
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      description,
      websiteUrl: link,
      logoSha1: media?.sha1 ?? null,
      order: index + 1,
    });
  }
  ctx.flag(
    "missing-translation",
    { type: "brand", key: "wp-brand:homag", label: "HOMAG" },
    "no logo and no description on the old site; add both in the admin",
  );
  return brands;
}

function buildClients(ctx: Context): ClientPlan[] {
  const logos = ctx.crawl.content.home.az?.clients.logos ?? [];
  const plans: ClientPlan[] = [];
  for (const [index, logo] of logos.entries()) {
    const number = String(index + 1).padStart(2, "0");
    const entity: EntityRef = {
      type: "client",
      key: `wp-client:${number}`,
      label: `[Müştəri ${number}]`,
    };
    const media = ctx.mediaFor(logo.image, entity.label);
    if (!media) continue;
    ctx.flag(
      "placeholder",
      entity,
      "the old site gives no name for this client logo; the name is a placeholder, type the real company name",
    );
    plans.push({ legacyKey: entity.key, name: entity.label, imageSha1: media.sha1, order: index });
  }
  return plans;
}

function buildPersons(ctx: Context): PersonPlan[] {
  const contacts = ctx.crawl.content.contacts;
  const count = Math.max(...locales.map((locale) => contacts[locale]?.people.length ?? 0));
  const whatsappDigits = (contacts.az?.whatsapp ?? contacts.ru?.whatsapp ?? "").replace(/\D/g, "");
  const persons: PersonPlan[] = [];
  for (let index = 0; index < count; index++) {
    const name = emptyTexts();
    const role = emptyTexts();
    const phones: string[] = [];
    let email: string | null = null;
    for (const locale of locales) {
      const person = contacts[locale]?.people[index];
      if (!person) continue;
      name[locale] = cleanText(person.name) || null;
      role[locale] = cleanText(person.role) || null;
      for (const phone of person.phones) {
        const normalized = normalizeAzerbaijaniPhone(phone);
        if (normalized && !phones.includes(normalized)) phones.push(normalized);
      }
      email ??= person.emails[0] ?? null;
    }
    const whatsapp = phones.find((phone) => phone.slice(1) === whatsappDigits) ?? null;
    persons.push({
      legacyName: name.az ?? `person-${index}`,
      name,
      role,
      phones,
      email,
      whatsapp,
      order: index,
    });
  }
  ctx.flag(
    "cleaned",
    { type: "person", key: "wp-person", label: "Director" },
    "the director's e-mail link pointed at a placeholder (contact@example.com); the displayed address was used",
  );
  return persons;
}

function buildPages(ctx: Context): PagePlan[] {
  const wanted: Record<string, "contact" | "consultation"> = {
    contact: "contact",
    consultation: "consultation",
  };
  const pages = ctx.crawl.content.pages.filter((page) => wanted[page.role]);
  const slugs = assignSlugs(
    pages.map((page) => ({
      key: page.role,
      byLocale: perLocale((locale) => ({
        name: cleanText(page.translations[locale]?.title) || null,
      })),
    })),
    reservedPageSlugs,
  );
  const plans = pages.map((page): PagePlan => {
    const entity: EntityRef = {
      type: "page",
      key: `wp-page:${page.role}`,
      label: cleanText(page.translations.az?.title) || page.role,
    };
    const title = emptyTexts();
    const content = emptyDocs();
    const seoTitle = emptyTexts();
    const seoDescription = emptyTexts();
    for (const locale of locales) {
      const record = page.translations[locale];
      if (!record) continue;
      title[locale] = judgeField(ctx, entity, record.title, locale, "title");
      seoTitle[locale] = seoTitleOf(ctx, record.url, locale, title[locale]);
      if (page.role === "consultation" && record.body_html) {
        const root = sanitizeHtml(record.body_html);
        for (const heading of root.querySelectorAll("h2")) {
          if (cleanText(heading.text) === cleanText(record.title)) heading.remove();
        }
        const html = repairMixedScript(root.toString(), locale);
        const plain = htmlPlain(html);
        if (plain && !languageProblem(plain, locale) && !hasMixedScriptWord(plain)) {
          content[locale] = htmlToRichText(html);
        }
        seoDescription[locale] = seoDescriptionOf(content[locale], null);
      }
    }
    if (page.role === "contact") {
      ctx.flag(
        "not-imported",
        entity,
        "the old contact page body repeats the address and the two contact persons; the new page builds it from the contact persons and the settings",
      );
    }
    return {
      legacyKey: entity.key,
      kind: wanted[page.role],
      title,
      slug: slugs.find((entry) => entry.key === page.role)?.slugs ?? {
        az: null,
        ru: null,
        en: null,
        de: null,
      },
      content,
      seoTitle,
      seoDescription,
    };
  });
  return plans;
}

function buildHome(ctx: Context, groupByWpId: Map<number, string>): HomePlan {
  const entity: EntityRef = { type: "home", key: "wp-home", label: "Home" };
  const home = ctx.crawl.content.home;
  const heroHeadline = emptyTexts();
  const heroCtaLabel = emptyTexts();
  const titles = {
    categories: emptyTexts(),
    products: emptyTexts(),
    clients: emptyTexts(),
  };
  for (const locale of locales) {
    const entry = home[locale];
    if (!entry) continue;
    const headline = judgeField(ctx, entity, entry.hero.headline, locale, "hero headline");
    heroHeadline[locale] = headline;
    if (headline && isShouting(headline)) {
      heroHeadline[locale] = sentenceCaseIfShouting(headline, locale);
      if (heroHeadline[locale] === headline) {
        ctx.flag(
          "cleaned",
          entity,
          "hero headline is ALL CAPS on the old site; kept as written, retype it in normal case",
          { locale, field: "hero" },
        );
      }
    }
    const label = judgeField(ctx, entity, entry.hero.buttons[0]?.label, locale, "hero button");
    heroCtaLabel[locale] = label ? sentenceCaseIfShouting(label, locale) : null;
    titles.categories[locale] = judgeField(
      ctx,
      entity,
      entry.categories_section.heading,
      locale,
      "categories title",
    );
    titles.clients[locale] = judgeField(
      ctx,
      entity,
      entry.clients.heading,
      locale,
      "clients title",
    );
    titles.products[locale] = judgeField(
      ctx,
      entity,
      entry.featured_products.heading,
      locale,
      "products title",
    );
    for (const [field, value] of Object.entries(titles)) {
      if (!value[locale]) {
        ctx.flag(
          "missing-translation",
          entity,
          `home section title "${field}" is empty in ${locale}`,
          {
            locale,
            field: "home",
          },
        );
      }
    }
  }
  ctx.flag(
    "not-imported",
    entity,
    "the old hero video and the second hero button (labelled About, pointing at the consultation page) were not imported; the new hero is the scroll film",
  );
  const featuredGroups = (home.az?.featured_products.items ?? []).flatMap((item) => {
    const id = Number(/\/(\d+)\/?$/.exec(item.url)?.[1]);
    const group = groupByWpId.get(id);
    return group ? [group] : [];
  });
  ctx.flag(
    "derived",
    entity,
    "featured products are the six products of the old latest-posts block; change them in Home sections",
  );
  return {
    heroHeadline,
    heroCtaLabel,
    heroCtaHref: "/mehsullar",
    titles,
    featuredGroups,
  };
}

function buildSettings(ctx: Context, persons: PersonPlan[]): SettingsPlan {
  const content = ctx.crawl.content;
  const entity: EntityRef = { type: "settings", key: "wp-settings", label: "Settings" };
  const address = emptyTexts();
  const source = cleanText(content.contacts.az?.address ?? content.contacts.ru?.address);
  for (const locale of locales) address[locale] = source || null;
  const phones: { label: Texts; number: string }[] = [];
  for (const person of persons) {
    for (const number of person.phones) {
      if (!phones.some((phone) => phone.number === number))
        phones.push({ label: person.role, number });
    }
  }
  const emails = [...new Set(content.contacts.az?.emails ?? content.contacts.ru?.emails ?? [])];
  const whatsapp = (content.contacts.az?.whatsapp ?? content.contacts.ru?.whatsapp ?? "").replace(
    /\D/g,
    "",
  );
  const seoTitle = emptyTexts();
  for (const locale of locales) {
    const tag = cleanText(content.home[locale]?.title_tag);
    seoTitle[locale] = tag || null;
  }
  const logo = ctx.mediaFor(content.logo.az ?? content.logo.ru, "logo");
  const favicon = ctx.mediaFor(content.favicon[0]?.url, "favicon");
  ctx.flag(
    "placeholder",
    entity,
    "the address is English text on every old language page and is used for all four languages; translate it if needed. The old site has no opening hours, map link, company e-mail or SEO descriptions: fill them in Settings",
  );
  ctx.flag(
    "not-imported",
    entity,
    "no dark-background logo variant exists on the old site; the favicon is the HOMAG favicon of the old site, replace it with the CEWM one",
  );
  return {
    phones,
    emails,
    address,
    whatsappNumber: whatsapp || null,
    seoTitle,
    logoLightSha1: logo?.sha1 ?? null,
    faviconSha1: favicon?.sha1 ?? null,
  };
}

export function buildPlan(crawl: Crawl): Plan {
  const ctx = new Context(crawl);
  const groupByWpId = new Map<number, string>();
  for (const product of crawl.content.products) {
    for (const locale of locales) {
      const id = product.translations[locale]?.wp_id;
      if (id) groupByWpId.set(id, product.group);
    }
    for (const duplicate of product.duplicate_posts)
      groupByWpId.set(duplicate.wp_id, product.group);
  }

  const home = buildHome(ctx, groupByWpId);
  const featured = new Set(home.featuredGroups);
  const products = crawl.content.products
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((product) => buildProduct(ctx, product, featured));

  const slugs = assignSlugs(
    products.map((product) => ({
      key: product.legacyKey,
      byLocale: perLocale((locale) => ({ name: product.name[locale] })),
    })),
  );
  for (const product of products) {
    product.slug = slugs.find((entry) => entry.key === product.legacyKey)?.slugs ?? product.slug;
    flagMissingTranslations(ctx, product, product.name.az ?? product.legacyKey);
    flagLimits(ctx, product, product.name.az ?? product.legacyKey);
  }

  const categories = buildCategories(ctx);
  const brands = buildBrands(ctx);
  const clients = buildClients(ctx);
  const persons = buildPersons(ctx);
  const pages = buildPages(ctx);
  const settings = buildSettings(ctx, persons);

  for (const plan of ctx.media.values()) {
    if (plan.lowResolution && plan.usedBy.length) {
      ctx.flag(
        "low-resolution",
        { type: "media", key: plan.sha1, label: path.basename(plan.file) },
        `${plan.width}x${plan.height} px, below ${lowResolutionWidth} px; kept, replace with a larger file. Used by: ${plan.usedBy.join("; ")}`,
      );
    }
  }
  const duplicates = crawl.content.products.flatMap((product) => product.duplicate_posts);
  for (const duplicate of duplicates) {
    const kept = crawl.content.products.find(
      (product) => product.group === groupByWpId.get(duplicate.wp_id),
    );
    ctx.flag(
      "duplicate-dropped",
      {
        type: "product",
        key: `wp-product:${kept?.group}`,
        label: cleanText(kept?.translations.az?.name),
      },
      `duplicate Azerbaijani post ${duplicate.wp_id} (Russian text) not imported; its address redirects to the kept record`,
    );
  }
  ctx.notes.push(
    "SEO titles come from the old title tags without the site suffix. SEO descriptions are derived from the short description or the first paragraph, because the old site had no meta descriptions.",
  );
  ctx.notes.push(
    "Products are imported as published. All 32 are attributed to the HOMAG brand (every brochure and name on the old site is HOMAG's).",
  );
  return {
    products,
    categories,
    brands,
    clients,
    persons,
    pages,
    home,
    settings,
    media: ctx.media,
    flags: ctx.flags,
    notes: ctx.notes,
  };
}

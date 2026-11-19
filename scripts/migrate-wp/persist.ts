import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { and, eq, isNull, sql } from "drizzle-orm";
import sharp from "sharp";

import { createBrand, updateBrand } from "../../lib/admin/brands";
import { createCategory, updateCategory } from "../../lib/admin/categories";
import { createClientLogo, updateClientLogo } from "../../lib/admin/client-logos";
import { createContactPerson, updateContactPerson } from "../../lib/admin/contact-persons";
import { getAdminHomeSections, saveHomeSections } from "../../lib/admin/home-sections";
import { completeUpload } from "../../lib/admin/media";
import { savePage } from "../../lib/admin/pages";
import { saveProduct } from "../../lib/admin/products";
import { saveRedirect } from "../../lib/admin/redirects";
import { readSettingsRow, saveSettings } from "../../lib/admin/settings";
import { getDb } from "../../lib/db";
import {
  brands,
  categories,
  clientLogos,
  contactPersons,
  media,
  pages,
  products,
  redirects,
} from "../../lib/db/schema";
import type { Locale } from "../../lib/i18n/config";
import { locales } from "../../lib/i18n/config";
import type { Localized } from "../../lib/i18n/localized";
import { slugify } from "../../lib/slug";
import { brandInputSchema } from "../../lib/validation/brands";
import { categoryInputSchema } from "../../lib/validation/categories";
import { clientLogoInputSchema } from "../../lib/validation/client-logos";
import { contactPersonInputSchema } from "../../lib/validation/contact-persons";
import { homeSectionsInputSchema } from "../../lib/validation/home-sections";
import { mediaTypes, type MediaType } from "../../lib/validation/media";
import { pageInputSchema } from "../../lib/validation/pages";
import { productInputSchema, type ProductValues } from "../../lib/validation/products";
import { redirectInputSchema } from "../../lib/validation/redirects";
import { settingsInputSchema } from "../../lib/validation/settings";
import type { MediaPlan, Plan, Texts } from "./plan-types";
import type { RedirectEntry } from "./redirects";

export type Counter = { created: number; adopted: number; updated: number; unchanged: number };

export type RunSummary = Record<string, Counter> & {
  uploads: Counter;
};

export type PersistOptions = {
  update: boolean;
  skipDocuments: boolean;
  log: (line: string) => void;
};

export type PersistResult = {
  summary: RunSummary;
  ids: Map<string, string>;
  mediaKeys: Map<string, string>;
  failedDocuments: string[];
  overflows: { product: string; fields: string[] }[];
};

const seedHeadlineAz = "Azərbaycanda HOMAG ağac emalı avadanlıqları";

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortKeys(item)]),
    );
  }
  return value;
}

function canon(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function counter(): Counter {
  return { created: 0, adopted: 0, updated: 0, unchanged: 0 };
}

function summaryOf(): RunSummary {
  const names = [
    "media",
    "documents",
    "categories",
    "brands",
    "products",
    "pages",
    "clients",
    "persons",
    "settings",
    "home",
    "redirects",
  ];
  const summary = Object.fromEntries(names.map((name) => [name, counter()])) as RunSummary;
  summary.uploads = counter();
  return summary;
}

function localized(texts: Texts): Localized {
  return { az: texts.az ?? "", ru: texts.ru, en: texts.en, de: texts.de };
}

function localizedOrNull(texts: Texts | null): Localized | null {
  return texts?.az ? localized(texts) : null;
}

function docs(value: Record<Locale, unknown>) {
  return { az: value.az, ru: value.ru, en: value.en, de: value.de } as never;
}

type Failure = { error: { message: string; fields?: Record<string, string> } };

function unwrap<T extends object>(result: T, what: string): Exclude<T, Failure> {
  if ("error" in result) {
    const { error } = result as unknown as Failure;
    throw new Error(`${what}: ${error.message} ${JSON.stringify(error.fields ?? {})}`);
  }
  return result as Exclude<T, Failure>;
}

class Storage {
  private readonly client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  }

  close(): void {
    this.client.destroy();
  }
}

const formatToType: Record<string, MediaType> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heif: "image/avif",
};

async function detectType(body: Buffer): Promise<MediaType | null> {
  if (body.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  try {
    const meta = await sharp(body).metadata();
    return meta.format ? (formatToType[meta.format] ?? null) : null;
  } catch {
    return null;
  }
}

function altFor(plan: MediaPlan): Localized {
  const az = plan.alt.az ?? plan.altFallback ?? plan.usedBy[0] ?? "";
  return {
    az,
    ru: plan.alt.ru ?? null,
    en: plan.alt.en ?? null,
    de: plan.alt.de ?? null,
  };
}

export async function persist(
  plan: Plan,
  redirectEntries: RedirectEntry[],
  options: PersistOptions,
): Promise<PersistResult> {
  const db = getDb();
  const storage = new Storage();
  const summary = summaryOf();
  const ids = new Map<string, string>();
  const mediaIds = new Map<string, string>();
  const mediaKeys = new Map<string, string>();
  const documentIds = new Map<string, string>();
  const failedDocuments: string[] = [];
  const downloadCauses = new Set<string>();
  const overflows: { product: string; fields: string[] }[] = [];
  const log = options.log;

  async function ensureMedia(
    legacyKey: string,
    sourceUrl: string,
    body: () => Promise<Buffer | null>,
    baseName: string,
    alt: Localized | null,
    bucket: Counter,
  ): Promise<{ id: string; key: string } | null> {
    const [known] = await db.select().from(media).where(eq(media.legacyKey, legacyKey));
    if (known) {
      bucket.unchanged += 1;
      return { id: known.id, key: known.key };
    }
    const bytes = await body();
    if (!bytes) return null;
    const type = await detectType(bytes);
    if (!type) throw new Error(`Unsupported file content: ${baseName}`);
    const digest = createHash("sha256").update(bytes).digest("hex");
    const key = `uploads/wp/${slugify(baseName).slice(0, 60) || "file"}-${digest.slice(0, 8)}.${mediaTypes[type].extension}`;
    const [byKey] = await db.select().from(media).where(eq(media.key, key));
    if (!byKey) {
      await storage.put(key, bytes, type);
      summary.uploads.created += 1;
    }
    const result = await completeUpload(key, alt);
    if (!("media" in result)) throw new Error(`${baseName}: ${result.message}`);
    const id = result.media.id;
    await db
      .update(media)
      .set({ legacyKey, sourceUrl })
      .where(and(eq(media.id, id), isNull(media.legacyKey)));
    if (result.status === "created") bucket.created += 1;
    else bucket.adopted += 1;
    return { id, key: result.media.key };
  }

  log(`media: ${plan.media.size} files`);
  for (const item of plan.media.values()) {
    const found = await ensureMedia(
      `wp-media:${item.sha1}`,
      item.urls[0],
      () => readFile(item.file),
      path.basename(item.file, path.extname(item.file)),
      altFor(item),
      summary.media,
    );
    if (found) {
      mediaIds.set(item.sha1, found.id);
      mediaKeys.set(item.sha1, found.key);
    }
    if (found && options.update) {
      await db
        .update(media)
        .set({ alt: altFor(item) })
        .where(eq(media.id, found.id));
    }
  }

  const documentUrls = new Map<string, string>();
  for (const product of plan.products) {
    for (const doc of product.documents) documentUrls.set(doc.url, doc.downloadUrl);
  }
  if (!options.skipDocuments) {
    log(`documents: ${documentUrls.size} brochures`);
    for (const [url, downloadUrl] of documentUrls) {
      const found = await ensureMedia(
        `wp-doc:${downloadUrl}`,
        downloadUrl,
        async () => {
          try {
            const response = await fetch(downloadUrl, { redirect: "follow" });
            if (!response.ok) return null;
            return Buffer.from(await response.arrayBuffer());
          } catch (error) {
            downloadCauses.add((error as { cause?: { code?: string } }).cause?.code ?? "unknown");
            return null;
          }
        },
        path.basename(new URL(downloadUrl).pathname, ".pdf"),
        null,
        summary.documents,
      );
      if (found) documentIds.set(url, found.id);
      else failedDocuments.push(url);
    }
    if (failedDocuments.length) {
      throw new Error(
        `${failedDocuments.length} brochures could not be downloaded (${[...downloadCauses].join(", ")}). Nothing else was imported. Fix the connection (for a local certificate problem run with NODE_OPTIONS=--use-system-ca) or pass --skip-documents.`,
      );
    }
  }

  const categoryIds = new Map<string, string>();
  for (const category of plan.categories) {
    const values = categoryInputSchema.parse({
      name: localized(category.name),
      slug: localized(category.slug as Texts),
      description: docs(category.description),
      parentId: null,
      imageId: category.imageSha1 ? (mediaIds.get(category.imageSha1) ?? null) : null,
      isActive: true,
      seoTitle: localizedOrNull(category.seoTitle),
      seoDescription: localizedOrNull(category.seoDescription),
    });
    const [byKey] = await db
      .select()
      .from(categories)
      .where(eq(categories.legacyKey, category.legacyKey));
    const [seeded] = byKey
      ? [undefined]
      : await db
          .select()
          .from(categories)
          .where(
            and(
              isNull(categories.legacyKey),
              sql`(${categories.slug} ->> 'az') in (${category.seedSlugAz ?? ""}, ${category.slug.az ?? ""})`,
            ),
          );
    let id = byKey?.id ?? seeded?.id;
    if (byKey && !options.update) {
      summary.categories.unchanged += 1;
    } else if (id) {
      unwrap(await updateCategory(id, values), `category ${category.key}`);
      await db
        .update(categories)
        .set({ legacyKey: category.legacyKey, sortOrder: category.order })
        .where(eq(categories.id, id));
      if (byKey) summary.categories.updated += 1;
      else summary.categories.adopted += 1;
    } else {
      const created = unwrap(await createCategory(values), `category ${category.key}`);
      id = created.id;
      await db
        .update(categories)
        .set({ legacyKey: category.legacyKey, sortOrder: category.order })
        .where(eq(categories.id, id));
      summary.categories.created += 1;
    }
    if (!id) throw new Error(`category ${category.key} has no id`);
    categoryIds.set(category.key, id);
    ids.set(category.legacyKey, id);
  }

  let homagId: string | null = null;
  for (const brand of plan.brands) {
    const [byKey] = await db.select().from(brands).where(eq(brands.legacyKey, brand.legacyKey));
    const [bySlug] = byKey
      ? [undefined]
      : await db.select().from(brands).where(eq(brands.slug, brand.slug));
    const existing = byKey ?? bySlug;
    const logoId = brand.logoSha1
      ? (mediaIds.get(brand.logoSha1) ?? null)
      : (existing?.logoId ?? null);
    const values = brandInputSchema.parse({
      name: brand.name,
      slug: brand.slug,
      logoId,
      description: localizedOrNull(brand.description) ?? existing?.description ?? null,
      websiteUrl: brand.websiteUrl ?? existing?.websiteUrl ?? null,
      isActive: true,
    });
    let id = existing?.id;
    if (byKey && !options.update) {
      summary.brands.unchanged += 1;
    } else if (id) {
      unwrap(await updateBrand(id, values), `brand ${brand.name}`);
      await db
        .update(brands)
        .set({ legacyKey: brand.legacyKey, sortOrder: brand.order })
        .where(eq(brands.id, id));
      if (byKey) summary.brands.updated += 1;
      else summary.brands.adopted += 1;
    } else {
      id = unwrap(await createBrand(values), `brand ${brand.name}`).id;
      await db
        .update(brands)
        .set({ legacyKey: brand.legacyKey, sortOrder: brand.order })
        .where(eq(brands.id, id));
      summary.brands.created += 1;
    }
    if (!id) throw new Error(`brand ${brand.name} has no id`);
    ids.set(brand.legacyKey, id);
    if (brand.slug === "homag") homagId = id;
  }

  for (const product of plan.products) {
    const [byKey] = await db
      .select()
      .from(products)
      .where(eq(products.legacyKey, product.legacyKey));
    if (byKey && !options.update) {
      summary.products.unchanged += 1;
      ids.set(product.legacyKey, byKey.id);
      continue;
    }
    const categoryId = categoryIds.get(product.categoryKey);
    const candidate = {
      name: localized(product.name),
      slug: localized(product.slug as Texts),
      sku: null,
      shortDescription: docs(product.shortDescription),
      description: docs(product.description),
      categoryIds: categoryId ? [categoryId] : [],
      brandId: homagId,
      benefits: product.benefits.map((text) => ({ text: localized(text) })),
      specs: product.specs.map((row) => ({
        label: localized(row.label),
        value: localized(row.value),
        unit: row.unit ? localized(row.unit) : null,
      })),
      images: product.images.flatMap((image) => {
        const mediaId = mediaIds.get(image.sha1);
        const item = plan.media.get(image.sha1);
        return mediaId && item ? [{ mediaId, alt: altFor(item) }] : [];
      }),
      documents: product.documents.flatMap((doc) => {
        const mediaId = documentIds.get(doc.url);
        return mediaId ? [{ mediaId, title: localized(doc.title) }] : [];
      }),
      videoId: null,
      videoUrl: null,
      videoPosterId: null,
      relatedIds: [],
      seoTitle: localizedOrNull(product.seoTitle),
      seoDescription: localizedOrNull(product.seoDescription),
      status: "published",
      isFeatured: false,
    };
    const checked = productInputSchema.safeParse(candidate);
    let values: ProductValues;
    if (checked.success) values = checked.data;
    else if (checked.error.issues.every((issue) => issue.code === "too_big")) {
      const longest = checked.error.issues.map((issue) => issue.path.join(".")).slice(0, 4);
      overflows.push({ product: product.legacyKey, fields: longest });
      values = {
        ...(candidate as unknown as ProductValues),
        shortDescription: product.shortDescription.az
          ? (docs(product.shortDescription) as never)
          : null,
        description: product.description.az ? (docs(product.description) as never) : null,
        sku: null,
        brandId: homagId,
        seoTitle: localizedOrNull(product.seoTitle),
        seoDescription: localizedOrNull(product.seoDescription),
      };
    } else {
      throw new Error(`product ${product.group}: ${checked.error.message}`);
    }
    let id = byKey?.id;
    let adopted = false;
    if (!id) {
      const [bySlug] = await db
        .select()
        .from(products)
        .where(
          and(
            isNull(products.legacyKey),
            sql`(${products.slug} ->> 'az') = ${product.slug.az ?? ""}`,
          ),
        );
      id = bySlug?.id;
      adopted = Boolean(bySlug);
    }
    const saved = unwrap(await saveProduct(id ?? null, values), `product ${product.group}`);
    await db
      .update(products)
      .set({ legacyKey: product.legacyKey, sortOrder: product.order })
      .where(eq(products.id, saved.id));
    ids.set(product.legacyKey, saved.id);
    if (byKey) summary.products.updated += 1;
    else if (adopted) summary.products.adopted += 1;
    else summary.products.created += 1;
  }

  for (const page of plan.pages) {
    const [byKey] = await db.select().from(pages).where(eq(pages.legacyKey, page.legacyKey));
    const [byKind] = byKey
      ? [undefined]
      : await db.select().from(pages).where(eq(pages.kind, page.kind));
    const existing = byKey ?? byKind;
    if (byKey && !options.update) {
      summary.pages.unchanged += 1;
      ids.set(page.legacyKey, byKey.id);
      continue;
    }
    const values = pageInputSchema.parse({
      title: localized(page.title),
      slug: localized(page.slug as Texts),
      content: docs(page.content),
      coverId: null,
      status: "published",
      seoTitle: localizedOrNull(page.seoTitle),
      seoDescription: localizedOrNull(page.seoDescription),
    });
    const saved = unwrap(await savePage(existing?.id ?? null, values), `page ${page.kind}`);
    await db
      .update(pages)
      .set({ legacyKey: page.legacyKey, kind: page.kind })
      .where(eq(pages.id, saved.id));
    ids.set(page.legacyKey, saved.id);
    if (byKey) summary.pages.updated += 1;
    else if (byKind) summary.pages.adopted += 1;
    else summary.pages.created += 1;
  }

  for (const client of plan.clients) {
    const [byKey] = await db
      .select()
      .from(clientLogos)
      .where(eq(clientLogos.legacyKey, client.legacyKey));
    if (byKey && !options.update) {
      summary.clients.unchanged += 1;
      ids.set(client.legacyKey, byKey.id);
      continue;
    }
    const imageId = mediaIds.get(client.imageSha1);
    const values = clientLogoInputSchema.parse({
      name: client.name,
      imageId,
      url: null,
      isActive: true,
    });
    let id = byKey?.id;
    if (id) {
      unwrap(await updateClientLogo(id, values), `client ${client.name}`);
      summary.clients.updated += 1;
    } else {
      id = unwrap(await createClientLogo(values), `client ${client.name}`).id;
      summary.clients.created += 1;
    }
    await db
      .update(clientLogos)
      .set({ legacyKey: client.legacyKey, sortOrder: client.order })
      .where(eq(clientLogos.id, id));
    ids.set(client.legacyKey, id);
  }

  for (const person of plan.persons) {
    const [existing] = await db
      .select()
      .from(contactPersons)
      .where(sql`(${contactPersons.name} ->> 'az') = ${person.name.az ?? ""}`);
    const fill = (current: Localized | undefined, next: Texts): Localized => {
      const merged = { ...localized(next) } as Localized;
      for (const locale of locales) {
        const keep = options.update ? null : (current?.[locale] ?? null);
        merged[locale] = (keep ?? next[locale]) as never;
      }
      return merged;
    };
    const phones = options.update
      ? person.phones
      : [...new Set([...(existing?.phones ?? []), ...person.phones])];
    const values = contactPersonInputSchema.parse({
      name: fill(existing?.name, person.name),
      role: fill(existing?.role, person.role),
      phones: phones.map((number) => ({ number })),
      email: options.update ? person.email : (existing?.email ?? person.email),
      whatsapp: options.update ? person.whatsapp : (existing?.whatsapp ?? person.whatsapp),
      photoId: existing?.photoId ?? null,
      isActive: existing?.isActive ?? true,
    });
    if (existing) {
      const same =
        canon(values.name) === canon(existing.name) &&
        canon(values.role) === canon(existing.role) &&
        canon(values.phones) === canon(existing.phones) &&
        values.email === existing.email &&
        values.whatsapp === existing.whatsapp;
      if (same) summary.persons.unchanged += 1;
      else {
        unwrap(await updateContactPerson(existing.id, values), `person ${person.legacyName}`);
        summary.persons.updated += 1;
      }
      ids.set(`wp-person:${person.legacyName}`, existing.id);
    } else {
      const created = unwrap(await createContactPerson(values), `person ${person.legacyName}`);
      await db
        .update(contactPersons)
        .set({ sortOrder: person.order })
        .where(eq(contactPersons.id, created.id));
      ids.set(`wp-person:${person.legacyName}`, created.id);
      summary.persons.created += 1;
    }
  }

  const row = await readSettingsRow();
  const fillText = (current: Localized | null | undefined, next: Texts): Localized | null => {
    if (!options.update && current?.az) return current;
    return localizedOrNull(next);
  };
  const settingsValues = settingsInputSchema.parse({
    logoLightId:
      row?.logoLightId ??
      (plan.settings.logoLightSha1 ? (mediaIds.get(plan.settings.logoLightSha1) ?? null) : null),
    logoDarkId: row?.logoDarkId ?? null,
    faviconId:
      row?.faviconId ??
      (plan.settings.faviconSha1 ? (mediaIds.get(plan.settings.faviconSha1) ?? null) : null),
    phones: (!options.update && row?.phones.length
      ? row.phones
      : plan.settings.phones.map((phone) => ({
          label: localized(phone.label),
          number: phone.number,
        }))
    ).map((phone) => ({ label: phone.label, number: phone.number })),
    emails: (!options.update && row?.emails.length ? row.emails : plan.settings.emails).map(
      (address) => ({ address }),
    ),
    address: fillText(row?.address, plan.settings.address),
    mapUrl: row?.mapUrl ?? null,
    workingHours: row?.workingHours ?? null,
    whatsappNumber: row?.whatsappNumber ?? plan.settings.whatsappNumber,
    socials: row?.socials ?? [],
    seoTitle: fillText(row?.seoTitle, plan.settings.seoTitle),
    seoDescription: row?.seoDescription ?? null,
    ogImageId: row?.ogImageId ?? null,
    legalName: row?.legalName ?? null,
    consultationNotifyEmail: row?.consultationNotifyEmail ?? null,
    catalogueFileId: row?.catalogueFileId ?? null,
  });
  const settingsSame =
    row &&
    row.logoLightId === settingsValues.logoLightId &&
    row.faviconId === settingsValues.faviconId &&
    canon(row.phones) === canon(settingsValues.phones) &&
    canon(row.emails) === canon(settingsValues.emails) &&
    canon(row.address) === canon(settingsValues.address) &&
    row.whatsappNumber === settingsValues.whatsappNumber &&
    canon(row.seoTitle) === canon(settingsValues.seoTitle);
  if (settingsSame) summary.settings.unchanged += 1;
  else {
    unwrap(await saveSettings(settingsValues), "settings");
    if (row) summary.settings.updated += 1;
    else summary.settings.created += 1;
  }

  const home = await getAdminHomeSections();
  const seedHero = !home.hero || home.hero.headline.az === seedHeadlineAz;
  const heroOverwrite = options.update || seedHero;
  const hero = {
    headline: heroOverwrite
      ? (localizedOrNull(plan.home.heroHeadline) ?? home.hero?.headline)
      : home.hero?.headline,
    subline: home.hero?.subline ?? null,
    ctaLabel: heroOverwrite
      ? localizedOrNull(plan.home.heroCtaLabel)
      : (home.hero?.ctaLabel ?? null),
    ctaHref: heroOverwrite ? plan.home.heroCtaHref : (home.hero?.ctaHref ?? null),
    filmId: home.hero?.filmId ?? null,
  };
  const titleKeys = {
    categories: plan.home.titles.categories,
    products: plan.home.titles.products,
    clients: plan.home.titles.clients,
  };
  const sections = home.sections.map((section) => {
    const titles = titleKeys[section.key as keyof typeof titleKeys];
    if (!titles || section.key === "custom") return section;
    if (section.title?.az && !options.update) return section;
    return { ...section, title: localizedOrNull(titles) ?? section.title };
  });
  const featuredIds = home.featured.length
    ? home.featured.map((item) => item.id)
    : plan.home.featuredGroups.flatMap((group) => {
        const id = ids.get(`wp-product:${group}`);
        return id ? [id] : [];
      });
  const homeValues = homeSectionsInputSchema.parse({ hero, sections, featuredIds });
  const homeSame =
    canon(homeValues.hero) === canon(home.hero) &&
    canon(homeValues.sections) === canon(home.sections) &&
    canon(homeValues.featuredIds) === canon(home.featured.map((item) => item.id));
  if (homeSame) summary.home.unchanged += 1;
  else {
    unwrap(await saveHomeSections(homeValues), "home sections");
    summary.home.updated += 1;
  }

  for (const entry of redirectEntries) {
    const [existing] = await db
      .select()
      .from(redirects)
      .where(eq(redirects.fromPath, entry.fromPath));
    if (existing && existing.toPath === entry.toPath) {
      summary.redirects.unchanged += 1;
      continue;
    }
    const values = redirectInputSchema.parse({
      fromPath: entry.fromPath,
      toPath: entry.toPath,
      statusCode: 301,
    });
    if (existing && !options.update) {
      summary.redirects.unchanged += 1;
      continue;
    }
    unwrap(await saveRedirect(existing?.id ?? null, values), `redirect ${entry.fromPath}`);
    if (existing) summary.redirects.updated += 1;
    else summary.redirects.created += 1;
  }

  storage.close();
  return { summary, ids, mediaKeys, failedDocuments, overflows };
}

import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { and, asc, count, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import sharp from "sharp";

import type { Page } from "@/lib/api/types";
import { getDb } from "@/lib/db";
import { containsPattern } from "@/lib/db/like";
import {
  brands,
  categories,
  clientLogos,
  contactPersons,
  heroFilms,
  media,
  pages,
  posts,
  products,
  settings,
} from "@/lib/db/schema";
import { deleteMediaObject, presignUpload, readMediaBytes } from "@/lib/media";
import { routes } from "@/lib/routes";
import { slugify } from "@/lib/slug";
import {
  mediaKindOf,
  mediaTypes,
  mediaUsageKinds,
  type MediaDto,
  type MediaLibraryItem,
  type MediaListArgs,
  type MediaType,
  type MediaUsage,
  type MediaUsageItem,
  type UploadRequestInput,
  type UploadTicket,
} from "@/lib/validation/media";
import type { Localized } from "@/lib/i18n/localized";

type MediaRow = typeof media.$inferSelect;

export function toMediaDto(row: MediaRow): MediaDto {
  return {
    id: row.id,
    key: row.key,
    src: routes.media(row.key),
    mimeType: row.mimeType,
    width: row.width,
    height: row.height,
    size: row.size,
    alt: row.alt?.az ?? null,
    alts: row.alt ?? null,
    captions: row.caption ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function contentUsage(key: SQL): SQL<number> {
  const needle = sql`'%"/media/' || ${key} || '"%'`;
  return sql<number>`(
    (select count(*) from products where products.description::text like ${needle} or products.short_description::text like ${needle})
    + (select count(*) from categories where categories.description::text like ${needle})
    + (select count(*) from pages where pages.content::text like ${needle})
    + (select count(*) from posts where posts.content::text like ${needle})
    + (select count(*) from settings where settings.home_sections::text like ${needle})
  )::int`;
}

function usageColumns(id: SQL, key: SQL) {
  return {
    products: sql<number>`(select count(*) from products p where p.video_id = ${id} or p.video_poster_id = ${id}
      or exists (select 1 from product_images pi where pi.product_id = p.id and pi.media_id = ${id})
      or exists (select 1 from product_documents pd where pd.product_id = p.id and pd.media_id = ${id}))::int`,
    categories: sql<number>`(select count(*) from categories c where c.image_id = ${id})::int`,
    brands: sql<number>`(select count(*) from brands b where b.logo_id = ${id} or b.image_id = ${id})::int`,
    posts: sql<number>`(select count(*) from posts po where po.cover_id = ${id})::int`,
    pages: sql<number>`(select count(*) from pages pg where pg.cover_id = ${id})::int`,
    clients: sql<number>`(select count(*) from client_logos cl where cl.image_id = ${id})::int`,
    contacts: sql<number>`(select count(*) from contact_persons cp where cp.photo_id = ${id})::int`,
    films: sql<number>`(select count(*) from hero_films hf where hf.poster_id = ${id})::int`,
    settings: sql<number>`(select count(*) from settings s where ${id} in (s.logo_light_id, s.logo_dark_id, s.favicon_id, s.og_image_id, s.catalogue_file_id)
      or exists (select 1 from jsonb_array_elements(s.home_sections) hb where hb -> 'block' ->> 'mediaId' = ${id}::text or hb -> 'block' ->> 'posterId' = ${id}::text))::int`,
    content: contentUsage(key),
  } satisfies Record<keyof MediaUsage, SQL<number>>;
}

const usage = usageColumns(sql`media.id`, sql`media.key`);

function usageTotal(): SQL<number> {
  return sql<number>`(${sql.join(
    mediaUsageKinds.map((kind) => usage[kind]),
    sql` + `,
  )})`;
}

function kindFilter(kind: MediaListArgs["kind"]): SQL | undefined {
  if (!kind || kind === "all") return undefined;
  const types = Object.entries(mediaTypes)
    .filter(([, value]) => value.kind === kind)
    .map(([type]) => type);
  if (kind === "image")
    return or(inArray(media.mimeType, types), eq(media.mimeType, "image/svg+xml"));
  return inArray(media.mimeType, types);
}

export async function listMedia(args: MediaListArgs): Promise<Page<MediaLibraryItem>> {
  const db = getDb();
  const filters: SQL[] = [];
  const kind = kindFilter(args.kind ?? "image");
  if (kind) filters.push(kind);
  if (args.search) {
    const pattern = containsPattern(args.search);
    const match = or(
      ilike(media.key, pattern),
      ilike(sql`${media.alt} ->> 'az'`, pattern),
      ilike(sql`${media.alt} ->> 'ru'`, pattern),
      ilike(sql`${media.alt} ->> 'en'`, pattern),
      ilike(sql`${media.alt} ->> 'de'`, pattern),
    );
    if (match) filters.push(match);
  }
  if (args.unused) filters.push(sql`${usageTotal()} = 0`);
  const where = filters.length ? and(...filters) : undefined;
  const column =
    args.sort === "key" ? media.key : args.sort === "size" ? media.size : media.createdAt;
  const direction = args.order === "desc" ? desc : asc;

  const [rows, [total]] = await Promise.all([
    db
      .select({ row: media, ...usage })
      .from(media)
      .where(where)
      .orderBy(direction(column), asc(media.id))
      .limit(args.pageSize)
      .offset(args.page * args.pageSize),
    db.select({ value: count() }).from(media).where(where),
  ]);

  return {
    rows: rows.map(({ row, ...counts }) => {
      const usageCounts = Object.fromEntries(
        mediaUsageKinds.map((kind) => [kind, Number(counts[kind])]),
      ) as MediaUsage;
      return {
        ...toMediaDto(row),
        usage: usageCounts,
        usageTotal: mediaUsageKinds.reduce((sum, kind) => sum + usageCounts[kind], 0),
      };
    }),
    rowCount: total?.value ?? 0,
  };
}

export async function findMedia(id: string): Promise<MediaRow | undefined> {
  const [row] = await getDb().select().from(media).where(eq(media.id, id));
  return row;
}

export async function findMediaByIds(ids: string[]): Promise<MediaRow[]> {
  if (!ids.length) return [];
  return getDb().select().from(media).where(inArray(media.id, ids));
}

export async function mediaUsage(id: string): Promise<MediaUsage> {
  const counts = usageColumns(
    sql`${id}::uuid`,
    sql`(select key from media where id = ${id}::uuid)`,
  );
  const [row] = await getDb()
    .select(counts)
    .from(sql`(select 1) as one`);
  return Object.fromEntries(
    mediaUsageKinds.map((kind) => [kind, Number(row?.[kind] ?? 0)]),
  ) as MediaUsage;
}

function uploadKey(fileName: string, type: MediaType): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const base =
    slugify(fileName.replace(/\.[^.]+$/, ""))
      .slice(0, 60)
      .replace(/-+$/, "") || "fayl";
  const suffix = randomBytes(4).toString("hex");
  return `uploads/${year}/${month}/${base}-${suffix}.${mediaTypes[type].extension}`;
}

export async function createUploadTicket(input: UploadRequestInput): Promise<UploadTicket> {
  const key = uploadKey(input.fileName, input.contentType);
  return {
    key,
    url: await presignUpload(key, input.contentType, input.size),
    headers: { "Content-Type": input.contentType },
  };
}

type Inspected = {
  mimeType: MediaType;
  width: number | null;
  height: number | null;
  lqip: string | null;
};

const sharpFormats: Partial<Record<string, MediaType>> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heif: "image/avif",
  gif: "image/gif",
};

async function inspect(body: Buffer, declared: MediaType): Promise<Inspected | null> {
  const kind = mediaKindOf(declared);
  if (kind === "video") {
    const isMp4 = body.subarray(4, 8).toString("latin1") === "ftyp";
    const isWebm = body.subarray(0, 4).toString("hex") === "1a45dfa3";
    if (declared === "video/mp4" ? !isMp4 : !isWebm) return null;
    return { mimeType: declared, width: null, height: null, lqip: null };
  }
  if (kind === "document") {
    return body.subarray(0, 5).toString("latin1") === "%PDF-"
      ? { mimeType: "application/pdf", width: null, height: null, lqip: null }
      : null;
  }
  try {
    const meta = await sharp(body).metadata();
    const mimeType = meta.format ? sharpFormats[meta.format] : undefined;
    if (!mimeType) return null;
    const oriented = meta.autoOrient ?? meta;
    const tiny = await sharp(body)
      .rotate()
      .resize(16, 16, { fit: "inside" })
      .webp({ quality: 40 })
      .toBuffer();
    return {
      mimeType,
      width: oriented.width ?? null,
      height: oriented.height ?? null,
      lqip: `data:image/webp;base64,${tiny.toString("base64")}`,
    };
  } catch {
    return null;
  }
}

function declaredTypeOf(key: string): MediaType | null {
  const extension = key.split(".").pop();
  const match = Object.entries(mediaTypes).find(([, value]) => value.extension === extension);
  return match ? (match[0] as MediaType) : null;
}

export type CompleteUploadResult =
  | { status: "created" | "existing"; media: MediaDto }
  | { status: "missing" | "invalid" | "too-large"; message: string };

export async function completeUpload(
  key: string,
  alt: Localized | null,
): Promise<CompleteUploadResult> {
  const db = getDb();
  const [known] = await db.select().from(media).where(eq(media.key, key));
  if (known) return { status: "existing", media: toMediaDto(known) };

  const declared = declaredTypeOf(key);
  const body = await readMediaBytes(key);
  if (!body || !declared) {
    return { status: "missing", message: "Fayl yüklənməyib. Yenidən cəhd edin." };
  }
  if (body.length > mediaTypes[declared].maxSize) {
    await deleteMediaObject(key);
    return { status: "too-large", message: "Fayl icazə verilən ölçüdən böyükdür." };
  }
  const inspected = await inspect(body, declared);
  if (!inspected || mediaKindOf(inspected.mimeType) !== mediaKindOf(declared)) {
    await deleteMediaObject(key);
    return { status: "invalid", message: "Faylın məzmunu növünə uyğun deyil." };
  }

  const sha256 = createHash("sha256").update(body).digest("hex");
  const [duplicate] = await db
    .select()
    .from(media)
    .where(and(eq(media.sha256, sha256), eq(media.size, body.length)))
    .limit(1);
  if (duplicate) {
    await deleteMediaObject(key);
    return { status: "existing", media: toMediaDto(duplicate) };
  }

  const [row] = await db
    .insert(media)
    .values({
      key,
      mimeType: inspected.mimeType,
      width: inspected.width,
      height: inspected.height,
      size: body.length,
      sha256,
      lqip: inspected.lqip,
      alt,
    })
    .returning();
  if (!row) throw new Error("Media row was not created");
  return { status: "created", media: toMediaDto(row) };
}

export async function updateMediaText(
  id: string,
  text: { alt: Localized | null; caption?: Localized | null },
): Promise<MediaDto | null> {
  const [row] = await getDb()
    .update(media)
    .set(text.caption === undefined ? { alt: text.alt } : { alt: text.alt, caption: text.caption })
    .where(eq(media.id, id))
    .returning();
  return row ? toMediaDto(row) : null;
}

export async function mediaUsageItems(id: string): Promise<MediaUsageItem[]> {
  const db = getDb();
  const row = await findMedia(id);
  if (!row) return [];
  const needle = `%"/media/${row.key}"%`;
  const embeds = (column: SQL) => sql`${column}::text like ${needle}`;

  const [
    productRows,
    categoryRows,
    brandRows,
    postRows,
    pageRows,
    clientRows,
    contactRows,
    filmRows,
    settingRows,
    embedProducts,
    embedCategories,
    embedPages,
    embedPosts,
  ] = await Promise.all([
    db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(
        sql`${products.videoId} = ${id} or ${products.videoPosterId} = ${id}
          or exists (select 1 from product_images pi where pi.product_id = ${products.id} and pi.media_id = ${id})
          or exists (select 1 from product_documents pd where pd.product_id = ${products.id} and pd.media_id = ${id})`,
      ),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.imageId, id)),
    db
      .select({ id: brands.id, name: brands.name })
      .from(brands)
      .where(or(eq(brands.logoId, id), eq(brands.imageId, id))),
    db.select({ id: posts.id, name: posts.title }).from(posts).where(eq(posts.coverId, id)),
    db.select({ id: pages.id, name: pages.title }).from(pages).where(eq(pages.coverId, id)),
    db
      .select({ id: clientLogos.id, name: clientLogos.name })
      .from(clientLogos)
      .where(eq(clientLogos.imageId, id)),
    db
      .select({ id: contactPersons.id, name: contactPersons.name })
      .from(contactPersons)
      .where(eq(contactPersons.photoId, id)),
    db
      .select({ id: heroFilms.id, name: heroFilms.name })
      .from(heroFilms)
      .where(eq(heroFilms.posterId, id)),
    db
      .select({
        siteMedia: sql<boolean>`${id}::uuid in (${settings.logoLightId}, ${settings.logoDarkId}, ${settings.faviconId}, ${settings.ogImageId}, ${settings.catalogueFileId})`,
        homeMedia: sql<boolean>`exists (select 1 from jsonb_array_elements(${settings.homeSections}) hb where hb -> 'block' ->> 'mediaId' = ${id}::text or hb -> 'block' ->> 'posterId' = ${id}::text)`,
        homeEmbed: embeds(sql`${settings.homeSections}`),
      })
      .from(settings),
    db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(or(embeds(sql`${products.description}`), embeds(sql`${products.shortDescription}`))),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(embeds(sql`${categories.description}`)),
    db
      .select({ id: pages.id, name: pages.title })
      .from(pages)
      .where(embeds(sql`${pages.content}`)),
    db
      .select({ id: posts.id, name: posts.title })
      .from(posts)
      .where(embeds(sql`${posts.content}`)),
  ]);

  const named = (
    kind: MediaUsageItem["kind"],
    rows: { id: string; name: string | { az: string } }[],
    href: (itemId: string) => string,
  ): MediaUsageItem[] =>
    rows.map((item) => ({
      kind,
      id: item.id,
      label: typeof item.name === "string" ? item.name : item.name.az,
      href: href(item.id),
    }));

  const items: MediaUsageItem[] = [
    ...named("products", productRows, (itemId) => `/admin/products/${itemId}`),
    ...named("categories", categoryRows, (itemId) => `/admin/categories/${itemId}`),
    ...named("brands", brandRows, () => "/admin/brands"),
    ...named("posts", postRows, (itemId) => `/admin/blog/${itemId}`),
    ...named("pages", pageRows, (itemId) => `/admin/pages/${itemId}`),
    ...named("clients", clientRows, () => "/admin/clients"),
    ...named("contacts", contactRows, () => "/admin/contacts"),
    ...named("films", filmRows, () => "/admin/hero-films"),
    ...named("content", embedProducts, (itemId) => `/admin/products/${itemId}`),
    ...named("content", embedCategories, (itemId) => `/admin/categories/${itemId}`),
    ...named("content", embedPages, (itemId) => `/admin/pages/${itemId}`),
    ...named("content", embedPosts, (itemId) => `/admin/blog/${itemId}`),
  ];
  const site = settingRows[0];
  if (site?.siteMedia) {
    items.push({ kind: "settings", id: "settings", label: null, href: "/admin/settings" });
  }
  if (site?.homeMedia || site?.homeEmbed) {
    items.push({
      kind: "settings",
      id: "home-sections",
      label: null,
      href: "/admin/home-sections",
    });
  }
  return items;
}

export type ReplaceMediaResult =
  | { status: "replaced"; media: MediaDto }
  | { status: "missing" | "invalid" | "too-large" | "duplicate" | "not-found"; message: string };

const embeddedColumns = [
  ["products", "description"],
  ["products", "short_description"],
  ["categories", "description"],
  ["pages", "content"],
  ["posts", "content"],
  ["settings", "home_sections"],
] as const;

export async function replaceMedia(id: string, key: string): Promise<ReplaceMediaResult> {
  const db = getDb();
  const current = await findMedia(id);
  if (!current) return { status: "not-found", message: "Fayl tapılmadı." };
  if (current.key === key) return { status: "replaced", media: toMediaDto(current) };
  const [owner] = await db.select({ id: media.id }).from(media).where(eq(media.key, key));
  if (owner) return { status: "duplicate", message: "Bu fayl kitabxanada artıq var." };

  const declared = declaredTypeOf(key);
  const body = await readMediaBytes(key);
  if (!body || !declared) {
    return { status: "missing", message: "Fayl yüklənməyib. Yenidən cəhd edin." };
  }
  if (body.length > mediaTypes[declared].maxSize) {
    await deleteMediaObject(key);
    return { status: "too-large", message: "Fayl icazə verilən ölçüdən böyükdür." };
  }
  const inspected = await inspect(body, declared);
  if (
    !inspected ||
    mediaKindOf(inspected.mimeType) !== mediaKindOf(declared) ||
    mediaKindOf(inspected.mimeType) !== mediaKindOf(current.mimeType)
  ) {
    await deleteMediaObject(key);
    return { status: "invalid", message: "Yeni fayl köhnə ilə eyni növdə olmalıdır." };
  }

  const sha256 = createHash("sha256").update(body).digest("hex");
  const [duplicate] = await db
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.sha256, sha256), eq(media.size, body.length), ne(media.id, id)))
    .limit(1);
  if (duplicate) {
    await deleteMediaObject(key);
    return { status: "duplicate", message: "Bu fayl kitabxanada artıq var." };
  }

  const [row] = await db
    .update(media)
    .set({
      key,
      mimeType: inspected.mimeType,
      width: inspected.width,
      height: inspected.height,
      size: body.length,
      sha256,
      lqip: inspected.lqip,
    })
    .where(eq(media.id, id))
    .returning();
  if (!row) throw new Error("Media row was not updated");

  const from = `/media/${current.key}`;
  const to = `/media/${key}`;
  for (const [table, column] of embeddedColumns) {
    const target = sql.identifier(column);
    await db.execute(
      sql`update ${sql.identifier(table)} set ${target} = replace(${target}::text, ${from}, ${to})::jsonb where ${target}::text like ${`%${from}%`}`,
    );
  }
  await deleteMediaObject(current.key);
  return { status: "replaced", media: toMediaDto(row) };
}

export type DeleteMediaResult = "deleted" | "missing" | "in-use";

export async function deleteMedia(id: string): Promise<DeleteMediaResult> {
  const row = await findMedia(id);
  if (!row) return "missing";
  const counts = await mediaUsage(id);
  if (mediaUsageKinds.some((kind) => counts[kind] > 0)) return "in-use";
  await getDb().delete(media).where(eq(media.id, id));
  await deleteMediaObject(row.key);
  return "deleted";
}

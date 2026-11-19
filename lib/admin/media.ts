import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import sharp from "sharp";

import type { Page } from "@/lib/api/types";
import { getDb } from "@/lib/db";
import { containsPattern } from "@/lib/db/like";
import { media } from "@/lib/db/schema";
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
    createdAt: row.createdAt.toISOString(),
  };
}

function contentUsage(key: SQL): SQL<number> {
  const needle = sql`'%"/media/' || ${key} || '"%'`;
  return sql<number>`(
    (select count(*) from products where products.description::text like ${needle} or products.short_description::text like ${needle})
    + (select count(*) from categories where categories.description::text like ${needle})
    + (select count(*) from projects where projects.body::text like ${needle})
    + (select count(*) from pages where pages.content::text like ${needle})
    + (select count(*) from posts where posts.content::text like ${needle})
    + (select count(*) from vacancies where vacancies.content::text like ${needle})
    + (select count(*) from settings where settings.home_sections::text like ${needle})
  )::int`;
}

function usageColumns(id: SQL, key: SQL) {
  return {
    products: sql<number>`(select count(*) from products p where p.model_id = ${id} or p.model_poster_id = ${id}
      or exists (select 1 from product_images pi where pi.product_id = p.id and pi.media_id = ${id}))::int`,
    categories: sql<number>`(select count(*) from categories c where c.image_id = ${id})::int`,
    projects: sql<number>`(select count(*) from projects pr where pr.cover_id = ${id}
      or exists (select 1 from project_images pri where pri.project_id = pr.id and pri.media_id = ${id}))::int`,
    posts: sql<number>`(select count(*) from posts po where po.cover_id = ${id})::int`,
    vacancies: sql<number>`(select count(*) from vacancies va where va.cover_id = ${id})::int`,
    pages: sql<number>`(select count(*) from pages pg where pg.cover_id = ${id})::int`,
    logos: sql<number>`(select count(*) from logos l where l.image_id = ${id})::int`,
    team: sql<number>`(select count(*) from team_members tm where tm.photo_id = ${id})::int`,
    settings: sql<number>`(select count(*) from settings s where ${id} in (s.logo_light_id, s.logo_dark_id, s.favicon_id, s.og_image_id, s.catalogue_file_id)
      or exists (select 1 from jsonb_array_elements(s.hero_slides) hs where hs ->> 'imageId' = ${id}::text)
      or exists (select 1 from jsonb_array_elements(s.home_sections) hb where hb -> 'block' ->> 'mediaId' = ${id}::text or hb -> 'block' ->> 'posterId' = ${id}::text))::int`,
    content: contentUsage(key),
    derived: sql<number>`(select count(*) from media d where d.original_id = ${id})::int`,
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
  if (kind === "model") {
    return body.subarray(0, 4).toString("latin1") === "glTF" && body.readUInt32LE(4) === 2
      ? { mimeType: "model/gltf-binary", width: null, height: null, lqip: null }
      : null;
  }
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

export async function updateMediaAlt(id: string, alt: Localized | null): Promise<MediaDto | null> {
  const [row] = await getDb().update(media).set({ alt }).where(eq(media.id, id)).returning();
  return row ? toMediaDto(row) : null;
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

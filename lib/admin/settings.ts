import "server-only";

import { eq } from "drizzle-orm";

import type { DomainError } from "@/lib/api/server";
import { getDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { mediaKindOf } from "@/lib/validation/media";
import type { SettingsDto, SettingsValues } from "@/lib/validation/settings";

import { findMediaByIds, toMediaDto } from "./media";

export type SettingsRow = typeof settings.$inferSelect;

type MediaField = "logoLightId" | "logoDarkId" | "faviconId" | "ogImageId" | "catalogueFileId";

const mediaFields: MediaField[] = [
  "logoLightId",
  "logoDarkId",
  "faviconId",
  "ogImageId",
  "catalogueFileId",
];

export async function readSettingsRow(): Promise<SettingsRow | null> {
  const [row] = await getDb().select().from(settings).where(eq(settings.id, 1));
  return row ?? null;
}

function mediaIdsOf(source: Pick<SettingsRow, MediaField>): string[] {
  return [...new Set(mediaFields.map((field) => source[field]).filter((id) => id !== null))];
}

export async function getAdminSettings(): Promise<SettingsDto> {
  const row = await readSettingsRow();
  const media = row ? await findMediaByIds(mediaIdsOf(row)) : [];
  return {
    logoLightId: row?.logoLightId ?? null,
    logoDarkId: row?.logoDarkId ?? null,
    faviconId: row?.faviconId ?? null,
    ogImageId: row?.ogImageId ?? null,
    catalogueFileId: row?.catalogueFileId ?? null,
    media: media.map(toMediaDto),
    phones: row?.phones ?? [],
    emails: row?.emails ?? [],
    address: row?.address ?? null,
    mapUrl: row?.mapUrl ?? null,
    workingHours: row?.workingHours ?? null,
    whatsappNumber: row?.whatsappNumber ?? null,
    socials: row?.socials ?? [],
    seoTitle: row?.seoTitle ?? null,
    seoDescription: row?.seoDescription ?? null,
    legalName: row?.legalName ?? null,
    consultationNotifyEmail: row?.consultationNotifyEmail ?? null,
    searchIndexing: row?.searchIndexing ?? true,
    seo: row?.seo ?? {},
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

async function checkMedia(values: SettingsValues): Promise<Record<string, string> | null> {
  const rows = await findMediaByIds(mediaIdsOf(values));
  const byId = new Map(rows.map((row) => [row.id, row]));
  const fields: Record<string, string> = {};

  const isRaster = (id: string) => mediaKindOf(byId.get(id)?.mimeType ?? "") === "image";
  const isLogo = (id: string) => isRaster(id) || byId.get(id)?.mimeType === "image/svg+xml";

  for (const field of ["logoLightId", "logoDarkId", "faviconId"] as const) {
    const id = values[field];
    if (!id) continue;
    if (!byId.has(id)) fields[field] = "Şəkil tapılmadı.";
    else if (!isLogo(id)) fields[field] = "Şəkil (PNG, WebP, SVG) seçin.";
  }
  if (values.faviconId && !fields.faviconId) {
    const favicon = byId.get(values.faviconId);
    if (favicon?.width && favicon.height && favicon.width !== favicon.height) {
      fields.faviconId = "Favikon kvadrat olmalıdır, məsələn 512 × 512.";
    }
  }
  if (values.ogImageId) {
    if (!byId.has(values.ogImageId)) fields.ogImageId = "Şəkil tapılmadı.";
    else if (!isRaster(values.ogImageId)) fields.ogImageId = "JPG, PNG və ya WebP şəkil seçin.";
  }
  if (values.catalogueFileId) {
    const file = byId.get(values.catalogueFileId);
    if (!file) fields.catalogueFileId = "Fayl tapılmadı.";
    else if (mediaKindOf(file.mimeType) !== "document") {
      fields.catalogueFileId = "PDF faylı seçin.";
    }
  }
  return Object.keys(fields).length ? fields : null;
}

export async function saveSettings(
  values: SettingsValues,
): Promise<{ settings: SettingsDto } | { error: DomainError }> {
  const fields = await checkMedia(values);
  if (fields) return { error: { status: 400, message: "Məlumatlar düzgün deyil.", fields } };

  const columns = {
    logoLightId: values.logoLightId,
    logoDarkId: values.logoDarkId,
    faviconId: values.faviconId,
    phones: values.phones,
    emails: values.emails,
    address: values.address,
    mapUrl: values.mapUrl,
    workingHours: values.workingHours,
    socials: values.socials,
    whatsappNumber: values.whatsappNumber,
    legalName: values.legalName,
    consultationNotifyEmail: values.consultationNotifyEmail,
    seoTitle: values.seoTitle,
    seoDescription: values.seoDescription,
    ogImageId: values.ogImageId,
    catalogueFileId: values.catalogueFileId,
    searchIndexing: values.searchIndexing,
    ...(values.seo ? { seo: values.seo } : {}),
  };
  await getDb()
    .insert(settings)
    .values({ id: 1, ...columns })
    .onConflictDoUpdate({ target: settings.id, set: { ...columns, updatedAt: new Date() } });
  return { settings: await getAdminSettings() };
}

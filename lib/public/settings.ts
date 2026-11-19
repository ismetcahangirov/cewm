import "server-only";

import { eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import type { SettingsRow } from "@/lib/admin/settings";
import { publicTags } from "@/lib/cache/tags";
import { getDb } from "@/lib/db";
import { media, settings, type SettingsPhone, type SettingsSocial } from "@/lib/db/schema";
import type { Localized } from "@/lib/i18n/localized";
import { routes } from "@/lib/routes";

type MediaRow = typeof media.$inferSelect;

export type SiteImage = {
  src: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  alt: Localized | null;
};

export type SiteFile = { src: string; mimeType: string; size: number };

export type SiteSettings = {
  logoLight: SiteImage | null;
  logoDark: SiteImage | null;
  favicon: SiteImage | null;
  ogImage: SiteImage | null;
  catalogueFile: SiteFile | null;
  phones: SettingsPhone[];
  emails: string[];
  address: Localized | null;
  mapUrl: string | null;
  workingHours: Localized | null;
  whatsappNumber: string | null;
  socials: SettingsSocial[];
  legalName: string | null;
  seoTitle: Localized | null;
  seoDescription: Localized | null;
};

function image(row: MediaRow | undefined): SiteImage | null {
  if (!row) return null;
  return {
    src: routes.media(row.key),
    mimeType: row.mimeType,
    width: row.width,
    height: row.height,
    alt: row.alt ?? null,
  };
}

export function toSiteSettings(row: SettingsRow | null, mediaRows: MediaRow[]): SiteSettings {
  const byId = new Map(mediaRows.map((item) => [item.id, item]));
  const pick = (id: string | null | undefined) => (id ? byId.get(id) : undefined);
  const catalogue = pick(row?.catalogueFileId);
  return {
    logoLight: image(pick(row?.logoLightId)),
    logoDark: image(pick(row?.logoDarkId)),
    favicon: image(pick(row?.faviconId)),
    ogImage: image(pick(row?.ogImageId)),
    catalogueFile: catalogue
      ? { src: routes.media(catalogue.key), mimeType: catalogue.mimeType, size: catalogue.size }
      : null,
    phones: row?.phones ?? [],
    emails: row?.emails ?? [],
    address: row?.address ?? null,
    mapUrl: row?.mapUrl ?? null,
    workingHours: row?.workingHours ?? null,
    whatsappNumber: row?.whatsappNumber ?? null,
    socials: row?.socials ?? [],
    legalName: row?.legalName ?? null,
    seoTitle: row?.seoTitle ?? null,
    seoDescription: row?.seoDescription ?? null,
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag(publicTags.settings, publicTags.catalog);
  cacheLife("hours");
  const [row = null] = await getDb().select().from(settings).where(eq(settings.id, 1));
  const ids = row
    ? [row.logoLightId, row.logoDarkId, row.faviconId, row.ogImageId, row.catalogueFileId].filter(
        (id): id is string => id !== null,
      )
    : [];
  const mediaRows = ids.length
    ? await getDb().select().from(media).where(inArray(media.id, ids))
    : [];
  return toSiteSettings(row, mediaRows);
}

import type { media } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";
import { pickExact } from "@/lib/i18n/localized";
import { routes } from "@/lib/routes";

export type PublicImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
  blurDataURL: string | null;
};

type MediaRow = typeof media.$inferSelect;

type ImageSource = {
  key: MediaRow["key"] | null;
  width: MediaRow["width"];
  height: MediaRow["height"];
  alt: MediaRow["alt"];
  lqip: MediaRow["lqip"];
};

export function toPublicImage(
  row: ImageSource | null | undefined,
  locale: Locale,
  fallbackAlt: string,
): PublicImage | null {
  if (!row?.key || !row.width || !row.height) return null;
  const alt = pickExact(row.alt, locale) ?? (fallbackAlt || pickExact(row.alt, "az") || "");
  return {
    src: routes.media(row.key),
    width: row.width,
    height: row.height,
    alt,
    blurDataURL: row.lqip,
  };
}

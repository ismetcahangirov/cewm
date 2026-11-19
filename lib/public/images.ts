import type { media } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";
import { pickLocale } from "@/lib/i18n/localized";
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
  const alt = row.alt ? pickLocale(row.alt, locale) : "";
  return {
    src: routes.media(row.key),
    width: row.width,
    height: row.height,
    alt: alt || fallbackAlt,
    blurDataURL: row.lqip,
  };
}

export function splitProductName(name: string): { model: string; type: string | null } {
  const [model, ...rest] = name.split(/\s+[–-]\s+/);
  const type = rest.join(" – ").trim();
  return { model: model.trim(), type: type || null };
}

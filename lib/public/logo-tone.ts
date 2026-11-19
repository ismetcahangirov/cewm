import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import sharp from "sharp";

import { publicTags } from "@/lib/cache/tags";
import { readMediaBytes } from "@/lib/media";

export type LogoTone = "light" | "dark";

const mediaPrefix = "/media/";

async function measure(src: string): Promise<LogoTone> {
  if (!src.startsWith(mediaPrefix)) return "dark";
  const bytes = await readMediaBytes(decodeURIComponent(src.slice(mediaPrefix.length)));
  if (!bytes) return "dark";
  const { data, info } = await sharp(bytes)
    .resize({ width: 96, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let weight = 0;
  let light = 0;
  for (let index = 0; index < data.length; index += info.channels) {
    const alpha = (data[index + 3] ?? 0) / 255;
    if (alpha < 0.1) continue;
    const luminance =
      (0.2126 * (data[index] ?? 0) +
        0.7152 * (data[index + 1] ?? 0) +
        0.0722 * (data[index + 2] ?? 0)) /
      255;
    weight += alpha;
    light += alpha * luminance;
  }
  return weight && light / weight > 0.82 ? "light" : "dark";
}

export async function getLogoTones(sources: string[]): Promise<Record<string, LogoTone>> {
  "use cache";
  cacheTag(publicTags.catalog);
  cacheLife("days");
  const tones = await Promise.all(
    sources.map(async (src) => [src, await measure(src).catch(() => "dark" as const)] as const),
  );
  return Object.fromEntries(tones);
}

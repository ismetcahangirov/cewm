import { z } from "zod";

import { heroFilmFormats, type HeroFilmFormat } from "@/lib/db/schema/content";

import { requiredText, uuid } from "./fields";
import type { MediaDto } from "./media";

export { heroFilmFormats, type HeroFilmFormat };

export const heroFilmKeyPattern = /^[a-z0-9]+(?:[-_/][a-z0-9]+)*$/;

export const heroFilmTiers = ["desktop", "mobile"] as const;

export type HeroFilmTier = (typeof heroFilmTiers)[number];

export function heroFilmFrameName(index: number): string {
  return String(index + 1).padStart(4, "0");
}

export function heroFilmFrameKey(
  prefix: string,
  index: number,
  format: HeroFilmFormat,
  tier?: HeroFilmTier,
): string {
  const folder = tier ? `${prefix}/${tier}` : prefix;
  return `${folder}/${heroFilmFrameName(index)}.${format}`;
}

export function heroFilmManifestKey(prefix: string): string {
  return `${prefix}/manifest.json`;
}

const manifestTier = z.object({
  width: z.number().int().min(160).max(7680),
  height: z.number().int().min(160).max(7680),
  count: z.number().int().min(2).max(2000),
});

const manifestPoster = z.object({
  key: z.string().regex(/^[a-z0-9][a-z0-9/._-]*$/),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const heroFilmManifestSchema = z.object({
  version: z.number().int().positive(),
  format: z.enum(heroFilmFormats),
  tiers: z.object({ desktop: manifestTier, mobile: manifestTier.optional() }),
  posters: z
    .object({ desktop: manifestPoster.optional(), mobile: manifestPoster.optional() })
    .optional(),
});

export type HeroFilmManifest = z.infer<typeof heroFilmManifestSchema>;

const dimension = (message: string) =>
  z.coerce
    .number(message)
    .int(message)
    .min(160, "Ən azı 160 px olmalıdır.")
    .max(7680, "Ən çox 7680 px ola bilər.");

export const heroFilmInputSchema = z.object({
  name: requiredText(120, "Filmin adını yazın."),
  keyPrefix: z
    .string("Qovluğu yazın.")
    .trim()
    .min(1, "Qovluğu yazın.")
    .max(200, "Ən çox 200 simvol ola bilər.")
    .regex(heroFilmKeyPattern, "Yalnız kiçik latın hərfləri, rəqəmlər, tire və «/»."),
  frameCount: z.coerce
    .number("Kadr sayını yazın.")
    .int("Kadr sayını yazın.")
    .min(2, "Ən azı 2 kadr olmalıdır.")
    .max(2000, "Ən çox 2000 kadr ola bilər."),
  frameWidth: dimension("Kadrın enini yazın."),
  frameHeight: dimension("Kadrın hündürlüyünü yazın."),
  format: z.enum(heroFilmFormats, "Formatı seçin."),
  posterId: z
    .union([z.literal(""), uuid("Şəkil düzgün deyil.")])
    .nullish()
    .transform((value) => value || null),
});

export type HeroFilmInput = z.input<typeof heroFilmInputSchema>;

export type HeroFilmValues = z.output<typeof heroFilmInputSchema>;

export type HeroFilmDto = {
  id: string;
  name: string;
  keyPrefix: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  format: HeroFilmFormat;
  poster: MediaDto | null;
  inUse: boolean;
  updatedAt: string;
};

export type HeroFilmOptionDto = Pick<HeroFilmDto, "id" | "name" | "frameCount">;

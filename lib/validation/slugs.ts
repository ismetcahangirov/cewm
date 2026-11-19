import { z } from "zod";

import "./locale";

import { locales } from "@/lib/i18n/config";

export const slugEntities = ["product", "category", "page", "post"] as const;

export type SlugEntity = (typeof slugEntities)[number];

export const slugCheckQuery = z.object({
  entity: z.enum(slugEntities),
  locale: z.enum(locales).optional().default("az"),
  slug: z.string().trim().max(96),
  excludeId: z
    .union([z.uuid(), z.literal("")])
    .optional()
    .default(""),
});

export type SlugCheckArgs = z.input<typeof slugCheckQuery>;

export type SlugCheckResult = { available: boolean; suggestion: string };

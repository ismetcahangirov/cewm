import { z } from "zod";

import type { Localized } from "@/lib/i18n/localized";

import { webUrlSchema } from "./client-logos";
import { localizedOptional, requiredText, slugText, uuid } from "./fields";
import type { MediaDto } from "./media";

export const brandInputSchema = z.object({
  name: requiredText(80, "Brendin adını yazın."),
  slug: z.string("Ünvanı yazın.").trim().min(1, "Ünvanı yazın.").pipe(slugText),
  logoId: z
    .union([z.literal(""), uuid("Loqo düzgün deyil.")])
    .nullish()
    .transform((value) => value || null),
  description: localizedOptional(2000),
  websiteUrl: webUrlSchema,
  isActive: z.boolean(),
});

export type BrandInput = z.input<typeof brandInputSchema>;

export type BrandValues = z.output<typeof brandInputSchema>;

export type BrandDto = {
  id: string;
  name: string;
  slug: string;
  description: Localized | null;
  websiteUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  logo: MediaDto | null;
};

export type BrandOptionDto = Pick<BrandDto, "id" | "name">;

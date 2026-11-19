import { z } from "zod";

import { locales } from "@/lib/i18n/config";
import type { RichTextDoc } from "@/lib/content/rich-text";
import type { Localized } from "@/lib/i18n/localized";

import {
  localizedOptional,
  localizedRichText,
  localizedSlug,
  localizedText,
  publishStatusSchema,
  uuid,
} from "./fields";
import { listQuerySchema, type ListArgs } from "./list";
import type { MediaDto } from "./media";

export const reservedPageSlugs = [
  "mehsullar",
  "mehsul",
  "kateqoriyalar",
  "bloq",
  "admin",
  "api",
  "media",
  "ru",
  "en",
  "de",
  "az",
  "_next",
] as const;

export const pageKinds = ["about", "contact", "consultation", "brands", "clients"] as const;

export type PageKind = (typeof pageKinds)[number];

export const pageKindLabels: Record<PageKind, string> = {
  about: "Haqqımızda",
  contact: "Əlaqə",
  consultation: "Konsultasiya",
  brands: "Brendlər",
  clients: "Müştərilər",
};

export const freePageLabel = "Sərbəst səhifə";

export const pageSortFields = ["updatedAt", "title", "status"] as const;

export type PageSortField = (typeof pageSortFields)[number];

export const pageListQuery = listQuerySchema(pageSortFields).extend({
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type PageListArgs = ListArgs<PageSortField>;

const reservedMessage = "Bu ünvan saytın bölməsinə aiddir. Başqa ünvan seçin.";

export const pageInputSchema = z
  .object({
    title: localizedText(200, "Səhifənin adını yazın."),
    slug: localizedSlug,
    content: localizedRichText,
    coverId: uuid().nullable(),
    status: publishStatusSchema,
    seoTitle: localizedOptional(120),
    seoDescription: localizedOptional(320),
  })
  .superRefine((value, context) => {
    for (const locale of locales) {
      const slug = value.slug[locale];
      if (slug && (reservedPageSlugs as readonly string[]).includes(slug)) {
        context.addIssue({ code: "custom", path: ["slug", locale], message: reservedMessage });
      }
    }
  });

export type PageInput = z.input<typeof pageInputSchema>;

export type PageValues = z.output<typeof pageInputSchema>;

export type PageListItemDto = {
  id: string;
  kind: PageKind | null;
  title: Localized;
  slug: Localized;
  status: "draft" | "published";
  menuItemCount: number;
  updatedAt: string;
};

export type PageDetailDto = {
  id: string;
  kind: PageKind | null;
  title: Localized;
  slug: Localized;
  content: Localized<RichTextDoc> | null;
  coverId: string | null;
  cover: MediaDto | null;
  status: "draft" | "published";
  seoTitle: Localized | null;
  seoDescription: Localized | null;
  menuItemCount: number;
  createdAt: string;
  updatedAt: string;
};

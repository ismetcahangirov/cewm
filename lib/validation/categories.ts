import { z } from "zod";

import type { RichTextDoc } from "@/lib/content/rich-text";
import type { Localized } from "@/lib/i18n/localized";

import { localizedOptional, localizedRichText, localizedSlug, localizedText, uuid } from "./fields";
import type { MediaDto } from "./media";

export const categoryMaxDepth = 1;

export const categoryInputSchema = z.object({
  name: localizedText(120, "Kateqoriyanın adını yazın."),
  slug: localizedSlug,
  description: localizedRichText,
  parentId: uuid().nullable(),
  imageId: uuid().nullable(),
  isActive: z.boolean(),
  seoTitle: localizedOptional(120),
  seoDescription: localizedOptional(320),
});

export type CategoryInput = z.input<typeof categoryInputSchema>;

export type CategoryValues = z.output<typeof categoryInputSchema>;

export const toggleCategorySchema = z.object({ isActive: z.boolean("Dəyər seçin.") });

export type ToggleCategoryInput = z.infer<typeof toggleCategorySchema>;

export const reorderCategoriesSchema = z.object({
  parentId: uuid().nullable(),
  orderedIds: z.array(uuid()).min(1, "Sıra boşdur.").max(500),
});

export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;

export const deleteCategorySchema = z.object({
  moveProductsTo: uuid().nullable(),
});

export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;

export type CategoryNodeDto = {
  id: string;
  parentId: string | null;
  name: Localized;
  slug: Localized;
  isActive: boolean;
  sortOrder: number;
  image: Pick<MediaDto, "src" | "alt"> | null;
  productCount: number;
  menuItemCount: number;
};

export type CategoryDetailDto = {
  id: string;
  name: Localized;
  slug: Localized;
  description: Localized<RichTextDoc> | null;
  parentId: string | null;
  imageId: string | null;
  image: MediaDto | null;
  isActive: boolean;
  seoTitle: Localized | null;
  seoDescription: Localized | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

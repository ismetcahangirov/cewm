import { z } from "zod";

import type { RichTextDoc } from "@/lib/content/rich-text";
import type { Localized } from "@/lib/i18n/localized";

import {
  localizedOptional,
  localizedRichText,
  localizedSlug,
  localizedText,
  optionalText,
  publishStatusSchema,
  uuid,
} from "./fields";
import { listQuerySchema, type ListArgs } from "./list";
import type { MediaDto } from "./media";

export const productSortFields = ["updatedAt", "name", "sku", "status"] as const;

export type ProductSortField = (typeof productSortFields)[number];

export const productStatusFilters = ["all", "published", "draft", "trash"] as const;

export type ProductStatusFilter = (typeof productStatusFilters)[number];

export const productListQuery = listQuerySchema(productSortFields).extend({
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  status: z.enum(productStatusFilters).optional().default("all"),
  categoryId: z
    .union([z.uuid(), z.literal("")])
    .optional()
    .default(""),
  excludeId: z
    .union([z.uuid(), z.literal("")])
    .optional()
    .default(""),
});

export type ProductListArgs = ListArgs<ProductSortField> & {
  status?: ProductStatusFilter;
  categoryId?: string;
  excludeId?: string;
};

export const specSchema = z.object({
  key: localizedText(120, "Göstəricinin adını yazın."),
  value: localizedText(250, "Dəyəri yazın."),
});

export const galleryImageSchema = z.object({
  mediaId: uuid("Şəkil seçin."),
  alt: localizedText(250, "Şəkil üçün alt mətn yazın."),
});

export const productInputSchema = z
  .object({
    name: localizedText(200, "Məhsulun adını yazın."),
    slug: localizedSlug,
    sku: optionalText(64),
    shortDescription: localizedRichText,
    description: localizedRichText,
    categoryIds: z
      .array(uuid())
      .max(20, "Ən çox 20 kateqoriya seçmək olar.")
      .refine((ids) => new Set(ids).size === ids.length, "Kateqoriya təkrarlanır."),
    specs: z.array(specSchema).max(60, "Ən çox 60 göstərici ola bilər."),
    images: z
      .array(galleryImageSchema)
      .max(40, "Ən çox 40 şəkil ola bilər.")
      .refine(
        (images) => new Set(images.map((image) => image.mediaId)).size === images.length,
        "Eyni şəkil iki dəfə əlavə olunub.",
      ),
    modelId: uuid().nullable(),
    modelPosterId: uuid().nullable(),
    relatedIds: z
      .array(uuid())
      .max(12, "Ən çox 12 əlaqəli məhsul seçmək olar.")
      .refine((ids) => new Set(ids).size === ids.length, "Məhsul təkrarlanır."),
    seoTitle: localizedOptional(120),
    seoDescription: localizedOptional(320),
    status: publishStatusSchema,
    isFeatured: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (value.modelId && !value.modelPosterId) {
      context.addIssue({
        code: "custom",
        path: ["modelPosterId"],
        message: "3D model üçün poster şəkli seçin.",
      });
    }
    if (value.status === "published" && value.images.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["images"],
        message: "Dərc etmək üçün ən azı bir şəkil əlavə edin.",
      });
    }
  });

export type ProductInput = z.input<typeof productInputSchema>;

export type ProductValues = z.output<typeof productInputSchema>;

export const productBulkActions = [
  "publish",
  "unpublish",
  "feature",
  "unfeature",
  "trash",
  "restore",
  "purge",
] as const;

export type ProductBulkAction = (typeof productBulkActions)[number];

export const bulkProductsSchema = z.object({
  action: z.enum(productBulkActions, "Əməliyyat seçin."),
  ids: z.array(uuid()).min(1, "Məhsul seçin.").max(200, "Bir dəfəyə ən çox 200 məhsul."),
});

export type BulkProductsInput = z.infer<typeof bulkProductsSchema>;

export type BulkProductsResult = { updated: number; skipped: number; message?: string };

export type ProductListItemDto = {
  id: string;
  name: Localized;
  slug: Localized;
  sku: string | null;
  status: "draft" | "published";
  isFeatured: boolean;
  thumbnail: Pick<MediaDto, "src" | "alt"> | null;
  categories: Localized[];
  updatedAt: string;
  deletedAt: string | null;
};

export type ProductOptionDto = Pick<ProductListItemDto, "id" | "name" | "sku" | "thumbnail">;

export type ProductDetailDto = {
  id: string;
  name: Localized;
  slug: Localized;
  sku: string | null;
  shortDescription: Localized<RichTextDoc> | null;
  description: Localized<RichTextDoc> | null;
  categoryIds: string[];
  specs: { key: Localized; value: Localized }[];
  images: { mediaId: string; alt: Localized }[];
  media: MediaDto[];
  modelId: string | null;
  modelPosterId: string | null;
  related: ProductOptionDto[];
  seoTitle: Localized | null;
  seoDescription: Localized | null;
  status: "draft" | "published";
  isFeatured: boolean;
  publishedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

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

export const productLimits = {
  benefits: 12,
  specs: 80,
  images: 40,
  documents: 20,
  related: 12,
} as const;

export const specSchema = z.object({
  label: localizedText(120, "Göstəricinin adını yazın."),
  value: localizedText(250, "Dəyəri yazın."),
  unit: localizedOptional(30),
  group: localizedOptional(120),
});

export const benefitSchema = z.object({ text: localizedText(400, "Üstünlüyü yazın.") });

export const documentSchema = z.object({
  mediaId: uuid("Sənəd seçin."),
  title: localizedText(160, "Sənədin adını yazın."),
});

const optionalId = z
  .union([z.literal(""), uuid("Seçim düzgün deyil.")])
  .nullish()
  .transform((value) => value || null);

const videoUrlSchema = z
  .string()
  .trim()
  .max(500, "Link çox uzundur.")
  .refine(
    (value) => !value || z.url({ protocol: /^https$/ }).safeParse(value).success,
    "Video linkini https:// ilə tam yazın, məsələn YouTube linki.",
  )
  .nullish()
  .transform((value) => value || null);

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
    brandId: optionalId,
    benefits: z
      .array(benefitSchema)
      .max(productLimits.benefits, `Ən çox ${productLimits.benefits} üstünlük ola bilər.`),
    specs: z
      .array(specSchema)
      .max(productLimits.specs, `Ən çox ${productLimits.specs} göstərici ola bilər.`),
    images: z
      .array(galleryImageSchema)
      .max(productLimits.images, `Ən çox ${productLimits.images} şəkil ola bilər.`)
      .refine(
        (images) => new Set(images.map((image) => image.mediaId)).size === images.length,
        "Eyni şəkil iki dəfə əlavə olunub.",
      ),
    documents: z
      .array(documentSchema)
      .max(productLimits.documents, `Ən çox ${productLimits.documents} sənəd ola bilər.`)
      .refine(
        (documents) => new Set(documents.map((item) => item.mediaId)).size === documents.length,
        "Eyni sənəd iki dəfə əlavə olunub.",
      ),
    videoId: optionalId,
    videoUrl: videoUrlSchema,
    videoPosterId: optionalId,
    relatedIds: z
      .array(uuid())
      .max(productLimits.related, `Ən çox ${productLimits.related} əlaqəli məhsul seçmək olar.`)
      .refine((ids) => new Set(ids).size === ids.length, "Məhsul təkrarlanır."),
    seoTitle: localizedOptional(120),
    seoDescription: localizedOptional(320),
    status: publishStatusSchema,
    isFeatured: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (value.videoId && value.videoUrl) {
      context.addIssue({
        code: "custom",
        path: ["videoUrl"],
        message: "Ya video faylı, ya da link seçin, ikisini birlikdə yox.",
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
  brand: string | null;
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
  brandId: string | null;
  benefits: Localized[];
  specs: { label: Localized; value: Localized; unit: Localized | null; group: Localized | null }[];
  images: { mediaId: string; alt: Localized }[];
  documents: { mediaId: string; title: Localized }[];
  media: MediaDto[];
  videoId: string | null;
  videoUrl: string | null;
  videoPosterId: string | null;
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

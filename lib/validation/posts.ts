import { z } from "zod";

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

export const postSortFields = ["updatedAt", "publishedAt", "title"] as const;

export type PostSortField = (typeof postSortFields)[number];

export const postStatusFilters = ["all", "published", "scheduled", "draft"] as const;

export type PostStatusFilter = (typeof postStatusFilters)[number];

export type PostState = "draft" | "published" | "scheduled";

export const postListQuery = listQuerySchema(postSortFields).extend({
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  status: z.enum(postStatusFilters).optional().default("all"),
});

export type PostListArgs = ListArgs<PostSortField> & { status?: PostStatusFilter };

export const postInputSchema = z.object({
  title: localizedText(200, "Yazının başlığını yazın."),
  slug: localizedSlug,
  excerpt: localizedOptional(500),
  content: localizedRichText,
  coverId: uuid().nullable(),
  status: publishStatusSchema,
  publishedAt: z.iso.datetime({ offset: true, message: "Tarix və saatı düzgün yazın." }).nullable(),
  seoTitle: localizedOptional(120),
  seoDescription: localizedOptional(320),
});

export type PostInput = z.input<typeof postInputSchema>;

export type PostValues = z.output<typeof postInputSchema>;

export type PostListItemDto = {
  id: string;
  title: Localized;
  slug: Localized;
  status: "draft" | "published";
  state: PostState;
  publishedAt: string | null;
  cover: Pick<MediaDto, "src" | "alt"> | null;
  updatedAt: string;
};

export type PostDetailDto = {
  id: string;
  title: Localized;
  slug: Localized;
  excerpt: Localized | null;
  content: Localized<RichTextDoc> | null;
  coverId: string | null;
  cover: MediaDto | null;
  status: "draft" | "published";
  state: PostState;
  publishedAt: string | null;
  seoTitle: Localized | null;
  seoDescription: Localized | null;
  createdAt: string;
  updatedAt: string;
};

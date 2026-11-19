import { z } from "zod";

import "./locale";

import type { Localized } from "@/lib/i18n/localized";

import { localizedOptional } from "./fields";
import { listQuerySchema, type ListArgs } from "./list";

export const mediaSortFields = ["createdAt", "key", "size"] as const;

export type MediaSortField = (typeof mediaSortFields)[number];

export const mediaKinds = ["image", "video", "model", "document"] as const;

export type MediaKind = (typeof mediaKinds)[number];

export const mediaTypes = {
  "image/jpeg": { kind: "image", extension: "jpg", maxSize: 20 * 1024 * 1024 },
  "image/png": { kind: "image", extension: "png", maxSize: 20 * 1024 * 1024 },
  "image/webp": { kind: "image", extension: "webp", maxSize: 20 * 1024 * 1024 },
  "image/avif": { kind: "image", extension: "avif", maxSize: 20 * 1024 * 1024 },
  "image/gif": { kind: "image", extension: "gif", maxSize: 10 * 1024 * 1024 },
  "video/mp4": { kind: "video", extension: "mp4", maxSize: 100 * 1024 * 1024 },
  "video/webm": { kind: "video", extension: "webm", maxSize: 100 * 1024 * 1024 },
  "model/gltf-binary": { kind: "model", extension: "glb", maxSize: 50 * 1024 * 1024 },
  "application/pdf": { kind: "document", extension: "pdf", maxSize: 30 * 1024 * 1024 },
} as const satisfies Record<string, { kind: MediaKind; extension: string; maxSize: number }>;

export type MediaType = keyof typeof mediaTypes;

export const mediaTypeNames = Object.keys(mediaTypes) as [MediaType, ...MediaType[]];

export function mediaTypeOf(file: { name: string; type: string }): MediaType | null {
  if (file.type in mediaTypes) return file.type as MediaType;
  if (file.name.toLowerCase().endsWith(".glb")) return "model/gltf-binary";
  return null;
}

export function mediaKindOf(mimeType: string): MediaKind | null {
  return mimeType in mediaTypes ? mediaTypes[mimeType as MediaType].kind : null;
}

export const acceptByKind: Record<MediaKind, string> = {
  image: "image/jpeg,image/png,image/webp,image/avif,image/gif",
  video: "video/mp4,video/webm",
  model: ".glb,model/gltf-binary",
  document: "application/pdf",
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export const mediaListQuery = listQuerySchema(mediaSortFields).extend({
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  kind: z
    .enum([...mediaKinds, "all"])
    .optional()
    .default("image"),
  unused: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
});

export type MediaListArgs = ListArgs<MediaSortField> & {
  kind?: MediaKind | "all";
  unused?: boolean;
};

export const uploadRequestSchema = z
  .object({
    fileName: z.string().trim().min(1, "Fayl adı yoxdur.").max(200, "Fayl adı çox uzundur."),
    contentType: z.enum(mediaTypeNames, "Bu fayl növü dəstəklənmir."),
    size: z.number().int().positive("Fayl boşdur."),
  })
  .superRefine((value, context) => {
    const limit = mediaTypes[value.contentType].maxSize;
    if (value.size > limit) {
      context.addIssue({
        code: "custom",
        path: ["size"],
        message: `Fayl ${formatFileSize(limit)}-dan böyük ola bilməz.`,
      });
    }
  });

export type UploadRequestInput = z.infer<typeof uploadRequestSchema>;

export type UploadTicket = {
  key: string;
  url: string;
  headers: Record<string, string>;
};

export const completeUploadSchema = z.object({
  key: z
    .string()
    .regex(/^uploads\/\d{4}\/\d{2}\/[a-z0-9-]+\.[a-z0-9]+$/, "Fayl açarı düzgün deyil."),
  alt: localizedOptional(250),
});

export type CompleteUploadInput = z.input<typeof completeUploadSchema>;

export const updateMediaSchema = z.object({ alt: localizedOptional(250) });

export type UpdateMediaInput = z.input<typeof updateMediaSchema>;

export const mediaUsageKinds = [
  "products",
  "categories",
  "projects",
  "posts",
  "vacancies",
  "pages",
  "logos",
  "team",
  "settings",
  "content",
  "derived",
] as const;

export type MediaUsageKind = (typeof mediaUsageKinds)[number];

export type MediaUsage = Record<MediaUsageKind, number>;

export type MediaDto = {
  id: string;
  key: string;
  src: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  size: number;
  alt: string | null;
  alts: Localized | null;
  createdAt: string;
};

export type MediaLibraryItem = MediaDto & { usage: MediaUsage; usageTotal: number };

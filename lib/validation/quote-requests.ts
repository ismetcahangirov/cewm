import { z } from "zod";

import "./locale";

import { locales, type Locale } from "@/lib/i18n/config";
import { normalizeAzerbaijaniPhone } from "@/lib/phone";

import { optionalText, uuid } from "./fields";
import { listQuerySchema, type ListArgs } from "./list";
import { quoteHoneypotField } from "./quote-honeypot";

export { quoteHoneypotField };

export const quoteRequestStatuses = ["new", "in-progress", "done"] as const;

export type QuoteRequestStatus = (typeof quoteRequestStatuses)[number];

export const quoteRequestStatusLabels: Record<QuoteRequestStatus, string> = {
  new: "Yeni",
  "in-progress": "Baxılıb",
  done: "Cavablandı",
};

export const quoteRequestLocaleLabels: Record<Locale, string> = {
  az: "Azərbaycanca",
  ru: "Rusca",
  en: "İngiliscə",
};

export const quoteRateLimit = { requests: 5, windowMinutes: 60 } as const;

export const azerbaijaniMobileOrLandlinePhone = z
  .string("Telefon nömrəsini yazın.")
  .trim()
  .min(1, "Telefon nömrəsini yazın.")
  .max(32, "Telefon nömrəsi düzgün deyil.")
  .transform((value, context) => {
    const normalized = normalizeAzerbaijaniPhone(value);
    if (!normalized) {
      context.addIssue({
        code: "custom",
        message: "Nömrəni +994 XX XXX XX XX və ya 0XX XXX XX XX şəklində yazın.",
      });
      return z.NEVER;
    }
    return normalized;
  });

export const optionalEmail = optionalText(254).pipe(
  z.email("E-poçt ünvanı düzgün deyil.").toLowerCase().nullable(),
);

export const quoteSubmissionSchema = z.object({
  name: z
    .string("Adınızı yazın.")
    .trim()
    .min(2, "Ad ən azı 2 simvol olmalıdır.")
    .max(120, "Ad ən çox 120 simvol ola bilər.")
    .transform((value) => value.replace(/\s+/g, " ")),
  phone: azerbaijaniMobileOrLandlinePhone,
  email: optionalEmail,
  company: optionalText(200),
  message: optionalText(2000),
  productIds: z
    .array(uuid("Məhsul düzgün deyil."))
    .max(50, "Ən çox 50 məhsul seçmək olar.")
    .optional()
    .default([])
    .transform((ids) => [...new Set(ids)]),
  locale: z.enum(locales, "Dil düzgün deyil.").optional().default("az"),
  [quoteHoneypotField]: z.string().max(500).nullish(),
});

export type QuoteSubmissionInput = z.input<typeof quoteSubmissionSchema>;

export type QuoteSubmissionValues = z.output<typeof quoteSubmissionSchema>;

export const quoteRequestSortFields = ["createdAt", "name", "status"] as const;

export type QuoteRequestSortField = (typeof quoteRequestSortFields)[number];

export const quoteRequestStatusFilters = ["all", ...quoteRequestStatuses] as const;

export type QuoteRequestStatusFilter = (typeof quoteRequestStatusFilters)[number];

export const quoteRequestListQuery = listQuerySchema(quoteRequestSortFields).extend({
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  status: z.enum(quoteRequestStatusFilters).optional().default("all"),
});

export type QuoteRequestListArgs = ListArgs<QuoteRequestSortField> & {
  status?: QuoteRequestStatusFilter;
};

export const quoteRequestExportQuery = z.object({
  search: z.string().trim().max(100).optional().default(""),
  status: z.enum(quoteRequestStatusFilters).optional().default("all"),
});

export type QuoteRequestFilters = z.output<typeof quoteRequestExportQuery>;

export const updateQuoteRequestSchema = z
  .object({
    status: z.enum(quoteRequestStatuses, "Status seçin.").optional(),
    internalNote: z
      .string()
      .trim()
      .max(5000, "Ən çox 5000 simvol ola bilər.")
      .nullable()
      .optional()
      .transform((value) => (value === undefined ? undefined : value || null)),
  })
  .refine((value) => value.status !== undefined || value.internalNote !== undefined, {
    message: "Dəyişiklik yoxdur.",
  });

export type UpdateQuoteRequestInput = z.input<typeof updateQuoteRequestSchema>;

export type UpdateQuoteRequestValues = z.output<typeof updateQuoteRequestSchema>;

export type QuoteRequestListItemDto = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  status: QuoteRequestStatus;
  locale: Locale;
  productCount: number;
  createdAt: string;
};

export type QuoteRequestProductDto = {
  id: string;
  productId: string | null;
  name: string;
  inTrash: boolean;
  thumbnail: { src: string; alt: string | null } | null;
};

export type QuoteRequestDetailDto = Omit<QuoteRequestListItemDto, "productCount"> & {
  message: string | null;
  internalNote: string | null;
  products: QuoteRequestProductDto[];
  updatedAt: string;
  markedSeen: boolean;
};

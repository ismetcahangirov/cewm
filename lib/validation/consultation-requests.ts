import { z } from "zod";

import "./locale";

import { locales, type Locale } from "@/lib/i18n/config";
import { normalizeAzerbaijaniPhone } from "@/lib/phone";

import { optionalText, uuid } from "./fields";
import { listQuerySchema, type ListArgs } from "./list";
import { consultationHoneypotField } from "./consultation-honeypot";

export { consultationHoneypotField };

export const consultationRequestStatuses = ["new", "in-progress", "done"] as const;

export type ConsultationRequestStatus = (typeof consultationRequestStatuses)[number];

export const consultationRequestStatusLabels: Record<ConsultationRequestStatus, string> = {
  new: "Yeni",
  "in-progress": "Baxılıb",
  done: "Cavablandı",
};

export const consultationRequestLocaleLabels: Record<Locale, string> = {
  az: "Azərbaycanca",
  ru: "Rusca",
  en: "İngiliscə",
  de: "Almanca",
};

export const consultationRateLimit = { requests: 5, windowMinutes: 60 } as const;

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

export const consultationSubmissionSchema = z.object({
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
  [consultationHoneypotField]: z.string().max(500).nullish(),
});

export type ConsultationSubmissionInput = z.input<typeof consultationSubmissionSchema>;

export type ConsultationSubmissionValues = z.output<typeof consultationSubmissionSchema>;

export const consultationRequestSortFields = ["createdAt", "name", "status"] as const;

export type ConsultationRequestSortField = (typeof consultationRequestSortFields)[number];

export const consultationRequestStatusFilters = ["all", ...consultationRequestStatuses] as const;

export type ConsultationRequestStatusFilter = (typeof consultationRequestStatusFilters)[number];

export const consultationRequestListQuery = listQuerySchema(consultationRequestSortFields).extend({
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  status: z.enum(consultationRequestStatusFilters).optional().default("all"),
});

export type ConsultationRequestListArgs = ListArgs<ConsultationRequestSortField> & {
  status?: ConsultationRequestStatusFilter;
};

export const consultationRequestExportQuery = z.object({
  search: z.string().trim().max(100).optional().default(""),
  status: z.enum(consultationRequestStatusFilters).optional().default("all"),
});

export type ConsultationRequestFilters = z.output<typeof consultationRequestExportQuery>;

export const updateConsultationRequestSchema = z
  .object({
    status: z.enum(consultationRequestStatuses, "Status seçin.").optional(),
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

export type UpdateConsultationRequestInput = z.input<typeof updateConsultationRequestSchema>;

export type UpdateConsultationRequestValues = z.output<typeof updateConsultationRequestSchema>;

export type ConsultationRequestListItemDto = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  status: ConsultationRequestStatus;
  locale: Locale;
  productCount: number;
  createdAt: string;
};

export type ConsultationRequestProductDto = {
  id: string;
  productId: string | null;
  name: string;
  inTrash: boolean;
  thumbnail: { src: string; alt: string | null } | null;
};

export type ConsultationRequestDetailDto = Omit<ConsultationRequestListItemDto, "productCount"> & {
  message: string | null;
  internalNote: string | null;
  products: ConsultationRequestProductDto[];
  updatedAt: string;
  markedSeen: boolean;
};

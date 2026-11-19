import { z } from "zod";

import type { Localized } from "@/lib/i18n/localized";
import { normalizeAzerbaijaniPhone } from "@/lib/phone";

import { localizedText, uuid } from "./fields";
import type { MediaDto } from "./media";

export const contactPhoneLimit = 4;

const phoneMessage = "Nömrəni düzgün yazın, məsələn +994 12 480 05 70.";

const phoneSchema = z
  .string()
  .trim()
  .max(32, "Nömrə düzgün deyil.")
  .transform((value, context) => {
    const normalized = normalizeAzerbaijaniPhone(value);
    if (!normalized) {
      context.addIssue({ code: "custom", message: phoneMessage });
      return z.NEVER;
    }
    return normalized;
  });

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(32, "Nömrə düzgün deyil.")
  .nullish()
  .transform((value, context) => {
    if (!value) return null;
    const normalized = normalizeAzerbaijaniPhone(value);
    if (!normalized) {
      context.addIssue({ code: "custom", message: phoneMessage });
      return z.NEVER;
    }
    return normalized;
  });

export const contactPersonInputSchema = z.object({
  name: localizedText(120, "Adı və soyadı yazın."),
  role: localizedText(120, "Vəzifəni yazın."),
  phones: z
    .array(z.object({ number: phoneSchema }))
    .max(contactPhoneLimit, `Ən çox ${contactPhoneLimit} nömrə ola bilər.`)
    .transform((rows) => [...new Set(rows.map((row) => row.number))]),
  email: z
    .union([z.literal(""), z.email("E-poçt ünvanı düzgün deyil.").trim().max(200)])
    .nullish()
    .transform((value) => value || null),
  whatsapp: optionalPhoneSchema,
  photoId: z
    .union([z.literal(""), uuid("Şəkil düzgün deyil.")])
    .nullish()
    .transform((value) => value || null),
  isActive: z.boolean(),
});

export type ContactPersonInput = z.input<typeof contactPersonInputSchema>;

export type ContactPersonValues = z.output<typeof contactPersonInputSchema>;

export type ContactPersonDto = {
  id: string;
  name: Localized;
  role: Localized;
  phones: string[];
  email: string | null;
  whatsapp: string | null;
  photo: MediaDto | null;
  sortOrder: number;
  isActive: boolean;
};

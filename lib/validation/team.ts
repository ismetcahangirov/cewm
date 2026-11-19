import { z } from "zod";

import type { Localized } from "@/lib/i18n/localized";
import { normalizeAzerbaijaniPhone } from "@/lib/phone";

import { localizedOptional, localizedText, requiredText, uuid } from "./fields";
import type { MediaDto } from "./media";

export const firstStartedYear = 1990;

export function bakuYear(now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Baku" }).format(now),
  );
}

export function yearsSince(startedYear: number, now = new Date()): number {
  return Math.max(0, bakuYear(now) - startedYear);
}

const startedYearSchema = z
  .union([z.literal(""), z.coerce.number("İli rəqəmlə yazın.").int("İli rəqəmlə yazın.")])
  .nullish()
  .transform((value, context) => {
    if (value === "" || value === null || value === undefined) return null;
    if (value < firstStartedYear || value > bakuYear()) {
      context.addIssue({ code: "custom", message: "İl 1990 ilə bu il arasında olmalıdır." });
      return z.NEVER;
    }
    return value;
  });

const phoneSchema = z
  .string()
  .trim()
  .max(32, "Nömrə düzgün deyil.")
  .nullish()
  .transform((value, context) => {
    if (!value) return null;
    const normalized = normalizeAzerbaijaniPhone(value);
    if (!normalized) {
      context.addIssue({
        code: "custom",
        message: "Nömrəni düzgün yazın, məsələn +994 55 255 54 23.",
      });
      return z.NEVER;
    }
    return normalized;
  });

export const teamMemberInputSchema = z.object({
  name: requiredText(120, "Adı və soyadı yazın."),
  role: localizedText(120, "Vəzifəni yazın."),
  bio: localizedOptional(600),
  photoId: z
    .union([z.literal(""), uuid("Şəkil düzgün deyil.")])
    .nullish()
    .transform((value) => value || null),
  startedYear: startedYearSchema,
  phone: phoneSchema,
  email: z
    .union([z.literal(""), z.email("E-poçt ünvanı düzgün deyil.").trim().max(200)])
    .nullish()
    .transform((value) => value || null),
  isActive: z.boolean(),
});

export type TeamMemberInput = z.input<typeof teamMemberInputSchema>;

export type TeamMemberValues = z.output<typeof teamMemberInputSchema>;

export const toggleTeamMemberSchema = z.object({ isActive: z.boolean("Dəyər seçin.") });

export type ToggleTeamMemberInput = z.infer<typeof toggleTeamMemberSchema>;

export const reorderTeamSchema = z.object({
  orderedIds: z.array(uuid()).min(1, "Sıra boşdur.").max(500),
});

export type ReorderTeamInput = z.infer<typeof reorderTeamSchema>;

export type TeamMemberDto = {
  id: string;
  name: string;
  role: Localized;
  bio: Localized | null;
  photo: MediaDto | null;
  startedYear: number | null;
  phone: string | null;
  email: string | null;
  sortOrder: number;
  isActive: boolean;
};

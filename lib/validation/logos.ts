import { z } from "zod";

import { requiredText, uuid } from "./fields";
import type { MediaDto } from "./media";

export const logoGroups = ["references", "partners"] as const;

export type LogoGroup = (typeof logoGroups)[number];

export const logoGroupLabels: Record<LogoGroup, string> = {
  references: "Referanslar",
  partners: "Partnyorlar",
};

export const logoGroupSchema = z.enum(logoGroups, "Qrupu seçin.");

function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export const logoUrlSchema = z
  .string()
  .trim()
  .max(2000, "Ən çox 2000 simvol ola bilər.")
  .refine(
    (value) => value === "" || isWebUrl(value),
    "Tam ünvan yazın: http:// və ya https:// ilə başlamalıdır.",
  )
  .nullish()
  .transform((value) => value || null);

export const logoInputSchema = z.object({
  name: requiredText(120, "Adı yazın."),
  imageId: uuid("Loqo şəklini seçin."),
  url: logoUrlSchema,
  group: logoGroupSchema,
  isActive: z.boolean(),
});

export type LogoInput = z.input<typeof logoInputSchema>;

export type LogoValues = z.output<typeof logoInputSchema>;

export const logoListQuery = z.object({
  group: logoGroupSchema.optional(),
});

export const toggleLogoSchema = z.object({ isActive: z.boolean("Dəyər seçin.") });

export type ToggleLogoInput = z.infer<typeof toggleLogoSchema>;

export const reorderLogosSchema = z.object({
  group: logoGroupSchema,
  orderedIds: z.array(uuid()).min(1, "Sıra boşdur.").max(500),
});

export type ReorderLogosInput = z.infer<typeof reorderLogosSchema>;

export type LogoDto = {
  id: string;
  name: string;
  url: string | null;
  group: LogoGroup;
  sortOrder: number;
  isActive: boolean;
  image: MediaDto | null;
};

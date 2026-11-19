import { z } from "zod";

import { requiredText, uuid } from "./fields";
import type { MediaDto } from "./media";

function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export const webUrlSchema = z
  .string()
  .trim()
  .max(2000, "Ən çox 2000 simvol ola bilər.")
  .refine(
    (value) => value === "" || isWebUrl(value),
    "Tam ünvan yazın: http:// və ya https:// ilə başlamalıdır.",
  )
  .nullish()
  .transform((value) => value || null);

export const clientLogoInputSchema = z.object({
  name: requiredText(120, "Adı yazın."),
  imageId: uuid("Loqo şəklini seçin."),
  url: webUrlSchema,
  isActive: z.boolean(),
});

export type ClientLogoInput = z.input<typeof clientLogoInputSchema>;

export type ClientLogoValues = z.output<typeof clientLogoInputSchema>;

export const toggleActiveSchema = z.object({ isActive: z.boolean("Dəyər seçin.") });

export type ToggleActiveInput = z.infer<typeof toggleActiveSchema>;

export const reorderSchema = z.object({
  orderedIds: z.array(uuid()).min(1, "Sıra boşdur.").max(500),
});

export type ReorderInput = z.infer<typeof reorderSchema>;

export type ClientLogoDto = {
  id: string;
  name: string;
  url: string | null;
  sortOrder: number;
  isActive: boolean;
  image: MediaDto | null;
};

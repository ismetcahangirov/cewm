import { z } from "zod";

import type { Locale } from "./config";

export type Localized<T = string> = { az: T; ru?: T | null; en?: T | null; de?: T | null };

export function pickLocale<T>(field: Localized<T>, locale: Locale): T {
  const value = field[locale];
  if (value === null || value === undefined || value === "") return field.az;
  return value;
}

export function pickExact(field: Localized | null | undefined, locale: Locale): string | null {
  return field?.[locale]?.trim() || null;
}

export const localizedString = z.object({
  az: z.string().trim().min(1),
  ru: z.string().trim().nullish(),
  en: z.string().trim().nullish(),
  de: z.string().trim().nullish(),
});

import "server-only";

import { getTextOverrides } from "@/lib/public/texts";

import type { Locale } from "./config";
import type az from "./dictionaries/az.json";
import { applyTextOverrides } from "./text-overrides";

export type Dictionary = typeof az;

const sources: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  az: () => import("./dictionaries/az.json"),
  ru: () => import("./dictionaries/ru.json"),
  en: () => import("./dictionaries/en.json"),
  de: () => import("./dictionaries/de.json"),
};

export async function getBaseDictionary(locale: Locale): Promise<Dictionary> {
  return (await sources[locale]()).default;
}

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const [base, overrides] = await Promise.all([getBaseDictionary(locale), getTextOverrides()]);
  return applyTextOverrides(base, locale, overrides);
}

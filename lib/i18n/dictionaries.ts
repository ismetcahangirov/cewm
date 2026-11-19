import "server-only";

import type { Locale } from "./config";
import type az from "./dictionaries/az.json";

export type Dictionary = typeof az;

const sources: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  az: () => import("./dictionaries/az.json"),
  ru: () => import("./dictionaries/ru.json"),
  en: () => import("./dictionaries/en.json"),
  de: () => import("./dictionaries/de.json"),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return (await sources[locale]()).default;
}

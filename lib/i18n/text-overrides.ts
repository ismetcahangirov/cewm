import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries";

export type TextOverrides = Record<string, Partial<Record<Locale, string>>>;

export const hiddenTextGroups: readonly string[] = ["locales"];

export const hiddenTextKeys: readonly string[] = ["consultation.honeypot"];

export function flattenDictionary(source: object, prefix = ""): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") flat[path] = value;
    else if (value && typeof value === "object")
      Object.assign(flat, flattenDictionary(value, path));
  }
  return flat;
}

export function editableTextKeys(az: Dictionary): string[] {
  return Object.keys(flattenDictionary(az)).filter(
    (key) => !hiddenTextGroups.includes(key.split(".")[0] ?? "") && !hiddenTextKeys.includes(key),
  );
}

export function textPlaceholders(text: string): string[] {
  return [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? ""))].sort();
}

export function applyTextOverrides(
  dictionary: Dictionary,
  locale: Locale,
  overrides: TextOverrides,
): Dictionary {
  const entries = Object.entries(overrides).filter(([, byLocale]) => byLocale[locale]?.trim());
  if (!entries.length) return dictionary;
  const next = structuredClone(dictionary) as Record<string, unknown>;
  for (const [key, byLocale] of entries) {
    const value = byLocale[locale]?.trim();
    if (!value) continue;
    const path = key.split(".");
    const leaf = path.pop();
    let node: unknown = next;
    for (const part of path) {
      node = node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined;
    }
    if (
      leaf &&
      node &&
      typeof node === "object" &&
      typeof (node as Record<string, unknown>)[leaf] === "string"
    ) {
      (node as Record<string, unknown>)[leaf] = value;
    }
  }
  return next as Dictionary;
}

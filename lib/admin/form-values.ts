import type { RichTextDoc } from "@/lib/content/rich-text";
import type { Localized } from "@/lib/i18n/localized";

export function formText(value: Localized | null | undefined) {
  return { az: value?.az ?? "", ru: value?.ru ?? "", en: value?.en ?? "", de: value?.de ?? "" };
}

export function formRichText(value: Localized<RichTextDoc> | null | undefined) {
  return {
    az: value?.az ?? null,
    ru: value?.ru ?? null,
    en: value?.en ?? null,
    de: value?.de ?? null,
  };
}

export function hasLocaleError(value: unknown, locale: string): boolean {
  return Boolean(value && typeof value === "object" && locale in value);
}

export function filledLocales(
  value: { ru?: unknown; en?: unknown; de?: unknown } | null | undefined,
): Record<"ru" | "en" | "de", boolean> {
  return { ru: Boolean(value?.ru), en: Boolean(value?.en), de: Boolean(value?.de) };
}

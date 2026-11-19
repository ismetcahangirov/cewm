import { z } from "zod";

import "./locale";

import az from "@/lib/i18n/dictionaries/az.json";
import { locales } from "@/lib/i18n/config";
import {
  editableTextKeys,
  flattenDictionary,
  textPlaceholders,
  type TextOverrides,
} from "@/lib/i18n/text-overrides";

import { optionalText } from "./fields";

export const siteTextMaxLength = 600;

const defaults = flattenDictionary(az);

export const editableKeys = new Set(editableTextKeys(az));

const textRow = z.object({
  az: optionalText(siteTextMaxLength),
  ru: optionalText(siteTextMaxLength),
  en: optionalText(siteTextMaxLength),
  de: optionalText(siteTextMaxLength),
});

export const siteTextsInputSchema = z
  .object({ texts: z.record(z.string(), textRow) })
  .superRefine((input, context) => {
    for (const [key, row] of Object.entries(input.texts)) {
      if (!editableKeys.has(key)) {
        context.addIssue({ code: "custom", path: ["texts", key], message: "Bu mətn tapılmadı." });
        continue;
      }
      const expected = textPlaceholders(defaults[key] ?? "").join();
      for (const locale of locales) {
        const value = row[locale];
        if (value && textPlaceholders(value).join() !== expected) {
          context.addIssue({
            code: "custom",
            path: ["texts", key, locale],
            message: "Mətndə {name} olduğu kimi qalmalıdır.".replace(
              "{name}",
              expected
                .split(",")
                .map((name) => `{${name}}`)
                .join(", "),
            ),
          });
        }
      }
    }
  })
  .transform((input): { texts: TextOverrides } => {
    const texts: TextOverrides = {};
    for (const [key, row] of Object.entries(input.texts)) {
      const kept = Object.fromEntries(
        locales.flatMap((locale) => (row[locale] ? [[locale, row[locale]]] : [])),
      );
      if (Object.keys(kept).length) texts[key] = kept;
    }
    return { texts };
  });

export type SiteTextsInput = z.input<typeof siteTextsInputSchema>;

export type SiteTextsDto = { texts: TextOverrides; updatedAt: string | null };

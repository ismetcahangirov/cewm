import { z } from "zod";

import "./locale";

import type { RichTextDoc, RichTextMark, RichTextNode } from "@/lib/content/rich-text";
import type { Localized } from "@/lib/i18n/localized";

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const required = "Bu sahəni doldurun.";

export const uuid = (message = "Seçim düzgün deyil.") => z.uuid(message);

export function requiredText(max: number, message = required) {
  return z.string(message).trim().min(1, message).max(max, `Ən çox ${max} simvol ola bilər.`);
}

export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Ən çox ${max} simvol ola bilər.`)
    .nullish()
    .transform((value) => value || null);
}

export const slugText = z
  .string()
  .trim()
  .max(96, "Ən çox 96 simvol ola bilər.")
  .regex(slugPattern, "Yalnız kiçik latın hərfləri, rəqəmlər və tire.");

export function localizedText(max: number, message = required) {
  return z.object({
    az: requiredText(max, message),
    ru: optionalText(max),
    en: optionalText(max),
    de: optionalText(max),
  });
}

export function localizedOptional(max: number) {
  return z
    .object({
      az: optionalText(max),
      ru: optionalText(max),
      en: optionalText(max),
      de: optionalText(max),
    })
    .nullish()
    .transform((value): Localized | null =>
      value?.az
        ? { az: value.az, ru: value.ru ?? null, en: value.en ?? null, de: value.de ?? null }
        : null,
    );
}

const optionalSlug = z
  .union([z.literal(""), slugText])
  .nullish()
  .transform((value) => value || null);

export const localizedSlug = z.object({
  az: z.string(required).trim().min(1, required).pipe(slugText),
  ru: optionalSlug,
  en: optionalSlug,
  de: optionalSlug,
});

const nodeTypes = [
  "doc",
  "paragraph",
  "heading",
  "text",
  "hardBreak",
  "bulletList",
  "orderedList",
  "listItem",
  "image",
  "blockquote",
  "horizontalRule",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
] as const;

const markTypes = ["bold", "italic", "link"] as const;

const attrs = z.record(z.string(), z.unknown()).optional();

const markSchema: z.ZodType<RichTextMark, RichTextMark> = z.object({
  type: z.enum(markTypes),
  attrs,
});

const nodeSchema: z.ZodType<RichTextNode, RichTextNode> = z.lazy(() =>
  z.object({
    type: z.enum(nodeTypes),
    attrs,
    content: z.array(nodeSchema).max(2000).optional(),
    marks: z.array(markSchema).max(10).optional(),
    text: z.string().max(20000).optional(),
  }),
);

export const richTextDoc: z.ZodType<RichTextDoc, RichTextDoc> = z.object({
  type: z.literal("doc"),
  content: z.array(nodeSchema).max(2000).optional(),
});

function hasText(doc: RichTextDoc | null | undefined): boolean {
  const walk = (nodes: RichTextNode[] | undefined): boolean =>
    (nodes ?? []).some(
      (node) => Boolean(node.text?.trim()) || node.type === "image" || walk(node.content),
    );
  return walk(doc?.content);
}

export const localizedRichText = z
  .object({
    az: richTextDoc.nullish(),
    ru: richTextDoc.nullish(),
    en: richTextDoc.nullish(),
    de: richTextDoc.nullish(),
  })
  .nullish()
  .transform((value): Localized<RichTextDoc> | null => {
    if (!value || !hasText(value.az)) return null;
    const pick = (doc: RichTextDoc | null | undefined) => (hasText(doc) ? doc : null);
    return {
      az: value.az as RichTextDoc,
      ru: pick(value.ru),
      en: pick(value.en),
      de: pick(value.de),
    };
  });

export const publishStatusSchema = z.enum(["draft", "published"], "Status seçin.");

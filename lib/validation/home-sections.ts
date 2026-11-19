import { z } from "zod";

import "./locale";

import type { MessageKey } from "@/lib/admin/i18n";
import {
  customBlockLayouts,
  customBlockMediaKinds,
  customBlockTones,
  homeSectionKeys,
  type CustomBlockLayout,
  type CustomBlockMediaKind,
  type CustomBlockTone,
  type HomeSectionKey,
  type SettingsCustomSection,
  type SettingsHeroSlide,
  type SettingsHomeSection,
} from "@/lib/db/schema/settings";
import type { Localized } from "@/lib/i18n/localized";

import { localizedOptional, localizedRichText, optionalText, uuid } from "./fields";
import type { MediaDto } from "./media";
import type { ProductOptionDto } from "./products";
import { heroSlideHref, heroSlideLimit, heroSlideSchema } from "./settings";

export {
  customBlockLayouts,
  customBlockMediaKinds,
  customBlockTones,
  homeSectionKeys,
  type CustomBlockLayout,
  type CustomBlockMediaKind,
  type CustomBlockTone,
  type HomeSectionKey,
};

export const customSectionLimit = 12;

export const mediaWidthRange = { min: 30, max: 70, step: 5, fallback: 50 } as const;

export function isCustomSection(section: SettingsHomeSection): section is SettingsCustomSection {
  return section.key === "custom";
}

export const homeFeaturedLimit = 6;

export const homeFeaturedMax = 48;

export const homeSectionLabels: Record<HomeSectionKey, MessageKey> = {
  categories: "Kateqoriyalar",
  products: "Seçilmiş məhsullar",
  projects: "Layihələr və təklif bloku",
  logos: "Partnyorlar",
};

export const titledHomeSections: readonly HomeSectionKey[] = ["categories", "products", "projects"];

export function normalizeHomeSections(
  stored: readonly SettingsHomeSection[],
): SettingsHomeSection[] {
  const known = new Set<HomeSectionKey>();
  const ids = new Set<string>();
  const sections: SettingsHomeSection[] = [];
  for (const section of stored) {
    if (isCustomSection(section)) {
      if (!section.id || ids.has(section.id) || ids.size >= customSectionLimit) continue;
      ids.add(section.id);
      sections.push({
        key: "custom",
        id: section.id,
        visible: section.visible,
        title: section.title ?? null,
        block: {
          ...section.block,
          autoplay: section.block.autoplay ?? true,
          sound: section.block.sound ?? false,
        },
      });
      continue;
    }
    if (!homeSectionKeys.includes(section.key) || known.has(section.key)) continue;
    known.add(section.key);
    sections.push({
      key: section.key,
      visible: section.visible,
      title: titledHomeSections.includes(section.key) ? section.title : null,
    });
  }
  for (const key of homeSectionKeys) {
    if (!known.has(key)) sections.push({ key, visible: true, title: null });
  }
  return sections;
}

const sectionTitle = z
  .object({ az: optionalText(120), ru: optionalText(120), en: optionalText(120) })
  .nullish()
  .transform((value): Localized | null =>
    value?.az || value?.ru || value?.en
      ? { az: value.az ?? "", ru: value.ru ?? null, en: value.en ?? null }
      : null,
  );

const optionalMediaId = z
  .union([z.literal(""), uuid("Fayl düzgün deyil.")])
  .nullish()
  .transform((value) => value || null);

const customBlockSchema = z
  .object({
    eyebrow: localizedOptional(60),
    body: localizedRichText,
    linkLabel: localizedOptional(40),
    href: heroSlideHref,
    mediaKind: z.enum(customBlockMediaKinds, "Media növünü seçin."),
    mediaId: optionalMediaId,
    posterId: optionalMediaId,
    autoplay: z.boolean().optional().default(true),
    sound: z.boolean().optional().default(false),
    layout: z.enum(customBlockLayouts, "Düzülüşü seçin."),
    mediaWidth: z
      .number("Medianın enini seçin.")
      .int()
      .min(mediaWidthRange.min, `Ən azı ${mediaWidthRange.min}% ola bilər.`)
      .max(mediaWidthRange.max, `Ən çox ${mediaWidthRange.max}% ola bilər.`)
      .multipleOf(mediaWidthRange.step, `${mediaWidthRange.step}%-lik addımlarla seçin.`),
    tone: z.enum(customBlockTones, "Fonu seçin."),
  })
  .superRefine((block, context) => {
    if (block.mediaKind !== "none" && !block.mediaId) {
      context.addIssue({
        code: "custom",
        path: ["mediaId"],
        message: block.mediaKind === "video" ? "Video seçin." : "Şəkil seçin.",
      });
    }
    if (block.layout === "background" && block.mediaKind === "none") {
      context.addIssue({
        code: "custom",
        path: ["layout"],
        message: "Fon düzülüşü üçün şəkil və ya video seçin.",
      });
    }
    if (block.linkLabel && !block.href) {
      context.addIssue({ code: "custom", path: ["href"], message: "Düymə üçün link yazın." });
    }
    if (block.href && !block.linkLabel) {
      context.addIssue({
        code: "custom",
        path: ["linkLabel", "az"],
        message: "Düymənin mətnini yazın.",
      });
    }
  })
  .transform((block) => ({
    ...block,
    mediaId: block.mediaKind === "none" ? null : block.mediaId,
    posterId: block.mediaKind === "video" ? block.posterId : null,
    autoplay: block.mediaKind === "video" && block.layout !== "background" ? block.autoplay : true,
    sound: block.mediaKind === "video" ? block.sound : false,
  }));

const builtInSectionSchema = z.object({
  key: z.enum(homeSectionKeys, "Bölmə düzgün deyil."),
  visible: z.boolean(),
  title: sectionTitle,
});

const customSectionSchema = z
  .object({
    key: z.literal("custom"),
    id: uuid("Bölmə düzgün deyil."),
    visible: z.boolean(),
    title: sectionTitle,
    block: customBlockSchema,
  })
  .superRefine((section, context) => {
    if (!section.title && !section.block.body && section.block.mediaKind === "none") {
      context.addIssue({
        code: "custom",
        path: ["title", "az"],
        message: "Başlıq, mətn və ya media əlavə edin.",
      });
    }
  });

const sectionSchema = z.discriminatedUnion("key", [customSectionSchema, builtInSectionSchema]);

export const homeSectionsInputSchema = z.object({
  heroSlides: z
    .array(heroSlideSchema)
    .max(heroSlideLimit, `Ən çox ${heroSlideLimit} slayd ola bilər.`),
  sections: z
    .array(sectionSchema)
    .refine((sections) => {
      const builtIn = sections.filter((section) => section.key !== "custom");
      return (
        builtIn.length === homeSectionKeys.length &&
        new Set(builtIn.map((section) => section.key)).size === builtIn.length
      );
    }, "Bütün bölmələr bir dəfə göndərilməlidir.")
    .refine(
      (sections) =>
        sections.filter((section) => section.key === "custom").length <= customSectionLimit,
      `Ən çox ${customSectionLimit} əlavə bölmə ola bilər.`,
    )
    .refine((sections) => {
      const ids = sections.flatMap((section) => (section.key === "custom" ? [section.id] : []));
      return new Set(ids).size === ids.length;
    }, "Bölmə təkrarlanır.")
    .transform((sections) => normalizeHomeSections(sections as SettingsHomeSection[])),
  featuredIds: z
    .array(uuid("Məhsul düzgün deyil."))
    .max(homeFeaturedMax, `Ən çox ${homeFeaturedMax} məhsul ola bilər.`)
    .refine((ids) => new Set(ids).size === ids.length, "Məhsul təkrarlanır."),
});

export type HomeSectionsInput = z.input<typeof homeSectionsInputSchema>;

export type HomeSectionsValues = z.output<typeof homeSectionsInputSchema>;

export type HomeSectionsDto = {
  heroSlides: SettingsHeroSlide[];
  sections: SettingsHomeSection[];
  featured: ProductOptionDto[];
  media: MediaDto[];
  updatedAt: string | null;
};

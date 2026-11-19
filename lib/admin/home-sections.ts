import "server-only";

import { and, asc, desc, eq, inArray, isNull, notInArray } from "drizzle-orm";

import type { DomainError } from "@/lib/api/server";
import { getDb } from "@/lib/db";
import { products, settings } from "@/lib/db/schema";
import type { SettingsHeroSlide, SettingsHomeSection } from "@/lib/db/schema/settings";
import {
  isCustomSection,
  normalizeHomeSections,
  type HomeSectionsDto,
  type HomeSectionsValues,
} from "@/lib/validation/home-sections";
import { mediaKindOf } from "@/lib/validation/media";
import { heroSlideImageError, heroSlideMobileImageError } from "@/lib/validation/settings";

import { findMediaByIds, toMediaDto } from "./media";
import { productOptions } from "./products";
import { readSettingsRow } from "./settings";

const featuredOrder = [
  asc(products.featuredPosition),
  asc(products.sortOrder),
  desc(products.publishedAt),
  asc(products.id),
];

async function featuredIds(): Promise<string[]> {
  const rows = await getDb()
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.isFeatured, true), isNull(products.deletedAt)))
    .orderBy(...featuredOrder);
  return rows.map((row) => row.id);
}

function referencedMedia(heroSlides: SettingsHeroSlide[], sections: SettingsHomeSection[]) {
  return [
    ...new Set([
      ...heroSlides.flatMap((slide) =>
        slide.mobileImageId ? [slide.imageId, slide.mobileImageId] : [slide.imageId],
      ),
      ...sections.flatMap((section) =>
        isCustomSection(section)
          ? [section.block.mediaId, section.block.posterId].filter((id) => id !== null)
          : [],
      ),
    ]),
  ];
}

export async function getAdminHomeSections(): Promise<HomeSectionsDto> {
  const [row, ids] = await Promise.all([readSettingsRow(), featuredIds()]);
  const heroSlides = row?.heroSlides ?? [];
  const sections = normalizeHomeSections(row?.homeSections ?? []);
  const [media, featured] = await Promise.all([
    findMediaByIds(referencedMedia(heroSlides, sections)),
    productOptions(ids),
  ]);
  return {
    heroSlides,
    sections,
    featured,
    media: media.map(toMediaDto),
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

async function checkReferences(values: HomeSectionsValues): Promise<Record<string, string> | null> {
  const fields: Record<string, string> = {};
  const files = await findMediaByIds(referencedMedia(values.heroSlides, values.sections));
  const byId = new Map(files.map((file) => [file.id, file]));
  values.heroSlides.forEach((slide, index) => {
    const message = heroSlideImageError(byId.get(slide.imageId));
    if (message) fields[`heroSlides.${index}.imageId`] = message;
    const mobile = slide.mobileImageId
      ? heroSlideMobileImageError(byId.get(slide.mobileImageId))
      : null;
    if (mobile) fields[`heroSlides.${index}.mobileImageId`] = mobile;
  });
  values.sections.forEach((section, index) => {
    if (!isCustomSection(section)) return;
    const { mediaKind, mediaId, posterId } = section.block;
    const file = mediaId ? byId.get(mediaId) : undefined;
    if (mediaId && mediaKindOf(file?.mimeType ?? "") !== mediaKind) {
      fields[`sections.${index}.block.mediaId`] =
        mediaKind === "video" ? "Video tapılmadı." : "Şəkil tapılmadı.";
    }
    const poster = posterId ? byId.get(posterId) : undefined;
    if (posterId && mediaKindOf(poster?.mimeType ?? "") !== "image") {
      fields[`sections.${index}.block.posterId`] = "Şəkil tapılmadı.";
    }
  });
  if (values.featuredIds.length) {
    const found = await getDb()
      .select({ id: products.id })
      .from(products)
      .where(and(inArray(products.id, values.featuredIds), isNull(products.deletedAt)));
    if (found.length !== values.featuredIds.length) {
      fields.featuredIds = "Məhsullardan biri tapılmadı və ya zibil qutusundadır.";
    }
  }
  return Object.keys(fields).length ? fields : null;
}

export async function saveHomeSections(
  values: HomeSectionsValues,
): Promise<{ homeSections: HomeSectionsDto } | { error: DomainError }> {
  const fields = await checkReferences(values);
  if (fields) return { error: { status: 400, message: "Məlumatlar düzgün deyil.", fields } };

  await getDb().transaction(async (tx) => {
    const columns = { heroSlides: values.heroSlides, homeSections: values.sections };
    await tx
      .insert(settings)
      .values({ id: 1, ...columns })
      .onConflictDoUpdate({ target: settings.id, set: { ...columns, updatedAt: new Date() } });
    await tx
      .update(products)
      .set({ isFeatured: false, featuredPosition: null })
      .where(
        values.featuredIds.length
          ? and(eq(products.isFeatured, true), notInArray(products.id, values.featuredIds))
          : eq(products.isFeatured, true),
      );
    for (const [position, id] of values.featuredIds.entries()) {
      await tx
        .update(products)
        .set({ isFeatured: true, featuredPosition: position })
        .where(eq(products.id, id));
    }
  });
  return { homeSections: await getAdminHomeSections() };
}

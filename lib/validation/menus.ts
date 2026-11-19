import { z } from "zod";

import type { MessageKey } from "@/lib/admin/i18n";
import type { Localized } from "@/lib/i18n/localized";

import { localizedText, uuid } from "./fields";

export const mainMenuKey = "main";

export const footerMenuPrefix = "footer-";

export const menuMaxItems = 200;

export function isFooterMenu(key: string): boolean {
  return key.startsWith(footerMenuPrefix);
}

export function menuMaxDepth(key: string): number {
  return isFooterMenu(key) ? 1 : 3;
}

export const menuItemTargets = ["none", "category", "page", "url"] as const;

export type MenuItemTarget = (typeof menuItemTargets)[number];

export const menuItemTargetLabels: Record<MenuItemTarget, MessageKey> = {
  none: "Başlıq (keçidsiz)",
  category: "Kateqoriya",
  page: "Səhifə",
  url: "Keçid (URL)",
};

const internalPath = /^\/(?!\/)\S*$/;
const phoneLink = /^tel:\+?[0-9][0-9 ()-]{2,30}$/;
const mailLink = /^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+(?:\?\S*)?$/;

export function isMenuUrl(value: string): boolean {
  if (internalPath.test(value) || phoneLink.test(value) || mailLink.test(value)) return true;
  if (/\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

const itemFields = z.object({
  label: localizedText(120, "Elementin adını yazın."),
  target: z.enum(menuItemTargets, "Keçid növünü seçin."),
  categoryId: uuid("Kateqoriyanı seçin.").nullish(),
  pageId: uuid("Səhifəni seçin.").nullish(),
  url: z.string().trim().max(2000, "Ən çox 2000 simvol ola bilər.").nullish(),
});

type ItemFieldsInput = z.input<typeof itemFields>;

type ItemFieldsOutput = z.output<typeof itemFields>;

const referenceFields = {
  category: ["categoryId", "Kateqoriyanı seçin."],
  page: ["pageId", "Səhifəni seçin."],
} as const;

function checkTarget(value: ItemFieldsOutput, ctx: z.RefinementCtx): void {
  if (value.target === "url") {
    if (!value.url) {
      ctx.addIssue({ code: "custom", path: ["url"], message: "Ünvanı yazın." });
    } else if (!isMenuUrl(value.url)) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "https:// ilə tam ünvan, /yol, tel: və ya mailto: yazın.",
      });
    }
    return;
  }
  if (value.target === "none") return;
  const [field, message] = referenceFields[value.target];
  if (!value[field]) ctx.addIssue({ code: "custom", path: [field], message });
}

export type MenuItemFields = {
  label: Localized;
  target: MenuItemTarget;
  categoryId: string | null;
  pageId: string | null;
  url: string | null;
};

function normalize(value: ItemFieldsOutput): MenuItemFields {
  return {
    label: {
      az: value.label.az,
      ru: value.label.ru ?? null,
      en: value.label.en ?? null,
      de: value.label.de ?? null,
    },
    target: value.target,
    categoryId: value.target === "category" ? (value.categoryId ?? null) : null,
    pageId: value.target === "page" ? (value.pageId ?? null) : null,
    url: value.target === "url" ? (value.url ?? null) : null,
  };
}

export const menuItemFieldsSchema = itemFields.superRefine(checkTarget).transform(normalize);

export type MenuItemFieldsInput = z.input<typeof menuItemFieldsSchema>;

export type MenuItemInput = ItemFieldsInput & {
  id?: string | null;
  children?: MenuItemInput[];
};

export type MenuItemValues = MenuItemFields & {
  id: string | null;
  children: MenuItemValues[];
};

export const menuItemSchema: z.ZodType<MenuItemValues, MenuItemInput> = z.lazy(() =>
  itemFields
    .extend({
      id: uuid().nullish(),
      children: z.array(menuItemSchema).max(menuMaxItems).optional(),
    })
    .superRefine(checkTarget)
    .transform((value) => ({
      ...normalize(value),
      id: value.id ?? null,
      children: value.children ?? [],
    })),
);

export const saveMenuSchema = z.object({
  title: localizedText(120, "Başlığı yazın."),
  items: z.array(menuItemSchema).max(menuMaxItems, `Ən çox ${menuMaxItems} element ola bilər.`),
});

export type SaveMenuInput = z.input<typeof saveMenuSchema>;

export type SaveMenuValues = z.output<typeof saveMenuSchema>;

export const createMenuSchema = z.object({
  title: localizedText(120, "Sütunun başlığını yazın."),
});

export type CreateMenuInput = z.input<typeof createMenuSchema>;

export const reorderMenusSchema = z.object({
  orderedIds: z.array(uuid()).min(1, "Sıra boşdur.").max(100),
});

export type ReorderMenusInput = z.infer<typeof reorderMenusSchema>;

export type MenuSummaryDto = {
  id: string;
  key: string;
  title: Localized;
  sortOrder: number;
  itemCount: number;
};

export type MenuItemDto = MenuItemFields & {
  id: string;
  children: MenuItemDto[];
};

export type MenuDetailDto = MenuSummaryDto & {
  items: MenuItemDto[];
  updatedAt: string;
};

export type MenuCategoryOption = {
  id: string;
  parentId: string | null;
  title: Localized;
  slug: Localized;
  isActive: boolean;
};

export type MenuContentOption = {
  id: string;
  title: Localized;
  slug: Localized;
  isPublished: boolean;
};

export type MenuTargetsDto = {
  categories: MenuCategoryOption[];
  pages: MenuContentOption[];
};

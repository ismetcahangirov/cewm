import { sql } from "drizzle-orm";
import { check, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import type { RichTextDoc } from "../../content/rich-text";
import type { Localized } from "../../i18n/localized";
import { localized } from "./columns";
import { media } from "./media";

export const socialNetworks = ["facebook", "instagram", "linkedin", "youtube", "tiktok"] as const;

export type SocialNetwork = (typeof socialNetworks)[number];

export type SettingsPhone = { label: Localized; number: string };

export type SettingsSocial = { network: SocialNetwork; url: string };

export type SettingsHero = {
  headline: Localized;
  subline: Localized | null;
  ctaLabel: Localized | null;
  ctaHref: string | null;
  filmId: string | null;
};

export const homeSectionKeys = ["categories", "products", "brands", "clients", "posts"] as const;

export type HomeSectionKey = (typeof homeSectionKeys)[number];

export const customBlockLayouts = ["media-left", "media-right", "media-top", "background"] as const;

export type CustomBlockLayout = (typeof customBlockLayouts)[number];

export const customBlockTones = ["white", "light", "navy"] as const;

export type CustomBlockTone = (typeof customBlockTones)[number];

export const customBlockMediaKinds = ["none", "image", "video"] as const;

export type CustomBlockMediaKind = (typeof customBlockMediaKinds)[number];

export type SettingsCustomBlock = {
  eyebrow: Localized | null;
  body: Localized<RichTextDoc> | null;
  linkLabel: Localized | null;
  href: string | null;
  mediaKind: CustomBlockMediaKind;
  mediaId: string | null;
  posterId: string | null;
  autoplay: boolean;
  sound: boolean;
  layout: CustomBlockLayout;
  mediaWidth: number;
  tone: CustomBlockTone;
};

export type SettingsBuiltInSection = {
  key: HomeSectionKey;
  visible: boolean;
  title: Localized | null;
};

export type SettingsCustomSection = {
  key: "custom";
  id: string;
  visible: boolean;
  title: Localized | null;
  block: SettingsCustomBlock;
};

export type SettingsHomeSection = SettingsBuiltInSection | SettingsCustomSection;

export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    logoLightId: uuid("logo_light_id").references(() => media.id, { onDelete: "set null" }),
    logoDarkId: uuid("logo_dark_id").references(() => media.id, { onDelete: "set null" }),
    faviconId: uuid("favicon_id").references(() => media.id, { onDelete: "set null" }),
    phones: jsonb("phones").$type<SettingsPhone[]>().notNull().default([]),
    emails: jsonb("emails").$type<string[]>().notNull().default([]),
    address: localized("address"),
    mapUrl: text("map_url"),
    workingHours: localized("working_hours"),
    socials: jsonb("socials").$type<SettingsSocial[]>().notNull().default([]),
    hero: jsonb("hero").$type<SettingsHero>(),
    homeSections: jsonb("home_sections").$type<SettingsHomeSection[]>().notNull().default([]),
    whatsappNumber: text("whatsapp_number"),
    legalName: text("legal_name"),
    consultationNotifyEmail: text("consultation_notify_email"),
    seoTitle: localized("seo_title"),
    seoDescription: localized("seo_description"),
    ogImageId: uuid("og_image_id").references(() => media.id, { onDelete: "set null" }),
    catalogueFileId: uuid("catalogue_file_id").references(() => media.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [check("settings_single_row", sql`${t.id} = 1`)],
);

import { z } from "zod";

import "./locale";

import {
  aiCrawlerPolicies,
  socialNetworks,
  type SettingsSeo,
  type SettingsPhone,
  type SettingsSocial,
  type SocialNetwork,
} from "@/lib/db/schema/settings";
import type { Localized } from "@/lib/i18n/localized";
import { normalizeAzerbaijaniPhone } from "@/lib/phone";

import { localizedOptional, localizedText, optionalText, uuid } from "./fields";
import type { MediaDto } from "./media";
import { azerbaijaniMobileOrLandlinePhone, optionalEmail } from "./consultation-requests";

export { socialNetworks, type SocialNetwork };

export const socialNetworkLabels: Record<SocialNetwork, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
};

export const settingsLimits = {
  phones: 10,
  emails: 10,
  socials: socialNetworks.length,
} as const;

export const legalNameWithoutMmc = optionalText(160).refine(
  (value) => !value || !/(^|[^\p{L}\p{N}])mmc($|[^\p{L}\p{N}])/iu.test(value),
  "Şirkətin adı «MMC» olmadan yazılır, məsələn «CEWM».",
);

const httpsUrl = (message: string) =>
  z
    .string()
    .trim()
    .max(500, "Link çox uzundur.")
    .pipe(z.url({ protocol: /^https$/, message }));

const optionalHttpsUrl = (message: string) =>
  z
    .union([z.literal(""), httpsUrl(message)])
    .nullish()
    .transform((value) => value || null);

const verificationToken = z
  .string()
  .trim()
  .max(120, "Kod çox uzundur.")
  .regex(/^[A-Za-z0-9_-]*$/, "Yalnız hərf, rəqəm, «-» və «_» yazın.")
  .nullish()
  .transform((value) => value || undefined);

const indexNowKey = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9-]{8,128}$/, "8 ilə 128 arası hərf, rəqəm və ya «-» yazın.")
  .or(z.literal(""))
  .nullish()
  .transform((value) => value || undefined);

export const seoSettingsSchema = z
  .object({
    googleVerification: verificationToken,
    yandexVerification: verificationToken,
    bingVerification: verificationToken,
    aiCrawlers: z
      .enum(aiCrawlerPolicies)
      .nullish()
      .transform((value) => value ?? "open"),
    indexNowKey,
  })
  .transform((value): SettingsSeo => {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined);
    return Object.fromEntries(entries) as SettingsSeo;
  });

export const whatsappDigitsWithCountryCode = z
  .string()
  .trim()
  .max(32, "Nömrə düzgün deyil.")
  .nullish()
  .transform((value, context) => {
    if (!value) return null;
    const normalized = normalizeAzerbaijaniPhone(value);
    if (!normalized) {
      context.addIssue({
        code: "custom",
        message: "Nömrəni ölkə kodu ilə yalnız rəqəmlərlə yazın, məsələn 994552555423.",
      });
      return z.NEVER;
    }
    return normalized.slice(1);
  });

const sitePath = /^\/(?!\/)[^\s\\]*$/;

const httpsLink = z.url({ protocol: /^https$/ });

export const siteHref = z
  .string()
  .trim()
  .max(500, "Ən çox 500 simvol ola bilər.")
  .refine(
    (value) => !value || sitePath.test(value) || httpsLink.safeParse(value).success,
    "Saytdakı ünvanı «/» ilə (məsələn /mehsullar) və ya tam linki https:// ilə yazın.",
  )
  .nullish()
  .transform((value) => value || null);

const phoneRowSchema = z.object({
  label: localizedText(60, "Nömrənin adını yazın, məsələn «Ofis»."),
  number: azerbaijaniMobileOrLandlinePhone,
});

const emailRowSchema = z.object({
  address: z.string().trim().pipe(z.email("E-poçt ünvanı düzgün deyil.").toLowerCase()),
});

const socialRowSchema = z.object({
  network: z.enum(socialNetworks, "Şəbəkəni seçin."),
  url: httpsUrl("Linki https:// ilə tam yazın."),
});

export const settingsInputSchema = z.object({
  logoLightId: uuid().nullable(),
  logoDarkId: uuid().nullable(),
  faviconId: uuid().nullable(),
  phones: z
    .array(phoneRowSchema)
    .min(1, "Ən azı bir telefon nömrəsi əlavə edin.")
    .max(settingsLimits.phones, `Ən çox ${settingsLimits.phones} nömrə ola bilər.`)
    .superRefine((rows, context) => {
      const seen = new Set<string>();
      rows.forEach((row, index) => {
        if (seen.has(row.number)) {
          context.addIssue({
            code: "custom",
            path: [index, "number"],
            message: "Bu nömrə artıq əlavə olunub.",
          });
        }
        seen.add(row.number);
      });
    }),
  emails: z
    .array(emailRowSchema)
    .max(settingsLimits.emails, `Ən çox ${settingsLimits.emails} ünvan ola bilər.`)
    .superRefine((rows, context) => {
      const seen = new Set<string>();
      rows.forEach((row, index) => {
        if (seen.has(row.address)) {
          context.addIssue({
            code: "custom",
            path: [index, "address"],
            message: "Bu ünvan artıq əlavə olunub.",
          });
        }
        seen.add(row.address);
      });
    })
    .transform((rows) => rows.map((row) => row.address)),
  address: localizedOptional(300),
  mapUrl: optionalHttpsUrl("Xəritə linkini https:// ilə tam yazın."),
  workingHours: localizedOptional(300),
  whatsappNumber: whatsappDigitsWithCountryCode,
  socials: z
    .array(socialRowSchema)
    .max(settingsLimits.socials, `Ən çox ${settingsLimits.socials} şəbəkə ola bilər.`)
    .superRefine((rows, context) => {
      const seen = new Set<SocialNetwork>();
      rows.forEach((row, index) => {
        if (seen.has(row.network)) {
          context.addIssue({
            code: "custom",
            path: [index, "network"],
            message: "Bu şəbəkə artıq əlavə olunub.",
          });
        }
        seen.add(row.network);
      });
    }),
  seoTitle: localizedOptional(120),
  seoDescription: localizedOptional(320),
  ogImageId: uuid().nullable(),
  legalName: legalNameWithoutMmc,
  consultationNotifyEmail: optionalEmail,
  catalogueFileId: uuid().nullable(),
  searchIndexing: z.boolean().optional().default(true),
  seo: seoSettingsSchema.optional(),
});

export type SettingsInput = z.input<typeof settingsInputSchema>;

export type SettingsValues = z.output<typeof settingsInputSchema>;

export type SettingsDto = {
  logoLightId: string | null;
  logoDarkId: string | null;
  faviconId: string | null;
  ogImageId: string | null;
  catalogueFileId: string | null;
  media: MediaDto[];
  phones: SettingsPhone[];
  emails: string[];
  address: Localized | null;
  mapUrl: string | null;
  workingHours: Localized | null;
  whatsappNumber: string | null;
  socials: SettingsSocial[];
  seoTitle: Localized | null;
  seoDescription: Localized | null;
  legalName: string | null;
  consultationNotifyEmail: string | null;
  searchIndexing: boolean;
  seo: SettingsSeo;
  updatedAt: string | null;
};

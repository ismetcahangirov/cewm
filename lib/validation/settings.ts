import { z } from "zod";

import "./locale";

import {
  socialNetworks,
  type SettingsPhone,
  type SettingsSocial,
  type SocialNetwork,
} from "@/lib/db/schema/settings";
import type { Localized } from "@/lib/i18n/localized";
import { normalizeAzerbaijaniPhone } from "@/lib/phone";

import { localizedOptional, localizedText, optionalText, uuid } from "./fields";
import { mediaKindOf, type MediaDto } from "./media";
import { azerbaijaniMobileOrLandlinePhone, optionalEmail } from "./quote-requests";

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

export const heroSlideLimit = 3;

export const heroSlideMinWidth = 1600;

export const heroSlideMobileMinWidth = 900;

export const legalNameWithoutMmc = optionalText(160).refine(
  (value) => !value || !/(^|[^\p{L}\p{N}])mmc($|[^\p{L}\p{N}])/iu.test(value),
  "Şirkətin adı «MMC» olmadan yazılır, məsələn «Mebline».",
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

export const heroSlideHref = z
  .string()
  .trim()
  .max(500, "Ən çox 500 simvol ola bilər.")
  .refine(
    (value) => !value || sitePath.test(value) || httpsLink.safeParse(value).success,
    "Saytdakı ünvanı «/» ilə (məsələn /mehsullar) və ya tam linki https:// ilə yazın.",
  )
  .nullish()
  .transform((value) => value || null);

export function heroSlideImageError(
  image: { mimeType: string; width: number | null; height: number | null } | undefined,
): string | null {
  if (!image) return "Şəkil tapılmadı.";
  if (mediaKindOf(image.mimeType) !== "image") return "JPG, PNG və ya WebP şəkil seçin.";
  if (!image.width || !image.height) return "Şəklin ölçüləri bilinmir. Şəkli yenidən yükləyin.";
  if (image.width <= image.height) {
    return `Slayd şəkli üfüqi olmalıdır: eni hündürlüyündən böyük. Bu şəkil ${image.width} × ${image.height} px-dir.`;
  }
  if (image.width < heroSlideMinWidth) {
    return `Slayd şəklinin eni ən azı ${heroSlideMinWidth} px olmalıdır. Bu şəklin eni ${image.width} px-dir.`;
  }
  return null;
}

export function heroSlideMobileImageError(
  image: { mimeType: string; width: number | null; height: number | null } | undefined,
): string | null {
  if (!image) return "Şəkil tapılmadı.";
  if (mediaKindOf(image.mimeType) !== "image") return "JPG, PNG və ya WebP şəkil seçin.";
  if (!image.width || !image.height) return "Şəklin ölçüləri bilinmir. Şəkli yenidən yükləyin.";
  if (image.height <= image.width) {
    return `Mobil şəkil şaquli olmalıdır: hündürlüyü enindən böyük. Bu şəkil ${image.width} × ${image.height} px-dir.`;
  }
  if (image.width < heroSlideMobileMinWidth) {
    return `Mobil şəklin eni ən azı ${heroSlideMobileMinWidth} px olmalıdır. Bu şəklin eni ${image.width} px-dir.`;
  }
  return null;
}

export const heroSlideSchema = z.object({
  imageId: uuid("Şəkil seçin."),
  mobileImageId: z
    .union([z.literal(""), uuid("Şəkil seçin.")])
    .nullish()
    .transform((value) => value || null),
  title: localizedText(80, "Slaydın başlığını yazın."),
  lead: localizedOptional(200),
  href: heroSlideHref,
});

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
  quoteNotifyEmail: optionalEmail,
  catalogueFileId: uuid().nullable(),
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
  quoteNotifyEmail: string | null;
  updatedAt: string | null;
};

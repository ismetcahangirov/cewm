import type { Metadata } from "next";

import type { SettingsSeo } from "@/lib/db/schema/settings";

export const bingVerificationName = "msvalidate.01";

export function verificationMetadata(seo: SettingsSeo): Metadata["verification"] | undefined {
  const other: Record<string, string> = {};
  if (seo.bingVerification) other[bingVerificationName] = seo.bingVerification;
  const verification: NonNullable<Metadata["verification"]> = {};
  if (seo.googleVerification) verification.google = seo.googleVerification;
  if (seo.yandexVerification) verification.yandex = seo.yandexVerification;
  if (Object.keys(other).length) verification.other = other;
  return Object.keys(verification).length ? verification : undefined;
}

export function rootMetadata(input: {
  origin: string;
  siteName: string;
  description: string;
  searchIndexing: boolean;
  seo: SettingsSeo;
}): Metadata {
  const verification = verificationMetadata(input.seo);
  return {
    ...(input.searchIndexing ? {} : { robots: { index: false, follow: false } }),
    metadataBase: new URL(input.origin),
    applicationName: input.siteName,
    title: { default: input.siteName, template: `%s | ${input.siteName}` },
    description: input.description,
    ...(verification ? { verification } : {}),
  };
}

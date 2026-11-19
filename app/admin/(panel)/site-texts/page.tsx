import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";
import { locales, type Locale } from "@/lib/i18n/config";
import { getBaseDictionary } from "@/lib/i18n/dictionaries";
import { editableTextKeys, flattenDictionary } from "@/lib/i18n/text-overrides";

import { SiteTextsEditor } from "./site-texts-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Sayt mətnləri") };
}

export const instant = false;

export default async function SiteTextsPage() {
  await requireAdminUser("owner");
  const dictionaries = await Promise.all(locales.map((locale) => getBaseDictionary(locale)));
  const defaults = Object.fromEntries(
    locales.map((locale, index) => [locale, flattenDictionary(dictionaries[index] ?? {})]),
  ) as Record<Locale, Record<string, string>>;
  const [az] = dictionaries;
  const keys = az ? editableTextKeys(az) : [];
  return <SiteTextsEditor defaults={defaults} keys={keys} />;
}

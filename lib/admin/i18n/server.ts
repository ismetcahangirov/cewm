import "server-only";

import { cookies } from "next/headers";

import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { contentLocaleCookie } from "@/lib/store/editor-slice";

import type { MessageParams } from "./translate";

import { translate, type MessageKey } from ".";

export async function getAdminLocale(): Promise<Locale> {
  const saved = (await cookies()).get(contentLocaleCookie)?.value;
  return isLocale(saved) ? saved : defaultLocale;
}

export async function getAdminT() {
  const locale = await getAdminLocale();
  return Object.assign(
    (key: MessageKey, params?: MessageParams) => translate(locale, key, params),
    {
      locale,
    },
  );
}

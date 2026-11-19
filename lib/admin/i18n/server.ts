import "server-only";

import { cookies } from "next/headers";

import { getAdminUser } from "@/lib/auth/session";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { contentLocaleCookie } from "@/lib/store/editor-slice";

import type { MessageParams } from "./translate";

import { translate, type MessageKey } from ".";

export async function getAdminLocale(): Promise<Locale> {
  const user = await getAdminUser();
  if (user?.adminLocale) return user.adminLocale;
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

import { defaultLocale, type Locale } from "@/lib/i18n/config";

let current: Locale = defaultLocale;

export function setCurrentAdminLocale(locale: Locale): void {
  current = locale;
}

export function currentAdminLocale(): Locale {
  return current;
}

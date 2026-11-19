import { defaultLocale, type Locale } from "@/lib/i18n/config";

const intlLocales: Record<Locale, string> = { az: "az", ru: "ru", en: "en-GB", de: "de-DE" };

const dateTimes = new Map<Locale, Intl.DateTimeFormat>();
const numbers = new Map<Locale, Intl.NumberFormat>();

function dateTimeFormat(locale: Locale): Intl.DateTimeFormat {
  let format = dateTimes.get(locale);
  if (!format) {
    format = new Intl.DateTimeFormat(intlLocales[locale], {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Baku",
    });
    dateTimes.set(locale, format);
  }
  return format;
}

export function formatDateTime(
  value: Date | string | null | undefined,
  locale: Locale = defaultLocale,
): string {
  if (!value) return "—";
  return dateTimeFormat(locale).format(typeof value === "string" ? new Date(value) : value);
}

export function formatDay(
  value: string | null | undefined,
  locale: Locale = defaultLocale,
): string {
  if (!value) return "—";
  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(intlLocales[locale], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatNumber(value: number, locale: Locale = defaultLocale): string {
  let format = numbers.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(intlLocales[locale]);
    numbers.set(locale, format);
  }
  return format.format(value);
}

import type { Metadata } from "next";
import { headers } from "next/headers";

import { NotFoundView } from "@/components/site/not-found-view";
import { PublicShell } from "@/components/site/public-shell";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localeFromHeader, localeHeader } from "@/lib/i18n/request-locale";

import "./site.css";

export const instant = false;

async function requestLocale() {
  return localeFromHeader((await headers()).get(localeHeader));
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await requestLocale());
  return {
    title: `${dict.notFound.title} | ${dict.meta.siteName}`,
    description: dict.notFound.body,
    robots: { index: false, follow: false },
  };
}

export default async function GlobalNotFound() {
  const locale = await requestLocale();
  const dict = await getDictionary(locale);
  return (
    <PublicShell locale={locale} dict={dict}>
      <NotFoundView locale={locale} dict={dict} />
    </PublicShell>
  );
}

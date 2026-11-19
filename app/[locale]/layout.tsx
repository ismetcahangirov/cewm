import type { Metadata } from "next";

import { PublicShell } from "@/components/site/public-shell";
import { env } from "@/lib/env";
import { locales } from "@/lib/i18n/config";
import { getRequestDictionary } from "@/lib/i18n/server";
import { getSiteSettings } from "@/lib/public/settings";
import { rootMetadata } from "@/lib/seo/root";

import "../site.css";

export const instant = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getRequestDictionary();
  const { searchIndexing, seo } = await getSiteSettings();
  return rootMetadata({
    origin: env.NEXT_PUBLIC_SITE_URL,
    siteName: dict.meta.siteName,
    description: dict.meta.description,
    searchIndexing,
    seo,
  });
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const { locale, dict } = await getRequestDictionary();
  return (
    <PublicShell locale={locale} dict={dict}>
      {children}
    </PublicShell>
  );
}

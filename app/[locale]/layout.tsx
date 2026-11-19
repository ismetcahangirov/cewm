import type { Metadata } from "next";

import { PublicShell } from "@/components/site/public-shell";
import { env } from "@/lib/env";
import { locales } from "@/lib/i18n/config";
import { getRequestDictionary } from "@/lib/i18n/server";

import "../site.css";

export const instant = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getRequestDictionary();
  return {
    metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
    title: { default: dict.meta.siteName, template: `%s | ${dict.meta.siteName}` },
    description: dict.meta.description,
  };
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const { locale, dict } = await getRequestDictionary();
  return (
    <PublicShell locale={locale} dict={dict}>
      {children}
    </PublicShell>
  );
}

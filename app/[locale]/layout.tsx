import type { Metadata } from "next";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { VisitBeacon } from "@/components/site/visit-beacon";
import { env } from "@/lib/env";
import { locales } from "@/lib/i18n/config";
import { getRequestDictionary } from "@/lib/i18n/server";
import { getSiteSettings } from "@/lib/public/settings";

import "../site.css";

export const instant = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getRequestDictionary();
  const { searchIndexing } = await getSiteSettings();
  return {
    ...(searchIndexing ? {} : { robots: { index: false, follow: false } }),
    metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
    title: { default: dict.meta.siteName, template: `%s | ${dict.meta.siteName}` },
    description: dict.meta.description,
  };
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const { locale, dict } = await getRequestDictionary();

  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>
        <a
          href="#main"
          className="sr-only bg-white px-4 py-3 text-small text-black focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-60"
        >
          {dict.common.skipToContent}
        </a>
        <SiteHeader locale={locale} dict={dict} />
        <main id="main" tabIndex={-1} className="overflow-x-clip outline-none">
          {children}
        </main>
        <SiteFooter locale={locale} dict={dict} />
        <VisitBeacon />
      </body>
    </html>
  );
}

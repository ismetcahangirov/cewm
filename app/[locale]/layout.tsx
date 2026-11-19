import type { Metadata } from "next";
import { connection } from "next/server";

import { fontVariables } from "@/app/fonts";
import { ContactButton } from "@/components/site/contact-button";
import { RevealObserver } from "@/components/site/reveal-observer";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { VisitBeacon } from "@/components/site/visit-beacon";
import { env } from "@/lib/env";
import { locales, type Locale } from "@/lib/i18n/config";
import { getRequestDictionary } from "@/lib/i18n/server";
import { getPageLinks } from "@/lib/public/home";

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

async function Contact({ locale, label }: { locale: Locale; label: string }) {
  await connection();
  const { contact } = await getPageLinks(locale);
  return contact ? <ContactButton href={contact} label={label} /> : null;
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const { locale, dict } = await getRequestDictionary();

  return (
    <html lang={locale} className={fontVariables} data-scroll-behavior="smooth">
      <body>
        <a
          href="#main"
          className="sr-only bg-white px-4 py-3 text-small text-black focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-60"
        >
          {dict.common.skipToContent}
        </a>
        <SiteHeader locale={locale} dict={dict} />
        <main id="main" tabIndex={-1} className="overflow-x-clip pt-16 outline-none xl:pt-20">
          {children}
        </main>
        <SiteFooter locale={locale} dict={dict} />
        <RevealObserver />
        <VisitBeacon />
        <Contact locale={locale} label={dict.common.contactUs} />
      </body>
    </html>
  );
}

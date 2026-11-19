import { connection } from "next/server";

import { mailtoHref, telHref, whatsappHref } from "@/lib/contact-links";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { pickLocale } from "@/lib/i18n/localized";
import { formatAzerbaijaniPhone } from "@/lib/phone";
import { getCategoryImages, getPageLinks } from "@/lib/public/home";
import { findCategoryMenu, getMenu } from "@/lib/public/menus";
import { getSiteSettings } from "@/lib/public/settings";
import { routes } from "@/lib/routes";

import { HeaderShell } from "./header-shell";

export async function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  await connection();
  const [items, settings, images, pages] = await Promise.all([
    getMenu("main", locale),
    getSiteSettings(),
    getCategoryImages(locale),
    getPageLinks(locale),
  ]);
  const name = settings.legalName || dict.meta.siteName;
  const categoryMenu = findCategoryMenu(items, images);
  const categoriesHref = localePath(locale, routes.categories());
  const [email] = settings.emails;

  return (
    <HeaderShell
      locale={locale}
      homeHref={localePath(locale)}
      items={items.map((item) =>
        item === categoryMenu ? { ...item, href: categoriesHref } : item,
      )}
      quoteHref={pages.quote ?? null}
      contacts={{
        phones: settings.phones.map((phone) => ({
          label: pickLocale(phone.label, locale),
          number: formatAzerbaijaniPhone(phone.number),
          href: telHref(phone.number),
        })),
        email: email ? { address: email, href: mailtoHref(email) } : null,
        whatsappHref: settings.whatsappNumber ? whatsappHref(settings.whatsappNumber) : null,
      }}
      labels={{
        home: `${name}, ${dict.common.home}`,
        mainNavigation: dict.common.mainNavigation,
        openMenu: dict.common.openMenu,
        closeMenu: dict.common.closeMenu,
        back: dict.common.back,
        requestQuote: dict.common.requestQuote,
        language: dict.common.language,
        whatsapp: dict.contact.whatsapp,
        locales: dict.locales,
      }}
    />
  );
}

import Image from "next/image";
import { connection } from "next/server";

import { localePath, locales, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getPageLinks } from "@/lib/public/home";
import { getMenu, type PublicMenuItem } from "@/lib/public/menus";
import { getSiteSettings } from "@/lib/public/settings";
import { routes } from "@/lib/routes";
import { mainMenuKey } from "@/lib/validation/menus";

import { HeaderBar, type HeaderLink } from "./header-bar";

function fallbackMenu(locale: Locale, dict: Dictionary): PublicMenuItem[] {
  return [
    {
      id: "catalogue",
      label: dict.catalog.title,
      href: localePath(locale, routes.catalogue()),
      children: [],
    },
    { id: "blog", label: dict.blog.title, href: localePath(locale, routes.blog()), children: [] },
  ];
}

export async function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  await connection();
  const [menu, settings, pageLinks] = await Promise.all([
    getMenu(mainMenuKey, locale),
    getSiteSettings(),
    getPageLinks(locale),
  ]);
  const items = (menu.length ? menu : fallbackMenu(locale, dict)).flatMap((item): HeaderLink[] =>
    item.href ? [{ id: item.id, label: item.label, href: item.href }] : [],
  );
  const contact = pageLinks.contact ?? pageLinks.consultation ?? null;
  const names = Object.fromEntries(locales.map((code) => [code, dict.locales[code]])) as Record<
    Locale,
    string
  >;
  const light = settings.logoLight;
  const logo =
    light?.width && light.height ? (
      <Image
        src={light.src}
        alt={dict.meta.siteName}
        width={light.width}
        height={light.height}
        sizes="200px"
        className="h-10 w-auto md:h-12"
      />
    ) : null;

  return (
    <HeaderBar
      locale={locale}
      home={localePath(locale)}
      items={items}
      logo={logo}
      siteName={dict.meta.siteName}
      contact={contact ? { href: contact, label: dict.common.contact } : null}
      names={names}
      labels={{
        navigation: dict.common.mainNavigation,
        language: dict.common.language,
        openMenu: dict.common.openMenu,
        closeMenu: dict.common.closeMenu,
        home: dict.common.home,
      }}
      phones={settings.phones.map((phone) => phone.number)}
      emails={settings.emails}
    />
  );
}

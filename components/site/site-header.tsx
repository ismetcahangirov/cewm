import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";

import { localePath, locales, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getPageLinks } from "@/lib/public/home";
import { getMenu, type PublicMenuItem } from "@/lib/public/menus";
import { getSiteSettings } from "@/lib/public/settings";
import { routes } from "@/lib/routes";
import { mainMenuKey } from "@/lib/validation/menus";

import { button } from "./button";
import { LanguageMenu } from "./language-switch";

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
  const [menu, settings, links] = await Promise.all([
    getMenu(mainMenuKey, locale),
    getSiteSettings(),
    getPageLinks(locale),
  ]);
  const items = menu.length ? menu : fallbackMenu(locale, dict);
  const logo = settings.logoLight;
  const consultation = links.consultation ?? links.contact ?? null;
  const names = Object.fromEntries(locales.map((code) => [code, dict.locales[code]])) as Record<
    Locale,
    string
  >;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="container-page flex min-h-16 flex-wrap items-center gap-x-6 gap-y-2 py-2">
        <Link
          href={localePath(locale)}
          className="inline-flex min-h-11 items-center text-h4 font-semibold text-navy"
        >
          {logo?.width && logo.height ? (
            <Image
              src={logo.src}
              alt={dict.meta.siteName}
              width={logo.width}
              height={logo.height}
              sizes="160px"
              priority
              className="h-9 w-auto"
            />
          ) : (
            dict.meta.siteName
          )}
        </Link>
        <nav
          aria-label={dict.common.mainNavigation}
          className="order-last w-full md:order-none md:w-auto md:flex-1"
        >
          <ul className="flex flex-wrap gap-x-5">
            {items.map((item) => (
              <li key={item.id}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center text-small text-navy hover:text-cyan"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="inline-flex min-h-11 items-center text-small text-muted">
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageMenu locale={locale} label={dict.common.language} names={names} />
          {consultation ? (
            <Link href={consultation} className={button({ className: "max-sm:hidden" })}>
              {dict.common.requestConsultation}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}

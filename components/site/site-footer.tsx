import { ClockIcon, LocationIcon, MailIcon, PhoneIcon } from "@/components/icons/iconsax";
import { cacheLife } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import type { CSSProperties } from "react";

import { SocialIcon } from "@/components/icons/social";
import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { mailtoHref, telHref, whatsappHref } from "@/lib/contact-links";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { pickLocale } from "@/lib/i18n/localized";
import { formatAzerbaijaniPhone } from "@/lib/phone";
import { getPageLinks } from "@/lib/public/home";
import { getFooterMenus } from "@/lib/public/menus";
import { getSiteSettings } from "@/lib/public/settings";
import { socialNetworkLabels } from "@/lib/validation/settings";

import { pill } from "./pill";

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

const linkClass =
  "inline-flex min-h-10 items-center text-small text-heading transition-colors duration-200 hover:text-black";

export async function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  await connection();
  const [columns, settings, pages] = await Promise.all([
    getFooterMenus(locale),
    getSiteSettings(),
    getPageLinks(locale),
  ]);
  const address = settings.address ? pickLocale(settings.address, locale) : null;
  const hours = settings.workingHours ? pickLocale(settings.workingHours, locale) : null;
  const name = settings.legalName || dict.meta.siteName;
  const socials = settings.socials;

  return (
    <footer className="overflow-x-clip bg-cream pt-section">
      <div
        data-reveal-group=""
        className="container-page grid gap-x-7.5 gap-y-12 pb-section lg:grid-cols-12"
      >
        <div
          suppressHydrationWarning
          data-reveal="left"
          className="flex flex-col items-start lg:col-span-6"
        >
          <Link
            href={localePath(locale)}
            className="mb-10 flex min-h-11 items-center"
            prefetch={false}
          >
            <Image
              src="/brand/logo-color.svg"
              alt={name}
              width={1357}
              height={320}
              unoptimized
              className="h-12 w-auto"
            />
          </Link>
          <p className="max-w-xl text-h2 font-normal text-balance text-heading">
            {dict.footer.statement}
          </p>
          {pages.quote && (
            <Link href={pages.quote} className={pill({ variant: "filled", className: "mt-12.5" })}>
              {dict.common.requestQuote}
            </Link>
          )}
        </div>

        <div
          suppressHydrationWarning
          data-reveal="right"
          className="grid grid-cols-2 gap-x-7.5 gap-y-10 sm:grid-cols-3 lg:col-span-6 lg:row-span-2"
        >
          {columns.map((column) => (
            <nav key={column.key} aria-label={column.title}>
              <h2 className="text-base font-medium text-heading">{column.title}</h2>
              <ul className="mt-4">
                {column.items.map((item) => (
                  <li key={item.id}>
                    {item.href ? (
                      <Link href={item.href} className={linkClass}>
                        {item.label}
                      </Link>
                    ) : (
                      <span className="inline-flex min-h-10 items-center text-small">
                        {item.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="col-span-2 sm:col-span-1">
            <h2 className="text-base font-medium text-heading">{dict.footer.contacts}</h2>
            <address className="mt-4 flex flex-col not-italic">
              {settings.phones.map((phone) => (
                <a key={phone.number} href={telHref(phone.number)} className={linkClass}>
                  <PhoneIcon aria-hidden="true" className="mr-2.5 size-4 shrink-0" />
                  <span className="sr-only">{pickLocale(phone.label, locale)}: </span>
                  {formatAzerbaijaniPhone(phone.number)}
                </a>
              ))}
              {settings.emails.map((email) => (
                <a key={email} href={mailtoHref(email)} className={linkClass}>
                  <MailIcon aria-hidden="true" className="mr-2.5 size-4 shrink-0" />
                  {email}
                </a>
              ))}
              {address &&
                (settings.mapUrl ? (
                  <a
                    href={settings.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${linkClass} items-start py-2.5 leading-normal`}
                  >
                    <LocationIcon aria-hidden="true" className="mt-0.5 mr-2.5 size-4 shrink-0" />
                    {address}
                  </a>
                ) : (
                  <p className="flex items-start py-2.5 text-small text-heading">
                    <LocationIcon aria-hidden="true" className="mt-0.5 mr-2.5 size-4 shrink-0" />
                    {address}
                  </p>
                ))}
              {hours && (
                <p className="flex items-start py-2.5 text-small text-heading">
                  <ClockIcon aria-hidden="true" className="mt-0.5 mr-2.5 size-4 shrink-0" />
                  <span className="sr-only">{dict.contact.hours}: </span>
                  {hours}
                </p>
              )}
            </address>
          </div>
        </div>

        {(socials.length > 0 || settings.whatsappNumber) && (
          <div
            suppressHydrationWarning
            data-reveal=""
            style={{ "--reveal-delay": "240ms" } as CSSProperties}
            className="flex flex-wrap items-center gap-x-4 lg:col-span-6 lg:col-start-1 lg:row-start-2 lg:self-end"
          >
            <p className="text-meta text-graphite">{dict.footer.followUs}</p>
            <ul aria-label={dict.footer.social} className="flex items-center">
              {socials.map((social) => (
                <li key={social.network}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={socialNetworkLabels[social.network]}
                    className="inline-flex size-11 items-center justify-center text-graphite transition-colors duration-200 hover:text-black"
                  >
                    <SocialIcon network={social.network} className="size-5" />
                  </a>
                </li>
              ))}
              {settings.whatsappNumber && (
                <li>
                  <a
                    href={whatsappHref(settings.whatsappNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={dict.contact.whatsapp}
                    className="inline-flex size-11 items-center justify-center text-graphite transition-colors duration-200 hover:text-black"
                  >
                    <WhatsAppIcon className="size-5" />
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      <div className="border-t border-white">
        <p className="container-page py-7.5 text-meta text-graphite">
          &copy; <CopyrightYear /> {name}
        </p>
      </div>
    </footer>
  );
}

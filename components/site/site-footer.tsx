import Link from "next/link";
import { connection } from "next/server";
import type { CSSProperties, ReactNode } from "react";

import {
  CallIcon,
  ClockIcon,
  ExportSquareIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  LocationIcon,
  MailIcon,
  TiktokIcon,
  WhatsappIcon,
  YoutubeIcon,
} from "@/components/icons/iconsax";
import { mailtoHref, telHref, whatsappHref } from "@/lib/contact-links";
import type { SocialNetwork } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { pickLocale } from "@/lib/i18n/localized";
import { formatAzerbaijaniPhone } from "@/lib/phone";
import { hideBlogWithoutPosts } from "@/lib/public/blog-link";
import { getContactPersons } from "@/lib/public/contacts";
import { getBrands } from "@/lib/public/home";
import { getFooterMenus, getMenu } from "@/lib/public/menus";
import { getSiteSettings } from "@/lib/public/settings";
import { mainMenuKey } from "@/lib/validation/menus";
import { socialNetworkLabels } from "@/lib/validation/settings";

const socialIcons: Record<SocialNetwork, (props: { size: 24 }) => ReactNode> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  linkedin: LinkedinIcon,
  youtube: YoutubeIcon,
  tiktok: TiktokIcon,
};

const wordmark = "CEWM";

function Heading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-label text-cyan uppercase">
      {children}
    </h2>
  );
}

const rowLink =
  "inline-flex min-h-11 items-center gap-3 transition-colors duration-200 ease-standard hover:text-cyan";

export async function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  await connection();
  const [settings, persons, columns, mainMenu, brands] = await Promise.all([
    getSiteSettings(),
    getContactPersons(locale),
    getFooterMenus(locale),
    getMenu(mainMenuKey, locale),
    getBrands(locale),
  ]);
  const address = settings.address ? pickLocale(settings.address, locale) : null;
  const hours = settings.workingHours ? pickLocale(settings.workingHours, locale) : null;
  const name = settings.legalName || dict.meta.siteName;
  const whatsapp =
    settings.whatsappNumber ?? persons.find((person) => person.whatsapp)?.whatsapp ?? null;
  const navigation = await Promise.all(
    (columns.length
      ? columns
      : [{ key: "main", title: dict.footer.navigation, items: mainMenu }]
    ).map(async (column) => ({
      ...column,
      items: await hideBlogWithoutPosts(column.items, locale),
    })),
  );

  return (
    <footer
      data-site-footer=""
      style={{ viewTransitionName: "site-footer" } as CSSProperties}
      className="site-footer surface-navy bg-navy-deep"
    >
      <div className="gap-x-column container-page grid gap-y-12 pt-section pb-12 md:grid-cols-8 lg:grid-cols-12">
        <section aria-labelledby="footer-contact" className="md:col-span-4 lg:col-span-4">
          <Heading id="footer-contact">{dict.footer.contacts}</Heading>
          <ul className="mt-4 flex flex-col text-small">
            {address ? (
              <li>
                {settings.mapUrl ? (
                  <a href={settings.mapUrl} target="_blank" rel="noopener" className={rowLink}>
                    <LocationIcon size={20} className="shrink-0 text-cyan" />
                    {address}
                  </a>
                ) : (
                  <span className="inline-flex min-h-11 items-center gap-3">
                    <LocationIcon size={20} className="shrink-0 text-cyan" />
                    {address}
                  </span>
                )}
              </li>
            ) : null}
            {settings.phones.map((phone) => (
              <li key={phone.number}>
                <a href={telHref(phone.number)} className={rowLink}>
                  <CallIcon size={20} className="shrink-0 text-cyan" />
                  <span>
                    <span className="text-on-navy-muted">{pickLocale(phone.label, locale)}: </span>
                    <span className="tabular">{formatAzerbaijaniPhone(phone.number)}</span>
                  </span>
                </a>
              </li>
            ))}
            {settings.emails.map((email) => (
              <li key={email}>
                <a href={mailtoHref(email)} className={rowLink}>
                  <MailIcon size={20} className="shrink-0 text-cyan" />
                  {email}
                </a>
              </li>
            ))}
            {whatsapp ? (
              <li>
                <a href={whatsappHref(whatsapp)} target="_blank" rel="noopener" className={rowLink}>
                  <WhatsappIcon size={20} className="shrink-0 text-cyan" />
                  {dict.contact.whatsapp}
                </a>
              </li>
            ) : null}
            {hours ? (
              <li className="inline-flex min-h-11 items-center gap-3">
                <ClockIcon size={20} className="shrink-0 text-cyan" />
                {hours}
              </li>
            ) : null}
          </ul>
        </section>
        {persons.length ? (
          <section aria-labelledby="footer-persons" className="md:col-span-4 lg:col-span-3">
            <Heading id="footer-persons">{dict.contact.persons}</Heading>
            <ul className="mt-4 flex flex-col gap-5 text-small">
              {persons.map((person) => (
                <li key={person.id}>
                  <p className="font-medium">{person.name}</p>
                  <p className="text-on-navy-muted">{person.role}</p>
                  <span className="flex flex-col">
                    {person.phones.map((phone) => (
                      <a key={phone} href={telHref(phone)} className={`${rowLink} tabular`}>
                        {formatAzerbaijaniPhone(phone)}
                      </a>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {navigation.map((column) =>
          column.items.length ? (
            <nav
              key={column.key}
              aria-labelledby={`footer-nav-${column.key}`}
              className="md:col-span-4 lg:col-span-3"
            >
              <Heading id={`footer-nav-${column.key}`}>{column.title}</Heading>
              <ul className="mt-4 flex flex-col text-small">
                {column.items.flatMap((item) =>
                  item.href ? (
                    <li key={item.id}>
                      <Link href={item.href} className={rowLink}>
                        {item.label}
                      </Link>
                    </li>
                  ) : (
                    []
                  ),
                )}
              </ul>
            </nav>
          ) : null,
        )}
        {brands.length || settings.socials.length ? (
          <section aria-labelledby="footer-brands" className="md:col-span-4 lg:col-span-2">
            <Heading id="footer-brands">{dict.footer.brands}</Heading>
            <ul className="mt-4 flex flex-col text-small">
              {brands.map((brand) => (
                <li key={brand.id}>
                  {brand.url ? (
                    <a href={brand.url} target="_blank" rel="noopener" className={rowLink}>
                      {brand.name}
                      <ExportSquareIcon size={16} className="text-on-navy-muted" />
                    </a>
                  ) : (
                    <span className="inline-flex min-h-11 items-center">{brand.name}</span>
                  )}
                </li>
              ))}
            </ul>
            {settings.socials.length ? (
              <ul className="mt-6 flex flex-wrap gap-2">
                {settings.socials.map((social) => {
                  const Icon = socialIcons[social.network];
                  return (
                    <li key={social.network}>
                      <a
                        href={social.url}
                        target="_blank"
                        rel="noopener"
                        aria-label={socialNetworkLabels[social.network]}
                        className="inline-flex size-11 items-center justify-center rounded-full border border-white/40 transition-colors duration-200 hover:border-white hover:text-cyan"
                      >
                        <Icon size={24} />
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        ) : null}
      </div>
      <div className="@container container-page" aria-hidden="true">
        <p data-wordmark="" className="footer-wordmark">
          {[...wordmark].map((letter, index) => (
            <span key={index} className="inline-block overflow-clip">
              <span className="wm-l" style={{ "--i": index } as CSSProperties}>
                {letter}
              </span>
            </span>
          ))}
        </p>
      </div>
      <div className="border-t border-white/15">
        <p className="text-on-navy-muted container-page py-5 text-small">
          {"©"} {new Date().getFullYear()} {name}. {dict.footer.rights}
        </p>
      </div>
    </footer>
  );
}

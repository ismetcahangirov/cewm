import { connection } from "next/server";

import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { pickLocale } from "@/lib/i18n/localized";
import { formatAzerbaijaniPhone } from "@/lib/phone";
import { getContactPersons } from "@/lib/public/contacts";
import { getSiteSettings } from "@/lib/public/settings";
import { socialNetworkLabels } from "@/lib/validation/settings";

export async function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  await connection();
  const [settings, persons] = await Promise.all([getSiteSettings(), getContactPersons(locale)]);
  const address = settings.address ? pickLocale(settings.address, locale) : null;
  const hours = settings.workingHours ? pickLocale(settings.workingHours, locale) : null;
  const name = settings.legalName || dict.meta.siteName;

  return (
    <footer className="bg-navy text-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-3">
        <section aria-labelledby="footer-contacts">
          <h2 id="footer-contacts" className="text-card font-semibold text-white">
            {dict.footer.contacts}
          </h2>
          <ul className="mt-4 flex flex-col gap-2 text-small">
            {address ? <li>{address}</li> : null}
            {hours ? <li>{hours}</li> : null}
            {settings.phones.map((phone) => (
              <li key={phone.number}>
                <a href={`tel:${phone.number}`} className="hover:text-cyan">
                  {pickLocale(phone.label, locale)}: {formatAzerbaijaniPhone(phone.number)}
                </a>
              </li>
            ))}
            {settings.emails.map((email) => (
              <li key={email}>
                <a href={`mailto:${email}`} className="hover:text-cyan">
                  {email}
                </a>
              </li>
            ))}
          </ul>
        </section>
        {persons.length ? (
          <section aria-labelledby="footer-persons">
            <h2 id="footer-persons" className="text-card font-semibold text-white">
              {dict.contact.persons}
            </h2>
            <ul className="mt-4 flex flex-col gap-4 text-small">
              {persons.map((person) => (
                <li key={person.id}>
                  <p className="font-medium">{person.name}</p>
                  <p className="text-sand">{person.role}</p>
                  {person.phones.map((phone) => (
                    <a key={phone} href={`tel:${phone}`} className="block hover:text-cyan">
                      {formatAzerbaijaniPhone(phone)}
                    </a>
                  ))}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {settings.socials.length ? (
          <section aria-labelledby="footer-social">
            <h2 id="footer-social" className="text-card font-semibold text-white">
              {dict.footer.followUs}
            </h2>
            <ul className="mt-4 flex flex-col gap-2 text-small">
              {settings.socials.map((social) => (
                <li key={social.network}>
                  <a href={social.url} rel="noreferrer" target="_blank" className="hover:text-cyan">
                    {socialNetworkLabels[social.network]}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <div className="border-t border-white/15">
        <p className="container-page py-4 text-meta text-sand">
          © {new Date().getFullYear()} {name}. {dict.footer.rights}
        </p>
      </div>
    </footer>
  );
}

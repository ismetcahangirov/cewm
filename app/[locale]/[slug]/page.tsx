import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ConsultationSection } from "@/components/site/consultation/consultation-section";
import { PageHeading } from "@/components/site/page-heading";
import { RichText } from "@/components/site/rich-text";
import { richTextToPlain, summarize } from "@/lib/content/rich-text";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { pickLocale } from "@/lib/i18n/localized";
import { getRequestDictionary } from "@/lib/i18n/server";
import { formatAzerbaijaniPhone } from "@/lib/phone";
import { getContactPersons } from "@/lib/public/contacts";
import { getBrands, getClientLogos } from "@/lib/public/home";
import { getPageBySlug, type PublicPage } from "@/lib/public/pages";
import { getSiteSettings } from "@/lib/public/settings";
import { localizedPaths, redirectToCanonicalSlug } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo/metadata";

function fallbackDescription(page: PublicPage, dict: Dictionary): string {
  if (page.kind === "contact") return dict.contact.intro;
  if (page.kind === "consultation") return dict.consultation.intro;
  return summarize(richTextToPlain(page.content)) || dict.meta.description;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/[slug]">): Promise<Metadata> {
  await connection();
  const [{ slug }, { locale, dict }] = await Promise.all([params, getRequestDictionary()]);
  const page = await getPageBySlug(locale, slug);
  if (!page) notFound();
  redirectToCanonicalSlug(page.slug, locale, slug, routes.page);
  return pageMetadata({
    locale,
    title: page.seoTitle ?? page.title,
    absoluteTitle: Boolean(page.seoTitle),
    description: page.seoDescription ?? fallbackDescription(page, dict),
    paths: localizedPaths(page.slug, routes.page),
    image: page.cover,
  });
}

async function ContactDetails({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [settings, persons] = await Promise.all([getSiteSettings(), getContactPersons(locale)]);
  const address = settings.address ? pickLocale(settings.address, locale) : null;
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <dl className="flex flex-col gap-4">
        {address ? (
          <div>
            <dt className="text-meta text-muted">{dict.contact.address}</dt>
            <dd>
              {address}
              {settings.mapUrl ? (
                <a
                  href={settings.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 text-navy underline decoration-cyan underline-offset-4"
                >
                  {dict.contact.openMap}
                </a>
              ) : null}
            </dd>
          </div>
        ) : null}
        {settings.phones.length ? (
          <div>
            <dt className="text-meta text-muted">{dict.contact.phone}</dt>
            {settings.phones.map((phone) => (
              <dd key={phone.number}>
                <a href={`tel:${phone.number}`}>{formatAzerbaijaniPhone(phone.number)}</a>
              </dd>
            ))}
          </div>
        ) : null}
        {settings.emails.length ? (
          <div>
            <dt className="text-meta text-muted">{dict.contact.email}</dt>
            {settings.emails.map((email) => (
              <dd key={email}>
                <a href={`mailto:${email}`}>{email}</a>
              </dd>
            ))}
          </div>
        ) : null}
      </dl>
      {persons.length ? (
        <section aria-labelledby="contact-persons">
          <h2 id="contact-persons" className="text-h3">
            {dict.contact.persons}
          </h2>
          <ul className="mt-4 flex flex-col gap-6">
            {persons.map((person) => (
              <li key={person.id}>
                <p className="font-semibold text-navy">{person.name}</p>
                <p className="text-meta text-muted">{person.role}</p>
                {person.phones.map((phone) => (
                  <a key={phone} href={`tel:${phone}`} className="block min-h-11 py-2">
                    {formatAzerbaijaniPhone(phone)}
                  </a>
                ))}
                {person.whatsapp ? (
                  <a
                    href={`https://wa.me/${person.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block min-h-11 py-2 text-navy underline decoration-cyan underline-offset-4"
                  >
                    {dict.contact.whatsapp}
                  </a>
                ) : null}
                {person.email ? (
                  <a href={`mailto:${person.email}`} className="block min-h-11 py-2">
                    {person.email}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

async function LogoList({
  locale,
  dict,
  kind,
}: {
  locale: Locale;
  dict: Dictionary;
  kind: "brands" | "clients";
}) {
  const items = kind === "brands" ? await getBrands(locale) : await getClientLogos(locale);
  if (!items.length) return <p>{dict[kind].empty}</p>;
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex min-h-24 items-center justify-center border border-line p-4"
        >
          {item.image ? (
            <Image
              src={item.image.src}
              alt={item.image.alt}
              width={item.image.width}
              height={item.image.height}
              sizes="240px"
              className="max-h-16 w-auto"
            />
          ) : (
            <span className="font-semibold text-navy">{item.name}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default async function CmsPage({ params }: PageProps<"/[locale]/[slug]">) {
  await connection();
  const [{ slug }, { locale, dict }] = await Promise.all([params, getRequestDictionary()]);
  const page = await getPageBySlug(locale, slug);
  if (!page) notFound();
  redirectToCanonicalSlug(page.slug, locale, slug, routes.page);
  const path = localePath(locale, routes.page(slug));

  return (
    <>
      <PageHeading
        title={page.title}
        breadcrumbLabel={dict.common.breadcrumb}
        breadcrumbs={[
          { label: dict.common.home, href: localePath(locale) },
          { label: page.title, href: path },
        ]}
      />
      <div className="container-page flex flex-col gap-10 py-section">
        {page.content ? <RichText doc={page.content} className="max-w-3xl" /> : null}
        {page.kind === "contact" ? <ContactDetails locale={locale} dict={dict} /> : null}
        {page.kind === "brands" ? <LogoList locale={locale} dict={dict} kind="brands" /> : null}
        {page.kind === "clients" ? <LogoList locale={locale} dict={dict} kind="clients" /> : null}
      </div>
      {page.kind === "contact" || page.kind === "consultation" ? (
        <ConsultationSection locale={locale} dict={dict} />
      ) : null}
    </>
  );
}

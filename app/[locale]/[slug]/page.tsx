import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";

import {
  ArrowRightIcon,
  CallIcon,
  ClockIcon,
  ExportSquareIcon,
  LocationIcon,
  MailIcon,
  WhatsappIcon,
} from "@/components/icons/iconsax";
import { ClipExpand } from "@/components/motion/scenes";
import {
  ConsultationPanel,
  ConsultationSection,
} from "@/components/site/consultation/consultation-section";
import { ArticleBody } from "@/components/site/article-body";
import { JsonLdScript } from "@/components/site/json-ld";
import { PageHeading } from "@/components/site/page-heading";
import { RichText } from "@/components/site/rich-text";
import { mailtoHref, telHref, whatsappHref } from "@/lib/contact-links";
import { richTextToPlain, summarize } from "@/lib/content/rich-text";
import { cx } from "@/lib/cx";
import { env } from "@/lib/env";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { fill } from "@/lib/i18n/format";
import { pickLocale } from "@/lib/i18n/localized";
import { getRequestDictionary } from "@/lib/i18n/server";
import { formatAzerbaijaniPhone } from "@/lib/phone";
import { getCatalogueOverview } from "@/lib/public/catalogue-overview";
import { getConsultationProducts, parseProductIds } from "@/lib/public/consultation";
import { getContactPersons, type PublicContactPerson } from "@/lib/public/contacts";
import { getLogoTones } from "@/lib/public/logo-tone";
import { getBrands, getClientLogos } from "@/lib/public/home";
import { getPageBySlug, type PublicPage } from "@/lib/public/pages";
import { getSiteSettings, type SiteSettings } from "@/lib/public/settings";
import { localizedPaths, redirectToCanonicalSlug } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { entityInfo, getCorpus } from "@/lib/seo/corpus";
import { companyStatement } from "@/lib/seo/facts";
import { aboutPageJsonLd, businessJsonLd, contactPageJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { markdownHref } from "@/lib/seo/rewrites";
import { describeEntity } from "@/lib/seo/text";

function fallbackDescription(page: PublicPage, dict: Dictionary): string {
  if (page.kind === "contact") return dict.contact.intro;
  if (page.kind === "consultation") return dict.consultation.intro;
  return summarize(richTextToPlain(page.content)) || dict.meta.description;
}

export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/[slug]">): Promise<Metadata> {
  await connection();
  const [{ slug }, { locale, dict }] = await Promise.all([params, getRequestDictionary()]);
  const page = await getPageBySlug(locale, slug);
  if (!page) notFound();
  redirectToCanonicalSlug(page.slug, locale, slug, routes.page);
  const info = await entityInfo("page", page.id);
  return pageMetadata({
    locale,
    title: page.seoTitle ?? page.title,
    absoluteTitle: Boolean(page.seoTitle),
    description: describeEntity({
      locale,
      name: page.title,
      admin: page.seoDescription,
      summary: fallbackDescription(page, dict),
      fallback: dict.meta.description,
    }),
    paths: localizedPaths(page.slug, routes.page),
    availableLocales: info.locales,
    og: { kind: "page", slug },
    markdownPath: markdownHref(localePath(locale, routes.page(slug))),
  });
}

const actionRow =
  "group/row inline-flex min-h-11 items-center gap-3 py-1 transition-colors duration-200 ease-standard hover:text-cyan-ink";

function mapHref(settings: SiteSettings): string | null {
  if (settings.mapUrl) return settings.mapUrl;
  if (!settings.address) return null;
  const query = settings.address.en || settings.address.az;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function PersonActions({ person, dict }: { person: PublicContactPerson; dict: Dictionary }) {
  return (
    <ul className="mt-4 flex flex-col">
      {person.phones.map((phone) => (
        <li key={phone}>
          <a
            href={telHref(phone)}
            aria-label={fill(dict.contact.call, { name: person.name })}
            className={cx(actionRow, "tabular")}
          >
            <CallIcon size={20} className="shrink-0" />
            {formatAzerbaijaniPhone(phone)}
          </a>
        </li>
      ))}
      {person.whatsapp ? (
        <li>
          <a
            href={whatsappHref(person.whatsapp)}
            target="_blank"
            rel="noopener"
            className={actionRow}
          >
            <WhatsappIcon size={20} className="shrink-0" />
            {dict.contact.whatsapp}
          </a>
        </li>
      ) : null}
      {person.email ? (
        <li>
          <a
            href={mailtoHref(person.email)}
            aria-label={fill(dict.contact.write, { name: person.name })}
            className={cx(actionRow, "break-all")}
          >
            <MailIcon size={20} className="shrink-0" />
            {person.email}
          </a>
        </li>
      ) : null}
    </ul>
  );
}

async function ContactPage({ page, locale, dict }: PageProps2) {
  const [settings, persons] = await Promise.all([getSiteSettings(), getContactPersons(locale)]);
  const address = settings.address ? pickLocale(settings.address, locale) : null;
  const hours = settings.workingHours ? pickLocale(settings.workingHours, locale) : null;
  const map = mapHref(settings);
  return (
    <>
      <PageHeading
        title={page.title}
        lead={<p>{dict.contact.intro}</p>}
        breadcrumbLabel={dict.common.breadcrumb}
        breadcrumbs={crumbs(page, locale, dict)}
      />
      <div className="container-page pb-section">
        <div className="gap-x-column grid gap-y-14 border-t border-line pt-12 lg:grid-cols-12 lg:pt-16">
          <section aria-labelledby="contact-office" className="lg:col-span-4">
            <h2 id="contact-office" className="text-label text-cyan-ink uppercase">
              {dict.contact.office}
            </h2>
            <ul className="mt-6 flex flex-col gap-2">
              {address ? (
                <li className="flex flex-col items-start">
                  <span className="inline-flex min-h-11 items-start gap-3 py-2">
                    <LocationIcon size={20} className="mt-0.5 shrink-0" />
                    <span>{address}</span>
                  </span>
                  {map ? (
                    <a
                      href={map}
                      target="_blank"
                      rel="noopener"
                      className="text-cyan-ink hover:text-ink ml-8 inline-flex min-h-11 items-center gap-2 text-small underline decoration-1 underline-offset-4"
                    >
                      {dict.contact.openMap}
                      <ExportSquareIcon size={16} />
                    </a>
                  ) : null}
                </li>
              ) : null}
              {settings.phones.map((phone) => (
                <li key={phone.number}>
                  <a href={telHref(phone.number)} className={actionRow}>
                    <CallIcon size={20} className="shrink-0" />
                    <span>
                      <span className="text-ink-muted">{pickLocale(phone.label, locale)}: </span>
                      <span className="tabular">{formatAzerbaijaniPhone(phone.number)}</span>
                    </span>
                  </a>
                </li>
              ))}
              {settings.whatsappNumber ? (
                <li>
                  <a
                    href={whatsappHref(settings.whatsappNumber)}
                    target="_blank"
                    rel="noopener"
                    className={actionRow}
                  >
                    <WhatsappIcon size={20} className="shrink-0" />
                    {dict.contact.whatsapp}
                  </a>
                </li>
              ) : null}
              {settings.emails.map((email) => (
                <li key={email}>
                  <a href={mailtoHref(email)} className={cx(actionRow, "break-all")}>
                    <MailIcon size={20} className="shrink-0" />
                    {email}
                  </a>
                </li>
              ))}
              {hours ? (
                <li className="inline-flex min-h-11 items-center gap-3">
                  <ClockIcon size={20} className="shrink-0" />
                  {hours}
                </li>
              ) : null}
            </ul>
          </section>
          {persons.length ? (
            <section aria-labelledby="contact-persons" className="lg:col-span-7 lg:col-start-6">
              <h2 id="contact-persons" className="text-label text-cyan-ink uppercase">
                {dict.contact.persons}
              </h2>
              <ul data-reveal-group="" className="gap-x-column mt-6 grid gap-y-12 md:grid-cols-2">
                {persons.map((person) => (
                  <li key={person.id} data-reveal="" className="border-t border-line pt-6">
                    <div className="flex items-start gap-4">
                      {person.photo ? (
                        <Image
                          src={person.photo.src}
                          alt={person.photo.alt}
                          width={64}
                          height={64}
                          sizes="64px"
                          className="size-16 shrink-0 rounded-xs object-cover"
                        />
                      ) : null}
                      <div>
                        <p className="text-h3">{person.name}</p>
                        <p className="text-grey mt-2 text-small">{person.role}</p>
                      </div>
                    </div>
                    <PersonActions person={person} dict={dict} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        {page.content ? (
          <div className="gap-x-column mt-16 grid lg:grid-cols-12">
            <RichText
              doc={page.content}
              className="rich-text-article lg:col-span-7 lg:col-start-6"
            />
          </div>
        ) : null}
      </div>
      <ConsultationSection id="consultation" locale={locale} dict={dict} />
    </>
  );
}

async function ConsultationPage({
  page,
  locale,
  dict,
  productIds,
}: PageProps2 & { productIds: string[] }) {
  const [products, persons] = await Promise.all([
    getConsultationProducts(productIds, locale),
    getContactPersons(locale),
  ]);
  return (
    <>
      <PageHeading
        eyebrow={dict.home.consultationEyebrow}
        title={page.title}
        lead={<p>{dict.consultation.intro}</p>}
        breadcrumbLabel={dict.common.breadcrumb}
        breadcrumbs={crumbs(page, locale, dict)}
      />
      <section aria-label={dict.consultation.formLabel} className="surface-mist">
        <div className="gap-x-column container-page grid gap-y-12 py-section lg:grid-cols-12">
          <div className="flex flex-col gap-10 lg:col-span-4">
            {page.content ? <RichText doc={page.content} className="rich-text-article" /> : null}
            {persons.length ? (
              <div>
                <h2 className="text-label text-cyan-ink uppercase">{dict.consultation.direct}</h2>
                <ul className="mt-4 flex flex-col gap-8">
                  {persons.map((person) => (
                    <li key={person.id} className="border-t border-line pt-4">
                      <p className="text-h4">{person.name}</p>
                      <p className="text-grey mt-1 text-small">{person.role}</p>
                      <PersonActions person={person} dict={dict} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <div className="lg:col-span-8 lg:col-start-5">
            <ConsultationPanel locale={locale} dict={dict} products={products} />
          </div>
        </div>
      </section>
    </>
  );
}

async function BrandList({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [brands, overview] = await Promise.all([
    getBrands(locale),
    getCatalogueOverview(locale, null),
  ]);
  if (!brands.length) return <p className="text-ink-muted">{dict.brands.empty}</p>;
  const tones = await getLogoTones(
    brands.flatMap((brand) => (brand.image ? [brand.image.src] : [])),
  );
  const catalogue = localePath(locale, routes.catalogue());
  return (
    <ul className="border-t border-line">
      {brands.map((brand) => {
        const facet = overview.brands.find((item) => item.name === brand.name);
        return (
          <li
            key={brand.id}
            data-reveal=""
            className="gap-x-column grid gap-y-6 border-b border-line py-12 lg:grid-cols-12 lg:py-16"
          >
            <div className="max-lg:empty:hidden lg:col-span-3">
              {brand.image ? (
                <span
                  className={cx(
                    "flex h-24 w-full max-w-60 items-center justify-center rounded-xs px-6",
                    tones[brand.image.src] === "light" ? "bg-navy" : "bg-mist",
                  )}
                >
                  <Image
                    src={brand.image.src}
                    alt={brand.image.alt}
                    width={brand.image.width}
                    height={brand.image.height}
                    sizes="200px"
                    className="h-auto max-h-12 w-auto max-w-full object-contain"
                  />
                </span>
              ) : null}
            </div>
            <div className={brand.photo ? "lg:col-span-5" : "lg:col-span-8"}>
              <h2 className="text-h3">{brand.name}</h2>
              {brand.description ? (
                <p className="text-ink-muted mt-4">{brand.description}</p>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
                {facet ? (
                  <Link
                    href={
                      overview.brands.length > 1 ? `${catalogue}?brand=${facet.slug}` : catalogue
                    }
                    className="group/link text-cyan-ink hover:text-ink inline-flex min-h-11 items-center gap-2 text-small underline decoration-1 underline-offset-4"
                  >
                    {fill(dict.brands.products, { count: facet.count })}
                    <ArrowRightIcon
                      size={16}
                      className="transition-transform duration-200 group-hover/link:translate-x-1"
                    />
                  </Link>
                ) : null}
                {brand.url ? (
                  <a
                    href={brand.url}
                    target="_blank"
                    rel="noopener"
                    className="text-cyan-ink hover:text-ink inline-flex min-h-11 items-center gap-2 text-small underline decoration-1 underline-offset-4"
                  >
                    {dict.brands.visit}
                    <ExportSquareIcon size={16} />
                  </a>
                ) : null}
              </div>
            </div>
            {brand.photo ? (
              <div className="bg-mist relative aspect-4/3 overflow-clip lg:col-span-4">
                <Image
                  src={brand.photo.src}
                  alt={brand.photo.alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

async function ClientLogos({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const logos = await getClientLogos(locale);
  if (!logos.length) return <p className="text-ink-muted">{dict.clients.empty}</p>;
  return (
    <ul
      data-reveal-group=""
      className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6"
    >
      {logos.map((logo) => {
        const image = (
          <Image
            src={logo.image.src}
            alt={logo.image.alt}
            width={logo.image.width}
            height={logo.image.height}
            sizes="(min-width: 1024px) 240px, 45vw"
            className="h-auto w-full max-w-56 object-contain"
          />
        );
        return (
          <li key={logo.id} data-reveal="" className="flex bg-white">
            {logo.url ? (
              <a
                href={logo.url}
                target="_blank"
                rel="noopener"
                className="flex min-h-36 w-full items-center justify-center p-6"
              >
                {image}
              </a>
            ) : (
              <span className="flex min-h-36 w-full items-center justify-center p-6">{image}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

type PageProps2 = { page: PublicPage; locale: Locale; dict: Dictionary };

function crumbs(page: PublicPage, locale: Locale, dict: Dictionary) {
  return [
    { label: dict.common.home, href: localePath(locale) },
    { label: page.title, href: localePath(locale, routes.page(pickLocale(page.slug, locale))) },
  ];
}

function ArticlePage({ page, locale, dict, extra }: PageProps2 & { extra?: ReactNode }) {
  const eyebrow =
    page.kind === "brands"
      ? dict.home.brandsEyebrow
      : page.kind === "clients"
        ? dict.home.clientsEyebrow
        : page.kind === "about"
          ? dict.home.statementEyebrow
          : null;
  return (
    <>
      <PageHeading
        eyebrow={eyebrow}
        title={page.title}
        breadcrumbLabel={dict.common.breadcrumb}
        breadcrumbs={crumbs(page, locale, dict)}
      />
      {page.cover && page.cover.width < 1600 ? (
        <div className="container-page">
          <Image
            src={page.cover.src}
            alt={page.cover.alt}
            width={page.cover.width}
            height={page.cover.height}
            sizes={`min(100vw, ${page.cover.width}px)`}
            loading="eager"
            className="h-auto w-full"
            style={{ maxWidth: page.cover.width }}
          />
        </div>
      ) : page.cover ? (
        <ClipExpand
          media={
            <Image
              src={page.cover.src}
              alt={page.cover.alt}
              fill
              sizes="(min-width: 768px) 150vw, 140vw"
              loading="eager"
              className="object-cover"
            />
          }
        />
      ) : null}
      {page.content ? (
        <div className="container-page py-section">
          <ArticleBody doc={page.content} contentsLabel={dict.pages.contents} />
        </div>
      ) : null}
      {extra ? (
        <div className={cx("container-page pb-section", !page.content && "pt-4")}>{extra}</div>
      ) : null}
    </>
  );
}

export default async function CmsPage({ params, searchParams }: PageProps<"/[locale]/[slug]">) {
  await connection();
  const [{ slug }, query, { locale, dict }] = await Promise.all([
    params,
    searchParams,
    getRequestDictionary(),
  ]);
  const page = await getPageBySlug(locale, slug);
  if (!page) notFound();
  redirectToCanonicalSlug(page.slug, locale, slug, routes.page);
  const path = localePath(locale, routes.page(slug));
  const corpus = page.kind === "contact" || page.kind === "about" ? await getCorpus() : null;
  const structured = corpus ? (
    <JsonLdScript
      data={[
        ...businessJsonLd(corpus.settings, locale, env.NEXT_PUBLIC_SITE_URL, {
          description: companyStatement(corpus, locale, dict),
          brands: corpus.brands,
        }),
        (page.kind === "contact" ? contactPageJsonLd : aboutPageJsonLd)({
          name: page.title,
          description: fallbackDescription(page, dict),
          url: path,
          locale,
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
        }),
      ]}
    />
  ) : null;

  return (
    <>
      <CmsBody
        page={page}
        locale={locale}
        dict={dict}
        productIds={parseProductIds(query.products)}
      />
      {structured}
    </>
  );
}

function CmsBody({ page, locale, dict, productIds }: PageProps2 & { productIds: string[] }) {
  switch (page.kind) {
    case "contact":
      return <ContactPage page={page} locale={locale} dict={dict} />;
    case "consultation":
      return <ConsultationPage page={page} locale={locale} dict={dict} productIds={productIds} />;
    case "brands":
      return (
        <ArticlePage
          page={page}
          locale={locale}
          dict={dict}
          extra={<BrandList locale={locale} dict={dict} />}
        />
      );
    case "clients":
      return (
        <ArticlePage
          page={page}
          locale={locale}
          dict={dict}
          extra={<ClientLogos locale={locale} dict={dict} />}
        />
      );
    default:
      return <ArticlePage page={page} locale={locale} dict={dict} />;
  }
}

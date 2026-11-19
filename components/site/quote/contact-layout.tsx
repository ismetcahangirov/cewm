import { ClockIcon, LocationIcon, MailIcon, PhoneIcon } from "@/components/icons/iconsax";

import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLdScript } from "@/components/site/json-ld";
import { mailtoHref, telHref, whatsappHref } from "@/lib/contact-links";
import { cx } from "@/lib/cx";
import { env } from "@/lib/env";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { pickLocale } from "@/lib/i18n/localized";
import { formatAzerbaijaniPhone } from "@/lib/phone";
import type { PublicPage } from "@/lib/public/pages";
import type { QuoteProduct } from "@/lib/public/quote";
import { getSiteSettings } from "@/lib/public/settings";
import { routes } from "@/lib/routes";
import { absoluteUrl, businessJsonLd, type JsonLd } from "@/lib/seo/json-ld";

import { QuoteForm } from "./quote-form";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5">
      <span aria-hidden="true" className="mt-2.5 size-2.5 shrink-0 rounded-full bg-graphite" />
      <div className="min-w-0">
        <h2 className="text-base font-medium text-heading">{title}</h2>
        <div className="mt-1.5 flex flex-col items-start">{children}</div>
      </div>
    </div>
  );
}

const valueLink =
  "inline-flex min-h-11 items-center gap-2.5 text-base text-fg transition-colors duration-200 hover:text-graphite";

export async function ContactLayout({
  page,
  locale,
  dict,
  intro,
  products,
  formFirst,
}: {
  page: PublicPage;
  locale: Locale;
  dict: Dictionary;
  intro: string;
  products: QuoteProduct[];
  formFirst?: boolean;
}) {
  const settings = await getSiteSettings();
  const t = dict.contact;
  const address = settings.address ? pickLocale(settings.address, locale) : null;
  const hours = settings.workingHours ? pickLocale(settings.workingHours, locale) : null;
  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  const pageUrl = absoluteUrl(
    localePath(locale, routes.page(pickLocale(page.slug, locale))),
    siteUrl,
  );

  const business = businessJsonLd(settings, locale, siteUrl);
  const contactPage: JsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: page.title,
    url: pageUrl,
    inLanguage: locale,
    about: { "@id": business[business.length - 1]["@id"] },
  };

  return (
    <div className="container-page pt-15 pb-section">
      <JsonLdScript data={[contactPage, ...business]} />
      <Breadcrumbs
        label={dict.common.breadcrumb}
        items={[{ label: dict.common.home, href: localePath(locale) }, { label: page.title }]}
      />
      <div className="mt-2.5 grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-x-7.5">
        <h1 className="text-h1 lg:col-span-7">{page.title}</h1>
        <p className="max-w-xl lg:col-span-5 lg:col-start-8">{intro}</p>
      </div>

      <div className="mt-12.5 grid gap-12.5 lg:mt-15 lg:grid-cols-12 lg:gap-x-7.5">
        <div
          className={cx(
            "flex flex-col gap-10 lg:col-span-5",
            formFirst && "order-last lg:order-first",
          )}
        >
          {address && (
            <Block title={t.officeTitle}>
              <p className="flex items-start gap-2.5 py-2.5">
                <LocationIcon aria-hidden="true" className="mt-1 size-4 shrink-0 text-graphite" />
                {address}
              </p>
              {settings.mapUrl && (
                <a
                  href={settings.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center text-small text-graphite underline decoration-1 underline-offset-4"
                >
                  {t.openMap}
                </a>
              )}
            </Block>
          )}
          {settings.phones.length > 0 && (
            <Block title={t.phonesTitle}>
              {settings.phones.map((phone) => (
                <a key={phone.number} href={telHref(phone.number)} className={valueLink}>
                  <PhoneIcon aria-hidden="true" className="size-4 shrink-0 text-graphite" />
                  {formatAzerbaijaniPhone(phone.number)}
                  <span className="text-small text-graphite">
                    {pickLocale(phone.label, locale)}
                  </span>
                </a>
              ))}
              {settings.whatsappNumber && (
                <a
                  href={whatsappHref(settings.whatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.whatsapp}
                  className="-ml-3 inline-flex size-11 items-center justify-center text-graphite transition-colors duration-200 hover:text-black"
                >
                  <WhatsAppIcon className="size-5" />
                </a>
              )}
            </Block>
          )}
          {settings.emails.length > 0 && (
            <Block title={t.emailTitle}>
              {settings.emails.map((email) => (
                <a key={email} href={mailtoHref(email)} className={valueLink}>
                  <MailIcon aria-hidden="true" className="size-4 shrink-0 text-graphite" />
                  {email}
                </a>
              ))}
            </Block>
          )}
          {hours && (
            <Block title={t.hoursTitle}>
              <p className="flex items-start gap-2.5 py-2.5">
                <ClockIcon aria-hidden="true" className="mt-1 size-4 shrink-0 text-graphite" />
                {hours}
              </p>
            </Block>
          )}
        </div>

        <section
          id="forma"
          aria-labelledby="quote-form-title"
          className="scroll-mt-24 bg-sand p-7.5 lg:col-span-7 lg:p-15"
        >
          <h2 id="quote-form-title" className="text-h2">
            {t.formTitle}
          </h2>
          <p className="mt-2.5 text-graphite">{t.formIntro}</p>
          <div className="mt-10">
            <QuoteForm
              locale={locale}
              initialProducts={products}
              productsHref={localePath(locale, routes.catalogue())}
              labels={{
                name: t.name,
                phone: t.phone,
                phoneHint: t.phoneHint,
                email: t.email,
                company: t.company,
                message: t.message,
                messagePlaceholder: t.messagePlaceholder,
                products: t.products,
                removeProduct: t.removeProduct,
                submit: t.submit,
                sending: t.sending,
                required: t.required,
                errorName: t.errorName,
                errorPhone: t.errorPhone,
                errorEmail: t.errorEmail,
                errorTooLong: t.errorTooLong,
                errorGeneric: t.errorGeneric,
                errorRateLimit: t.errorRateLimit,
                successTitle: t.successTitle,
                successBody: t.successBody,
                successLink: t.successLink,
                honeypot: t.honeypot,
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

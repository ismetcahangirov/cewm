import type { ReactNode } from "react";

import { LineReveal, Reveal } from "@/components/motion/text";
import { cx } from "@/lib/cx";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ConsultationProduct } from "@/lib/public/consultation";
import { routes } from "@/lib/routes";

import { ConsultationForm, type ConsultationFormLabels } from "./consultation-form";

export function consultationLabels(dict: Dictionary): ConsultationFormLabels {
  const text = dict.consultation;
  return {
    name: text.name,
    phone: text.phone,
    phoneHint: text.phoneHint,
    email: text.email,
    company: text.company,
    message: text.message,
    messagePlaceholder: text.messagePlaceholder,
    products: text.products,
    removeProduct: text.removeProduct,
    submit: text.submit,
    sending: text.sending,
    required: text.required,
    requiredNote: text.requiredNote,
    errorName: text.errorName,
    errorPhone: text.errorPhone,
    errorEmail: text.errorEmail,
    errorTooLong: text.errorTooLong,
    errorGeneric: text.errorGeneric,
    errorRateLimit: text.errorRateLimit,
    successTitle: text.successTitle,
    successBody: text.successBody,
    successLink: text.successLink,
    honeypot: text.honeypot,
  };
}

export function ConsultationPanel({
  locale,
  dict,
  products = [],
}: {
  locale: Locale;
  dict: Dictionary;
  products?: ConsultationProduct[];
}) {
  return (
    <div className="bg-white p-6 sm:p-10">
      <ConsultationForm
        locale={locale}
        initialProducts={products}
        productsHref={localePath(locale, routes.catalogue())}
        labels={consultationLabels(dict)}
      />
    </div>
  );
}

export function ConsultationSection({
  locale,
  dict,
  products = [],
  id,
  title,
  intro,
  aside,
  className,
}: {
  locale: Locale;
  dict: Dictionary;
  products?: ConsultationProduct[];
  id?: string;
  title?: string;
  intro?: string;
  aside?: ReactNode;
  className?: string;
}) {
  const text = dict.consultation;
  return (
    <section
      id={id}
      aria-labelledby="consultation-title"
      className={cx("surface-mist scroll-mt-header", className)}
    >
      <div className="gap-x-column container-page grid gap-y-10 py-section lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5">
          <p className="text-label text-cyan-ink uppercase">{dict.home.consultationEyebrow}</p>
          <LineReveal
            id="consultation-title"
            text={title ?? text.title}
            className="text-safe mt-4 text-h2"
          />
          <p className="text-ink-muted mt-6 text-lead">{intro ?? text.intro}</p>
          {aside}
        </div>
        <Reveal className="min-w-0 lg:col-span-7">
          <ConsultationPanel locale={locale} dict={dict} products={products} />
        </Reveal>
      </div>
    </section>
  );
}

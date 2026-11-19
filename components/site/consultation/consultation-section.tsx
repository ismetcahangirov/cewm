import { localePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ConsultationProduct } from "@/lib/public/consultation";
import { routes } from "@/lib/routes";

import { LineReveal, Reveal } from "@/components/motion/text";

import { ConsultationForm } from "./consultation-form";

export function ConsultationSection({
  locale,
  dict,
  products = [],
}: {
  locale: Locale;
  dict: Dictionary;
  products?: ConsultationProduct[];
}) {
  const text = dict.consultation;
  return (
    <section aria-labelledby="consultation-title" className="surface-mist">
      <div className="gap-x-column container-page grid gap-y-10 py-section lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="text-label text-cyan-ink uppercase">{dict.home.consultationEyebrow}</p>
          <LineReveal id="consultation-title" text={text.title} className="mt-4 text-h2" />
          <p className="text-ink-muted mt-6 text-lead">{text.intro}</p>
        </div>
        <Reveal className="bg-white p-6 sm:p-10 lg:col-span-7">
          <ConsultationForm
            locale={locale}
            initialProducts={products}
            productsHref={localePath(locale, routes.catalogue())}
            labels={{
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
            }}
          />
        </Reveal>
      </div>
    </section>
  );
}

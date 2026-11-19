import { localePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ConsultationProduct } from "@/lib/public/consultation";
import { routes } from "@/lib/routes";

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
    <section aria-labelledby="consultation-title" className="bg-light">
      <div className="container-page grid gap-8 py-section lg:grid-cols-[1fr_2fr]">
        <div>
          <h2 id="consultation-title" className="text-h2">
            {text.title}
          </h2>
          <p className="mt-4">{text.intro}</p>
        </div>
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
      </div>
    </section>
  );
}

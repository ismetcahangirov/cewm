import { ContactLayout } from "@/components/site/quote/contact-layout";

import type { TemplateProps } from "./content-template";

export async function ContactTemplate({ page, locale, dict }: TemplateProps) {
  return (
    <ContactLayout
      page={page}
      locale={locale}
      dict={dict}
      intro={dict.contact.contactIntro}
      products={[]}
    />
  );
}

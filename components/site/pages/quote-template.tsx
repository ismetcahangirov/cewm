import { ContactLayout } from "@/components/site/quote/contact-layout";
import { getQuoteProducts, parseProductIds } from "@/lib/public/quote";

import type { TemplateProps } from "./content-template";

export async function QuoteTemplate({ page, locale, dict, searchParams }: TemplateProps) {
  const products = await getQuoteProducts(parseProductIds(searchParams.mehsul), locale);
  return (
    <ContactLayout
      page={page}
      locale={locale}
      dict={dict}
      intro={dict.contact.quoteIntro}
      products={products}
      formFirst
    />
  );
}

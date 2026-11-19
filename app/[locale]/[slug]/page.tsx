import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AboutTemplate } from "@/components/site/pages/about-template";
import { ContactTemplate } from "@/components/site/pages/contact-template";
import { ContentTemplate } from "@/components/site/pages/content-template";
import { LogosTemplate } from "@/components/site/pages/logos-template";
import { QuoteTemplate } from "@/components/site/pages/quote-template";
import { richTextToPlain, summarize } from "@/lib/content/rich-text";
import { getRequestDictionary } from "@/lib/i18n/server";
import { getPageBySlug } from "@/lib/public/pages";
import { localizedPaths, redirectToCanonicalSlug } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/[slug]">): Promise<Metadata> {
  await connection();
  const [{ slug }, { locale, dict }] = await Promise.all([params, getRequestDictionary()]);
  const page = await getPageBySlug(locale, slug);
  if (!page) notFound();
  redirectToCanonicalSlug(page.slug, locale, slug, routes.page);
  const fallback =
    page.kind === "contact"
      ? dict.contact.contactIntro
      : page.kind === "quote"
        ? dict.contact.quoteIntro
        : summarize(richTextToPlain(page.content)) || dict.meta.description;
  return pageMetadata({
    locale,
    title: page.seoTitle ?? page.title,
    absoluteTitle: Boolean(page.seoTitle),
    description: page.seoDescription ?? fallback,
    paths: localizedPaths(page.slug, routes.page),
    image: page.cover,
    eyebrow: dict.meta.siteName,
  });
}

async function PageContent({
  params,
  searchParams,
}: Pick<PageProps<"/[locale]/[slug]">, "params" | "searchParams">) {
  await connection();
  const [{ slug }, query, { locale, dict }] = await Promise.all([
    params,
    searchParams,
    getRequestDictionary(),
  ]);
  const page = await getPageBySlug(locale, slug);
  if (!page) notFound();
  redirectToCanonicalSlug(page.slug, locale, slug, routes.page);
  const props = { page, locale, dict, searchParams: query };
  switch (page.kind) {
    case "about":
      return <AboutTemplate {...props} />;
    case "references":
    case "partners":
      return <LogosTemplate {...props} />;
    case "contact":
      return <ContactTemplate {...props} />;
    case "quote":
      return <QuoteTemplate {...props} />;
    default:
      return <ContentTemplate {...props} />;
  }
}

export default function Page(props: PageProps<"/[locale]/[slug]">) {
  return <PageContent params={props.params} searchParams={props.searchParams} />;
}

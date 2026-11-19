import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { button } from "@/components/site/button";
import { JsonLdScript } from "@/components/site/json-ld";
import { PageHeading } from "@/components/site/page-heading";
import { ProductGrid } from "@/components/site/product-card";
import { RichText } from "@/components/site/rich-text";
import { pickRichText, richTextToPlain, summarize } from "@/lib/content/rich-text";
import { env } from "@/lib/env";
import { localePath } from "@/lib/i18n/config";
import { fill } from "@/lib/i18n/format";
import { getRequestDictionary } from "@/lib/i18n/server";
import { getCategoryListing, parsePageParam } from "@/lib/public/listing";
import { localizedPaths, redirectToCanonicalSlug } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { collectionPageJsonLd } from "@/lib/seo/json-ld";
import { entityInfo } from "@/lib/seo/corpus";
import { pageMetadata, paginatedPaths, paginatedText } from "@/lib/seo/metadata";
import { markdownHref } from "@/lib/seo/rewrites";
import { describeEntity } from "@/lib/seo/text";

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/mehsullar/[slug]">): Promise<Metadata> {
  await connection();
  const [{ slug }, query, { locale, dict }] = await Promise.all([
    params,
    searchParams,
    getRequestDictionary(),
  ]);
  const page = parsePageParam(query.page);
  const listing = await getCategoryListing(locale, slug, page);
  if (!listing) notFound();
  redirectToCanonicalSlug(
    listing.category.slug,
    locale,
    slug,
    routes.category,
    page > 1 ? `?page=${page}` : "",
  );
  const { category } = listing;
  const suffix = fill(dict.catalog.pageSuffix, { page });
  const info = await entityInfo("category", category.id);
  const description = describeEntity({
    locale,
    name: category.name,
    admin: category.seoDescription,
    summary: summarize(richTextToPlain(pickRichText(category.description, locale))),
    fallback: fill(dict.catalog.categoryDescription, { name: category.name }),
  });
  return pageMetadata({
    locale,
    title: paginatedText(category.seoTitle ?? category.name, page, suffix),
    absoluteTitle: Boolean(category.seoTitle),
    description: paginatedText(description, page, suffix),
    paths: paginatedPaths(localizedPaths(category.slug, routes.category), page),
    availableLocales: info.locales,
    og: { kind: "category", slug },
    markdownPath: markdownHref(localePath(locale, routes.category(slug))),
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/[locale]/mehsullar/[slug]">) {
  await connection();
  const [{ slug }, query, { locale, dict }] = await Promise.all([
    params,
    searchParams,
    getRequestDictionary(),
  ]);
  const page = parsePageParam(query.page);
  const listing = await getCategoryListing(locale, slug, page);
  if (!listing) notFound();
  redirectToCanonicalSlug(
    listing.category.slug,
    locale,
    slug,
    routes.category,
    page > 1 ? `?page=${page}` : "",
  );
  const { category, parent, children } = listing;
  const path = localePath(locale, routes.category(slug));
  const description = pickRichText(category.description, locale);

  return (
    <>
      <PageHeading
        title={category.name}
        breadcrumbLabel={dict.common.breadcrumb}
        breadcrumbs={[
          { label: dict.common.home, href: localePath(locale) },
          { label: dict.catalog.title, href: localePath(locale, routes.catalogue()) },
          ...(parent ? [{ label: parent.name, href: parent.href }] : []),
          { label: category.name, href: path },
        ]}
      >
        {children.length ? (
          <nav aria-label={dict.catalog.categories} className="mt-6">
            <ul className="flex flex-wrap gap-2">
              {children.map((child) => (
                <li key={child.id}>
                  <Link href={child.href} className={button({ variant: "outline" })}>
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </PageHeading>
      <div className="container-page py-section">
        {description ? <RichText doc={description} className="mb-10 max-w-3xl" /> : null}
        {listing.items.length ? (
          <>
            <p className="text-ink-muted mb-6 text-small">
              {fill(dict.catalog.count, { shown: listing.shown, total: listing.total })}
            </p>
            <ProductGrid products={listing.items} />
            {listing.page < listing.pageCount ? (
              <Link
                href={`${path}?page=${listing.page + 1}`}
                className={button({ className: "mt-8" })}
              >
                {dict.catalog.loadMore}
              </Link>
            ) : null}
          </>
        ) : (
          <p>{dict.catalog.empty}</p>
        )}
      </div>
      <JsonLdScript
        data={collectionPageJsonLd({
          name: category.name,
          url: path,
          locale,
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
          items: listing.items.map((item) => ({
            name: item.name,
            url: item.href,
            image: item.image?.src ?? null,
          })),
        })}
      />
    </>
  );
}

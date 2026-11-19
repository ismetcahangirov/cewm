import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { button } from "@/components/site/button";
import { JsonLdScript } from "@/components/site/json-ld";
import { PageHeading } from "@/components/site/page-heading";
import { ProductGrid } from "@/components/site/product-card";
import { env } from "@/lib/env";
import { localePath } from "@/lib/i18n/config";
import { fill } from "@/lib/i18n/format";
import { getRequestDictionary } from "@/lib/i18n/server";
import { getCatalogueListing, parsePageParam } from "@/lib/public/listing";
import { staticPaths } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { collectionPageJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata, paginatedPaths, paginatedText } from "@/lib/seo/metadata";
import { markdownHref } from "@/lib/seo/rewrites";

export async function generateMetadata({
  searchParams,
}: PageProps<"/[locale]/mehsullar">): Promise<Metadata> {
  await connection();
  const [query, { locale, dict }] = await Promise.all([searchParams, getRequestDictionary()]);
  const page = parsePageParam(query.page);
  const suffix = fill(dict.catalog.pageSuffix, { page });
  return pageMetadata({
    locale,
    title: paginatedText(dict.catalog.title, page, suffix),
    description: paginatedText(dict.catalog.description, page, suffix),
    paths: paginatedPaths(staticPaths(routes.catalogue()), page),
    og: { kind: "catalogue" },
    markdownPath: markdownHref(localePath(locale, routes.catalogue())),
  });
}

export default async function CataloguePage({ searchParams }: PageProps<"/[locale]/mehsullar">) {
  await connection();
  const [query, { locale, dict }] = await Promise.all([searchParams, getRequestDictionary()]);
  const page = parsePageParam(query.page);
  const listing = await getCatalogueListing(locale, page);
  if (!listing) notFound();
  const path = localePath(locale, routes.catalogue());

  return (
    <>
      <PageHeading
        title={dict.catalog.title}
        breadcrumbLabel={dict.common.breadcrumb}
        breadcrumbs={[
          { label: dict.common.home, href: localePath(locale) },
          { label: dict.catalog.title, href: path },
        ]}
      >
        {listing.categories.length ? (
          <nav aria-label={dict.catalog.categories} className="mt-6">
            <ul className="flex flex-wrap gap-2">
              {listing.categories.map((category) => (
                <li key={category.id}>
                  <Link href={category.href} className={button({ variant: "outline" })}>
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </PageHeading>
      <div className="container-page py-section">
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
          name: dict.catalog.title,
          description: dict.catalog.description,
          url: path,
          locale,
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
          items: listing.items.map((item) => ({ name: item.name, url: item.href })),
        })}
      />
    </>
  );
}

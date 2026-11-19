import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CategoryChips } from "@/components/site/catalog/category-chips";
import { fill, ListingGrid } from "@/components/site/catalog/listing-grid";
import { CtaBand } from "@/components/site/cta-band";
import { JsonLdScript } from "@/components/site/json-ld";
import { env } from "@/lib/env";
import { localePath } from "@/lib/i18n/config";
import { getRequestDictionary } from "@/lib/i18n/server";
import { getPageLinks } from "@/lib/public/home";
import { getCatalogueListing, listingPageSize, parsePageParam } from "@/lib/public/listing";
import { staticPaths } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { collectionPageJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata, paginatedPaths, paginatedText } from "@/lib/seo/metadata";

export async function generateMetadata({
  searchParams,
}: PageProps<"/[locale]/mehsullar">): Promise<Metadata> {
  await connection();
  const [query, { locale, dict }] = await Promise.all([searchParams, getRequestDictionary()]);
  const page = parsePageParam(query.page);
  const listing = await getCatalogueListing(locale, page);
  if (!listing) notFound();
  const suffix = fill(dict.catalog.pageSuffix, { page });
  return pageMetadata({
    locale,
    title: paginatedText(dict.catalog.title, page, suffix),
    description: paginatedText(dict.catalog.description, page, suffix),
    paths: paginatedPaths(staticPaths(routes.catalogue()), page),
    eyebrow: dict.seo.eyebrow.catalog,
  });
}

async function CatalogueContent({
  searchParams,
}: Pick<PageProps<"/[locale]/mehsullar">, "searchParams">) {
  await connection();
  const [query, { locale, dict }] = await Promise.all([searchParams, getRequestDictionary()]);
  const page = parsePageParam(query.page);
  const [listing, links] = await Promise.all([
    getCatalogueListing(locale, page),
    getPageLinks(locale),
  ]);
  if (!listing) notFound();
  const basePath = localePath(locale, routes.catalogue());
  const pageItems = listing.items.slice((page - 1) * listingPageSize);

  return (
    <>
      <JsonLdScript
        data={collectionPageJsonLd({
          name: dict.catalog.title,
          description: dict.catalog.description,
          url: page > 1 ? `${basePath}?page=${page}` : basePath,
          locale,
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
          items: pageItems.map((item) => ({
            name: [item.model, item.type].filter(Boolean).join(" – "),
            url: item.href,
          })),
        })}
      />
      <div className="container-page pt-15">
        <Breadcrumbs
          label={dict.common.breadcrumb}
          items={[
            { label: dict.common.home, href: localePath(locale) },
            { label: dict.catalog.title },
          ]}
        />
        <h1 className="mt-2.5 text-h1">{dict.catalog.title}</h1>
        <div className="mt-10">
          <CategoryChips
            label={dict.catalog.categoriesLabel}
            first={{ name: dict.common.allProducts, href: basePath, active: true, back: false }}
            chips={listing.categories}
          />
        </div>
        <ListingGrid
          items={listing.items}
          total={listing.total}
          shown={listing.shown}
          page={listing.page}
          pageCount={listing.pageCount}
          basePath={basePath}
          dict={dict}
        />
      </div>
      <CtaBand dict={dict} quoteHref={links.quote ?? null} />
    </>
  );
}

export default function CataloguePage(props: PageProps<"/[locale]/mehsullar">) {
  return <CatalogueContent searchParams={props.searchParams} />;
}

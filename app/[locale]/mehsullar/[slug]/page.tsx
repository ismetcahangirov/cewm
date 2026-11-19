import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CategoryChips } from "@/components/site/catalog/category-chips";
import { fill, ListingGrid } from "@/components/site/catalog/listing-grid";
import { CtaBand } from "@/components/site/cta-band";
import { JsonLdScript } from "@/components/site/json-ld";
import { RichText } from "@/components/site/rich-text";
import { pickRichText, richTextToPlain, summarize } from "@/lib/content/rich-text";
import { env } from "@/lib/env";
import { localePath, type Locale } from "@/lib/i18n/config";
import { getRequestDictionary } from "@/lib/i18n/server";
import { getPageLinks } from "@/lib/public/home";
import {
  getCategoryListing,
  listingPageSize,
  parsePageParam,
  type CategoryListing,
} from "@/lib/public/listing";
import { localizedPaths, redirectToCanonicalSlug } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { collectionPageJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata, paginatedPaths, paginatedText } from "@/lib/seo/metadata";

function plainDescription(listing: CategoryListing, locale: Locale): string {
  return summarize(richTextToPlain(pickRichText(listing.category.description, locale)));
}

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
  const { category, parent } = listing;
  const suffix = fill(dict.catalog.pageSuffix, { page });
  const description =
    category.seoDescription ??
    (plainDescription(listing, locale) ||
      fill(dict.catalog.categoryDescription, { name: category.name }));
  return pageMetadata({
    locale,
    title: paginatedText(category.seoTitle ?? category.name, page, suffix),
    absoluteTitle: Boolean(category.seoTitle),
    description: paginatedText(description, page, suffix),
    paths: paginatedPaths(localizedPaths(category.slug, routes.category), page),
    eyebrow: parent?.name ?? dict.catalog.title,
  });
}

async function CategoryContent({
  params,
  searchParams,
}: Pick<PageProps<"/[locale]/mehsullar/[slug]">, "params" | "searchParams">) {
  await connection();
  const [{ slug }, query, { locale, dict }] = await Promise.all([
    params,
    searchParams,
    getRequestDictionary(),
  ]);
  const page = parsePageParam(query.page);
  const [listing, links] = await Promise.all([
    getCategoryListing(locale, slug, page),
    getPageLinks(locale),
  ]);
  if (!listing) notFound();
  const { category, parent, children, siblings } = listing;
  const chips = children.length > 0 ? children : siblings.length > 1 ? siblings : [];
  redirectToCanonicalSlug(category.slug, locale, slug, routes.category);

  const basePath = localePath(locale, routes.category(slug));
  const catalogueHref = localePath(locale, routes.catalogue());
  const description = pickRichText(category.description, locale);
  const pageItems = listing.items.slice((page - 1) * listingPageSize);
  const crumbs = [
    { label: dict.common.home, href: localePath(locale) },
    { label: dict.catalog.title, href: catalogueHref },
    ...(parent ? [{ label: parent.name, href: parent.href }] : []),
    { label: category.name },
  ];

  return (
    <>
      <JsonLdScript
        data={collectionPageJsonLd({
          name: category.seoTitle ?? category.name,
          description: category.seoDescription ?? plainDescription(listing, locale),
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
        <Breadcrumbs label={dict.common.breadcrumb} items={crumbs} />
        <h1 className="mt-2.5 text-h1">{category.name}</h1>
        {chips.length > 0 && (
          <div className="mt-10">
            <CategoryChips
              label={dict.catalog.categoriesLabel}
              first={{
                name: parent?.name ?? dict.common.allProducts,
                href: parent?.href ?? catalogueHref,
                active: false,
                back: true,
              }}
              chips={chips}
              activeId={category.id}
            />
          </div>
        )}
        <ListingGrid
          items={listing.items}
          total={listing.total}
          shown={listing.shown}
          page={listing.page}
          pageCount={listing.pageCount}
          basePath={basePath}
          dict={dict}
        />
        {description && (
          <div className="mt-section grid lg:grid-cols-12 lg:gap-x-7.5">
            <RichText
              doc={description}
              imageAlt={category.name}
              className="max-w-3xl lg:col-span-7 lg:col-start-6"
            />
          </div>
        )}
      </div>
      <CtaBand dict={dict} quoteHref={links.quote ?? null} />
    </>
  );
}

export default function CategoryPage(props: PageProps<"/[locale]/mehsullar/[slug]">) {
  return <CategoryContent params={props.params} searchParams={props.searchParams} />;
}

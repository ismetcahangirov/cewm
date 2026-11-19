import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ArrowDownIcon } from "@/components/icons/iconsax";
import { button } from "@/components/site/button";
import { ChipNav } from "@/components/site/chip-nav";
import { EmptyState } from "@/components/site/empty-state";
import { FactBlockView } from "@/components/seo/fact-block";
import { JsonLdScript } from "@/components/site/json-ld";
import { PageHeading } from "@/components/site/page-heading";
import { ProductGrid } from "@/components/site/product-card";
import { RichText } from "@/components/site/rich-text";
import { pickRichText, richTextToPlain, summarize } from "@/lib/content/rich-text";
import { env } from "@/lib/env";
import { localePath } from "@/lib/i18n/config";
import { fill } from "@/lib/i18n/format";
import { getRequestDictionary } from "@/lib/i18n/server";
import { getPageLinks } from "@/lib/public/home";
import { getCategoryListing, parseBrandParam, parsePageParam } from "@/lib/public/listing";
import { localizedPaths, redirectToCanonicalSlug } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { entityInfo, getCorpus } from "@/lib/seo/corpus";
import { categoryFactBlock } from "@/lib/seo/facts";
import { collectionPageJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata, paginatedPaths, paginatedText } from "@/lib/seo/metadata";
import { markdownHref } from "@/lib/seo/rewrites";
import { describeEntity } from "@/lib/seo/text";

function listingQuery(page: number, brand: string | null): string {
  const params = new URLSearchParams();
  if (brand) params.set("brand", brand);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const instant = false;

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
  const brand = parseBrandParam(query.brand);
  const listing = await getCategoryListing(locale, slug, page, brand);
  if (!listing) notFound();
  redirectToCanonicalSlug(
    listing.category.slug,
    locale,
    slug,
    routes.category,
    listingQuery(page, listing.brand),
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
    noIndex: Boolean(listing.brand),
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
  const brand = parseBrandParam(query.brand);
  const [listing, pageLinks, corpus] = await Promise.all([
    getCategoryListing(locale, slug, page, brand),
    getPageLinks(locale),
    getCorpus(),
  ]);
  if (!listing) notFound();
  redirectToCanonicalSlug(
    listing.category.slug,
    locale,
    slug,
    routes.category,
    listingQuery(page, listing.brand),
  );
  const { category, parent, children, siblings } = listing;
  const path = localePath(locale, routes.category(slug));
  const catalogue = localePath(locale, routes.catalogue());
  const description = pickRichText(category.description, locale);
  const corpusCategory = corpus.categories.find((item) => item.id === category.id) ?? null;
  const facts =
    corpusCategory && page === 1 && !listing.brand
      ? categoryFactBlock(corpus, corpusCategory, locale, dict)
      : null;

  return (
    <>
      <PageHeading
        eyebrow={parent?.name ?? dict.catalog.eyebrow}
        title={category.name}
        breadcrumbLabel={dict.common.breadcrumb}
        breadcrumbs={[
          { label: dict.common.home, href: localePath(locale) },
          { label: dict.catalog.title, href: catalogue },
          ...(parent ? [{ label: parent.name, href: parent.href }] : []),
          { label: category.name, href: path },
        ]}
      >
        <p className="text-grey tabular mt-6 text-small">
          {fill(dict.catalog.areaCount, { count: listing.total })}
        </p>
        {description && !facts ? (
          <RichText doc={description} className="rich-text-intro mt-8 max-w-3xl" />
        ) : null}
      </PageHeading>

      {facts ? (
        <div className="container-page pb-12 lg:pb-16">
          <FactBlockView block={facts} className="border-t border-line pt-10" />
        </div>
      ) : null}

      <div className="container-page flex flex-col gap-8 pb-12">
        {siblings.length > 1 ? (
          <ChipNav
            label={dict.catalog.areasTitle}
            heading={dict.catalog.areasTitle}
            chips={siblings.map((sibling) => ({
              key: sibling.id,
              label: sibling.name,
              href: sibling.href,
              current: sibling.id === category.id,
            }))}
          />
        ) : null}
        {children.length ? (
          <ChipNav
            label={dict.catalog.categories}
            heading={dict.catalog.categories}
            chips={children.map((child) => ({
              key: child.id,
              label: child.name,
              href: child.href,
            }))}
          />
        ) : null}
        {listing.brands.length > 1 ? (
          <ChipNav
            label={dict.catalog.brandFilter}
            heading={dict.catalog.brandFilter}
            chips={[
              { key: "all", label: dict.catalog.allBrands, href: path, current: !listing.brand },
              ...listing.brands.map((item) => ({
                key: item.slug,
                label: item.name,
                href: `${path}${listingQuery(1, item.slug)}`,
                current: listing.brand === item.slug,
                count: item.count,
              })),
            ]}
          />
        ) : null}
      </div>

      <div className="container-page pb-section">
        {listing.items.length ? (
          <>
            <ProductGrid
              products={listing.items}
              headingLevel="h2"
              moreLabel={dict.common.more}
              className="border-t border-line pt-12"
            />
            <div className="mt-16 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {listing.page < listing.pageCount ? (
                <Link
                  href={`${path}${listingQuery(listing.page + 1, listing.brand)}`}
                  scroll={false}
                  className={button({ variant: "outline" })}
                >
                  {dict.catalog.loadMore}
                  <ArrowDownIcon size={20} />
                </Link>
              ) : null}
              <p className="text-grey tabular text-small">
                {fill(dict.catalog.count, { shown: listing.shown, total: listing.total })}
              </p>
            </div>
          </>
        ) : (
          <EmptyState
            title={dict.catalog.emptyTitle}
            body={dict.catalog.emptyBody}
            actions={[
              { label: dict.common.allProducts, href: catalogue },
              ...(pageLinks.consultation
                ? [{ label: dict.common.requestConsultation, href: pageLinks.consultation }]
                : []),
            ]}
          />
        )}
        {facts && description ? (
          <section
            aria-labelledby="category-about"
            className="gap-x-column mt-section grid gap-y-6 border-t border-line pt-12 lg:grid-cols-12"
          >
            <h2 id="category-about" className="text-label text-cyan-ink uppercase lg:col-span-3">
              {category.name}
            </h2>
            <RichText
              doc={description}
              className="rich-text-article lg:col-span-7 lg:col-start-5"
            />
          </section>
        ) : null}
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

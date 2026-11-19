import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { ArrowRightIcon } from "@/components/icons/iconsax";
import { LineReveal } from "@/components/motion/text";
import { ChipNav } from "@/components/site/chip-nav";
import { EmptyState } from "@/components/site/empty-state";
import { JsonLdScript } from "@/components/site/json-ld";
import { PageHeading } from "@/components/site/page-heading";
import { ProductGrid } from "@/components/site/product-card";
import { env } from "@/lib/env";
import { localePath } from "@/lib/i18n/config";
import { fill } from "@/lib/i18n/format";
import { getRequestDictionary } from "@/lib/i18n/server";
import { getCatalogueOverview } from "@/lib/public/catalogue-overview";
import { getPageLinks } from "@/lib/public/home";
import { parseBrandParam } from "@/lib/public/listing";
import { staticPaths } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { collectionPageJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { markdownHref } from "@/lib/seo/rewrites";

export const instant = false;

export async function generateMetadata({
  searchParams,
}: PageProps<"/[locale]/mehsullar">): Promise<Metadata> {
  await connection();
  const [query, { locale, dict }] = await Promise.all([searchParams, getRequestDictionary()]);
  return pageMetadata({
    locale,
    title: dict.catalog.title,
    description: dict.catalog.description,
    paths: staticPaths(routes.catalogue()),
    og: { kind: "catalogue" },
    markdownPath: markdownHref(localePath(locale, routes.catalogue())),
    noIndex: Boolean(parseBrandParam(query.brand)),
  });
}

export default async function CataloguePage({ searchParams }: PageProps<"/[locale]/mehsullar">) {
  await connection();
  const [query, { locale, dict }] = await Promise.all([searchParams, getRequestDictionary()]);
  const [overview, pageLinks] = await Promise.all([
    getCatalogueOverview(locale, parseBrandParam(query.brand)),
    getPageLinks(locale),
  ]);
  const path = localePath(locale, routes.catalogue());
  const areas = overview.areas.filter((area) => area.total > 0 || !overview.brand);
  const groups = [
    ...areas.map((area) => ({ ...area, more: true })),
    ...(overview.other
      ? [
          {
            id: "other",
            anchor: "area-other",
            name: dict.catalog.otherTitle,
            href: path,
            total: overview.other.total,
            items: overview.other.items,
            more: false,
          },
        ]
      : []),
  ];
  const brandQuery = (slug: string | null) => (slug ? `${path}?brand=${slug}` : path);

  return (
    <>
      <PageHeading
        eyebrow={dict.catalog.eyebrow}
        title={dict.catalog.title}
        lead={<p>{dict.catalog.description}</p>}
        breadcrumbLabel={dict.common.breadcrumb}
        breadcrumbs={[
          { label: dict.common.home, href: localePath(locale) },
          { label: dict.catalog.title, href: path },
        ]}
      >
        {overview.total ? (
          <p className="text-grey tabular mt-6 text-small">
            {fill(dict.catalog.summary, {
              products: overview.total,
              areas: areas.filter((area) => area.total > 0).length,
            })}
          </p>
        ) : null}
      </PageHeading>

      {groups.length > 1 || overview.brands.length > 1 ? (
        <div className="container-page flex flex-col gap-8 pb-12 lg:pb-16">
          {groups.length > 1 ? (
            <ChipNav
              label={dict.catalog.areasTitle}
              heading={dict.catalog.areasTitle}
              chips={groups.map((group) => ({
                key: group.id,
                label: group.name,
                href: `#${group.anchor}`,
                count: group.total,
              }))}
            />
          ) : null}
          {overview.brands.length > 1 ? (
            <ChipNav
              label={dict.catalog.brandFilter}
              heading={dict.catalog.brandFilter}
              chips={[
                {
                  key: "all",
                  label: dict.catalog.allBrands,
                  href: brandQuery(null),
                  current: !overview.brand,
                },
                ...overview.brands.map((brand) => ({
                  key: brand.slug,
                  label: brand.name,
                  href: brandQuery(brand.slug),
                  current: overview.brand === brand.slug,
                  count: brand.count,
                })),
              ]}
            />
          ) : null}
        </div>
      ) : null}

      {overview.total ? (
        groups.map((group) => (
          <section
            key={group.id}
            id={group.anchor}
            aria-labelledby={`${group.anchor}-title`}
            className="scroll-mt-header"
          >
            <div className="container-page border-t border-line py-12 lg:py-20">
              <div className="gap-x-column grid gap-y-4 lg:grid-cols-12 lg:items-end">
                <div className="lg:col-span-8">
                  <p className="text-label text-grey tabular uppercase">
                    {fill(dict.catalog.areaCount, { count: group.total })}
                  </p>
                  <LineReveal
                    id={`${group.anchor}-title`}
                    text={group.name}
                    className="text-safe mt-3 text-h3"
                  />
                </div>
                {group.more ? (
                  <Link
                    href={group.href}
                    className="group/link text-cyan-ink hover:text-ink inline-flex min-h-11 items-center gap-2 text-small underline decoration-1 underline-offset-4 transition-colors duration-200 lg:col-span-4 lg:justify-self-end"
                  >
                    {dict.catalog.openArea}
                    <span className="sr-only">: {group.name}</span>
                    <ArrowRightIcon
                      size={16}
                      className="transition-transform duration-200 group-hover/link:translate-x-1"
                    />
                  </Link>
                ) : null}
              </div>
              {group.items.length ? (
                <ProductGrid
                  products={group.items}
                  moreLabel={dict.common.more}
                  className="mt-10 lg:mt-14"
                />
              ) : (
                <p className="text-ink-muted mt-6">{dict.catalog.empty}</p>
              )}
            </div>
          </section>
        ))
      ) : (
        <div className="container-page pb-section">
          <EmptyState
            title={dict.catalog.emptyTitle}
            body={dict.catalog.emptyBody}
            actions={[
              ...(overview.brand
                ? [{ label: dict.catalog.allBrands, href: path }]
                : [{ label: dict.common.home, href: localePath(locale) }]),
              ...(pageLinks.consultation
                ? [{ label: dict.common.requestConsultation, href: pageLinks.consultation }]
                : []),
            ]}
          />
        </div>
      )}

      <JsonLdScript
        data={collectionPageJsonLd({
          name: dict.catalog.title,
          description: dict.catalog.description,
          url: path,
          locale,
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
          items: groups.flatMap((group) =>
            group.items.map((item) => ({ name: item.name, url: item.href })),
          ),
        })}
      />
    </>
  );
}

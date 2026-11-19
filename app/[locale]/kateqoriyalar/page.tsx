import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { ArrowRightIcon } from "@/components/icons/iconsax";
import { previewImage } from "@/components/motion/preview-image";
import { RowPreview } from "@/components/motion/row-preview";
import { Reveal } from "@/components/motion/text";
import { button, buttonArrow } from "@/components/site/button";
import { JsonLdScript } from "@/components/site/json-ld";
import { PageHeading } from "@/components/site/page-heading";
import { env } from "@/lib/env";
import { localePath } from "@/lib/i18n/config";
import { fill } from "@/lib/i18n/format";
import { getRequestDictionary } from "@/lib/i18n/server";
import { getCategoryTree } from "@/lib/public/catalog";
import { getCatalogueOverview } from "@/lib/public/catalogue-overview";
import { staticPaths } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { collectionPageJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { markdownHref } from "@/lib/seo/rewrites";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, dict } = await getRequestDictionary();
  return pageMetadata({
    locale,
    title: dict.catalog.indexTitle,
    description: dict.catalog.indexDescription,
    paths: staticPaths(routes.categories()),
    og: { kind: "categories" },
    markdownPath: markdownHref(localePath(locale, routes.categories())),
  });
}

export default async function CategoriesPage() {
  await connection();
  const { locale, dict } = await getRequestDictionary();
  const [tree, overview] = await Promise.all([
    getCategoryTree(locale),
    getCatalogueOverview(locale, null),
  ]);
  const totals = new Map(overview.areas.map((area) => [area.id, area.total]));
  const path = localePath(locale, routes.categories());

  return (
    <>
      <PageHeading
        eyebrow={dict.catalog.eyebrow}
        title={dict.catalog.indexTitle}
        lead={<p>{dict.catalog.indexDescription}</p>}
        breadcrumbLabel={dict.common.breadcrumb}
        breadcrumbs={[
          { label: dict.common.home, href: localePath(locale) },
          { label: dict.catalog.indexTitle, href: path },
        ]}
      />
      <div className="container-page pb-section">
        {tree.length ? (
          <Reveal>
            <RowPreview
              label={dict.catalog.indexTitle}
              rows={tree.map((category) => ({
                id: category.id,
                href: category.href,
                title: category.name,
                tags: [
                  fill(dict.catalog.areaCount, { count: totals.get(category.id) ?? 0 }),
                  ...category.children.map((child) => child.name),
                ],
                image: previewImage(category.image),
              }))}
            />
          </Reveal>
        ) : (
          <p className="text-ink-muted">{dict.catalog.empty}</p>
        )}
        <Link
          href={localePath(locale, routes.catalogue())}
          className={`${button({ variant: "outline" })} mt-12`}
        >
          {dict.common.allProducts}
          <ArrowRightIcon size={20} className={buttonArrow} />
        </Link>
      </div>
      <JsonLdScript
        data={collectionPageJsonLd({
          name: dict.catalog.indexTitle,
          description: dict.catalog.indexDescription,
          url: path,
          locale,
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
          items: tree.map((category) => ({ name: category.name, url: category.href })),
        })}
      />
    </>
  );
}

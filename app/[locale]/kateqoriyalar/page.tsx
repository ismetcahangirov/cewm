import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { CategoryIndex } from "@/components/site/catalog/category-index";
import { JsonLdScript } from "@/components/site/json-ld";
import { env } from "@/lib/env";
import { localePath } from "@/lib/i18n/config";
import { getRequestDictionary } from "@/lib/i18n/server";
import { getCategoryImages } from "@/lib/public/home";
import { findCategoryMenu, getMenu } from "@/lib/public/menus";
import { getSiteSettings } from "@/lib/public/settings";
import { staticPaths } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { collectionPageJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { locale, dict } = await getRequestDictionary();
  return pageMetadata({
    locale,
    title: dict.catalog.indexTitle,
    description: dict.catalog.indexDescription,
    paths: staticPaths(routes.categories()),
    eyebrow: dict.seo.eyebrow.catalog,
  });
}

async function CategoriesContent() {
  await connection();
  const { locale, dict } = await getRequestDictionary();
  const [items, images, settings] = await Promise.all([
    getMenu("main", locale),
    getCategoryImages(locale),
    getSiteSettings(),
  ]);
  const menu = findCategoryMenu(items, images);
  if (!menu) notFound();

  return (
    <>
      <JsonLdScript
        data={collectionPageJsonLd({
          name: dict.catalog.indexTitle,
          description: dict.catalog.indexDescription,
          url: localePath(locale, routes.categories()),
          locale,
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
          items: menu.children.flatMap((child) =>
            child.href ? [{ name: child.label, url: child.href }] : [],
          ),
        })}
      />
      <h1 className="sr-only">{dict.catalog.indexTitle}</h1>
      <CategoryIndex
        items={menu.children}
        images={images}
        labels={{
          back: dict.common.back,
          viewAllIn: dict.common.viewAllIn,
          allProducts: dict.common.allProducts,
          projects: dict.common.projects,
          catalogue: dict.common.catalogue,
        }}
        allProductsHref={localePath(locale, routes.catalogue())}
        projectsHref={localePath(locale, routes.projects())}
        catalogueHref={settings.catalogueFile?.src ?? null}
      />
    </>
  );
}

export default function CategoriesPage() {
  return <CategoriesContent />;
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";

import { PageHeading } from "@/components/site/page-heading";
import { localePath } from "@/lib/i18n/config";
import { getRequestDictionary } from "@/lib/i18n/server";
import { getCategoryTree } from "@/lib/public/catalog";
import { staticPaths } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo/metadata";
import { markdownHref } from "@/lib/seo/rewrites";

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
  const tree = await getCategoryTree(locale);

  return (
    <>
      <PageHeading
        title={dict.catalog.indexTitle}
        breadcrumbLabel={dict.common.breadcrumb}
        breadcrumbs={[
          { label: dict.common.home, href: localePath(locale) },
          { label: dict.catalog.indexTitle, href: localePath(locale, routes.categories()) },
        ]}
      />
      <div className="container-page py-section">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tree.map((category) => (
            <li key={category.id} className="flex flex-col border border-line">
              {category.image ? (
                <Image
                  src={category.image.src}
                  alt={category.image.alt}
                  width={category.image.width}
                  height={category.image.height}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : null}
              <div className="p-4">
                <Link href={category.href} className="hover:text-cyan-ink text-h4 text-navy">
                  {category.name}
                </Link>
                {category.children.length ? (
                  <ul className="mt-2 flex flex-col gap-1 text-small">
                    {category.children.map((child) => (
                      <li key={child.id}>
                        <Link href={child.href} className="hover:text-cyan-ink">
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

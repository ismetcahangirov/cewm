import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { CategoriesSection } from "@/components/site/home/home-sections";
import { pill } from "@/components/site/pill";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getRequestDictionary } from "@/lib/i18n/server";
import { getHomeCategories } from "@/lib/public/home";
import { routes } from "@/lib/routes";

async function Categories({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  await connection();
  const categories = await getHomeCategories(locale);
  return (
    <CategoriesSection
      categories={categories}
      allProductsHref={localePath(locale, routes.catalogue())}
      dict={dict}
    />
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getRequestDictionary();
  return { title: dict.notFound.title, description: dict.notFound.body };
}

export default async function NotFound() {
  const { locale, dict } = await getRequestDictionary();

  return (
    <div className="pb-section">
      <div className="container-page pt-section">
        <h1 className="text-statement">{dict.notFound.title}</h1>
        <p className="mt-6 max-w-prose">{dict.notFound.body}</p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href={localePath(locale)} className={pill({ variant: "filled" })}>
            {dict.notFound.home}
          </Link>
          <Link
            href={localePath(locale, routes.catalogue())}
            className={pill({ variant: "outline" })}
          >
            {dict.notFound.products}
          </Link>
        </div>
      </div>
      <Suspense>
        <Categories locale={locale} dict={dict} />
      </Suspense>
    </div>
  );
}

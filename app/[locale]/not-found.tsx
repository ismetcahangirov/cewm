import type { Metadata } from "next";
import Link from "next/link";

import { button } from "@/components/site/button";
import { localePath } from "@/lib/i18n/config";
import { getRequestDictionary } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getRequestDictionary();
  return { title: dict.notFound.title, description: dict.notFound.body };
}

export default async function NotFound() {
  const { locale, dict } = await getRequestDictionary();

  return (
    <div className="container-page py-section">
      <h1 className="text-h1">{dict.notFound.title}</h1>
      <p className="mt-6 max-w-prose">{dict.notFound.body}</p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link href={localePath(locale)} className={button()}>
          {dict.notFound.home}
        </Link>
        <Link
          href={localePath(locale, routes.catalogue())}
          className={button({ variant: "outline" })}
        >
          {dict.notFound.products}
        </Link>
      </div>
    </div>
  );
}

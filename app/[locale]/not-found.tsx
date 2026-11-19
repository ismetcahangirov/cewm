import type { Metadata } from "next";

import { NotFoundView } from "@/components/site/not-found-view";
import { getRequestDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getRequestDictionary();
  return {
    title: dict.notFound.title,
    description: dict.notFound.body,
    robots: { index: false, follow: false },
  };
}

export default async function NotFound() {
  const { locale, dict } = await getRequestDictionary();
  return <NotFoundView locale={locale} dict={dict} />;
}

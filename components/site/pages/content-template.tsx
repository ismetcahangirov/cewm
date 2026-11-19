import { RichText } from "@/components/site/rich-text";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { PublicPage } from "@/lib/public/pages";

import { PageHeader, pageBodyClass } from "./page-header";

export type TemplateProps = {
  page: PublicPage;
  locale: Locale;
  dict: Dictionary;
  searchParams: Record<string, string | string[] | undefined>;
};

export async function ContentTemplate({ page, locale, dict }: TemplateProps) {
  return (
    <>
      <PageHeader page={page} locale={locale} dict={dict} />
      <div className={pageBodyClass()}>
        <RichText doc={page.content} imageAlt={page.title} className="max-w-3xl" />
      </div>
    </>
  );
}

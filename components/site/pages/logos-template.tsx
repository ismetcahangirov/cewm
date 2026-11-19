import { RichText } from "@/components/site/rich-text";
import { isEmptyRichText } from "@/lib/content/rich-text";
import { getLogosByGroup } from "@/lib/public/content";

import type { TemplateProps } from "./content-template";
import { LogoGrid } from "./logo-grid";
import { PageHeader, pageBodyClass } from "./page-header";

export async function LogosTemplate({ page, locale, dict }: TemplateProps) {
  const group = page.kind === "partners" ? "partners" : "references";
  const logos = await getLogosByGroup(locale, group);
  const hasText = !isEmptyRichText(page.content);
  return (
    <>
      <PageHeader page={page} locale={locale} dict={dict} />
      <div className={pageBodyClass()}>
        {hasText && <RichText doc={page.content} imageAlt={page.title} className="max-w-3xl" />}
        {logos.length > 0 ? (
          <LogoGrid logos={logos} showNames className={hasText ? "mt-section" : undefined} />
        ) : (
          <p className="text-base text-muted">{dict.content.logos.empty}</p>
        )}
      </div>
    </>
  );
}

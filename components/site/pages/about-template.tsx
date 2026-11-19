import { JsonLdScript } from "@/components/site/json-ld";
import { RichText } from "@/components/site/rich-text";
import { env } from "@/lib/env";
import { localePath } from "@/lib/i18n/config";
import { pickLocale } from "@/lib/i18n/localized";
import { getLogosByGroup } from "@/lib/public/content";
import { getSiteSettings } from "@/lib/public/settings";
import { getTeamMembers } from "@/lib/public/team";
import { routes } from "@/lib/routes";
import { aboutPageJsonLd, organizationJsonLd } from "@/lib/seo/json-ld";

import type { TemplateProps } from "./content-template";
import { LogoGrid } from "./logo-grid";
import { PageHeader, pageBodyClass } from "./page-header";
import { TeamGrid } from "./team-grid";

export async function AboutTemplate({ page, locale, dict }: TemplateProps) {
  const [settings, team, partners, references] = await Promise.all([
    getSiteSettings(),
    getTeamMembers(locale),
    getLogosByGroup(locale, "partners"),
    getLogosByGroup(locale, "references"),
  ]);
  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  const groups = [
    { key: "partners", title: dict.home.partners, logos: partners },
    { key: "references", title: dict.home.references, logos: references },
  ].filter((group) => group.logos.length > 0);

  return (
    <>
      <JsonLdScript
        data={[
          aboutPageJsonLd({
            name: page.title,
            description: page.seoDescription,
            url: localePath(locale, routes.page(pickLocale(page.slug, locale))),
            locale,
            siteUrl,
          }),
          organizationJsonLd(settings, locale, siteUrl),
        ]}
      />
      <PageHeader page={page} locale={locale} dict={dict} />
      <div className={pageBodyClass()}>
        <RichText doc={page.content} imageAlt={page.title} className="max-w-3xl" />
        {team.length > 0 && (
          <section aria-labelledby="about-team" className="mt-section">
            <h2 id="about-team" className="text-h3">
              {dict.content.team.title}
            </h2>
            <TeamGrid members={team} locale={locale} dict={dict} />
          </section>
        )}
        {groups.map((group) => (
          <section key={group.key} aria-labelledby={`about-${group.key}`} className="mt-section">
            <h2 id={`about-${group.key}`} className="text-h3">
              {group.title}
            </h2>
            <LogoGrid logos={group.logos} className="mt-8" />
          </section>
        ))}
      </div>
    </>
  );
}

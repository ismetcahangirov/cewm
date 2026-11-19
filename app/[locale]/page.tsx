import type { Metadata } from "next";
import { connection } from "next/server";

import { CustomSection } from "@/components/site/home/custom-section";
import { HeroSlider } from "@/components/site/home/hero-slider";
import { JsonLdScript } from "@/components/site/json-ld";
import {
  CategoriesSection,
  LogosSection,
  ProductsSection,
  ProjectsBand,
} from "@/components/site/home/home-sections";
import { env } from "@/lib/env";
import { localePath } from "@/lib/i18n/config";
import { pickExact, pickLocale } from "@/lib/i18n/localized";
import { getRequestDictionary } from "@/lib/i18n/server";
import {
  getFeaturedProducts,
  getHeroSlides,
  getHomeCategories,
  getHomeSections,
  getHomeProjects,
  getLogoGroups,
  getPageLinks,
} from "@/lib/public/home";
import { getSiteSettings } from "@/lib/public/settings";
import { staticPaths } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { businessJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const [{ locale, dict }, settings] = await Promise.all([
    getRequestDictionary(),
    getSiteSettings(),
  ]);
  const ogImage = settings.ogImage;
  return pageMetadata({
    locale,
    title: pickExact(settings.seoTitle, locale) ?? dict.meta.homeTitle,
    absoluteTitle: true,
    description: pickExact(settings.seoDescription, locale) ?? dict.meta.description,
    paths: staticPaths(routes.home()),
    eyebrow: dict.seo.eyebrow.home,
    image: ogImage
      ? {
          src: ogImage.src,
          width: ogImage.width,
          height: ogImage.height,
          alt: ogImage.alt ? pickLocale(ogImage.alt, locale) : null,
        }
      : null,
  });
}

export default function HomePage() {
  return <HomeContent />;
}

async function HomeContent() {
  await connection();
  const { locale, dict } = await getRequestDictionary();
  const [settings, sections, slides, categories, products, projects, logoGroups, pages] =
    await Promise.all([
      getSiteSettings(),
      getHomeSections(locale),
      getHeroSlides(locale),
      getHomeCategories(locale),
      getFeaturedProducts(locale),
      getHomeProjects(locale),
      getLogoGroups(locale),
      getPageLinks(locale),
    ]);
  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  const allProductsHref = localePath(locale, routes.catalogue());
  const jsonLd = [
    ...businessJsonLd(settings, locale, siteUrl),
    websiteJsonLd(settings, locale, siteUrl),
  ];

  return (
    <>
      <JsonLdScript data={jsonLd} />
      <h1 className="sr-only">{dict.meta.homeTitle}</h1>
      {slides.length > 0 && (
        <HeroSlider
          slides={slides}
          labels={{
            region: dict.meta.siteName,
            slide: dict.home.slide,
            previous: dict.common.previous,
            next: dict.common.next,
            more: dict.common.more,
          }}
        />
      )}
      {sections.map((section) => {
        if (!section.visible && section.key !== "projects") return null;
        switch (section.key) {
          case "categories":
            return (
              <CategoriesSection
                key={section.key}
                categories={categories}
                allProductsHref={allProductsHref}
                title={section.title}
                dict={dict}
              />
            );
          case "products":
            return (
              <ProductsSection
                key={section.key}
                products={products}
                allProductsHref={allProductsHref}
                title={section.title}
                dict={dict}
              />
            );
          case "projects":
            return (
              <ProjectsBand
                key={section.key}
                projects={section.visible ? projects : []}
                projectsHref={localePath(locale, routes.projects())}
                quoteHref={pages.quote ?? null}
                title={section.title}
                dict={dict}
              />
            );
          case "logos":
            return <LogosSection key={section.key} groups={logoGroups} dict={dict} />;
          case "custom":
            return (
              <CustomSection
                key={section.id}
                id={section.id}
                block={section.block}
                labels={{ soundOn: dict.home.soundOn, soundOff: dict.home.soundOff }}
              />
            );
        }
      })}
    </>
  );
}

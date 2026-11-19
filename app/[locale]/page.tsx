import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { HeroFilm } from "@/components/home/hero-film";
import { FactBlockView } from "@/components/seo/fact-block";
import type { HeroChapter } from "@/components/home/hero-film-player";
import { ArrowRightIcon } from "@/components/icons/iconsax";
import { previewImage } from "@/components/motion/preview-image";
import { RowPreview } from "@/components/motion/row-preview";
import { PanelPush } from "@/components/motion/scenes";
import { LineReveal, Reveal, WordReveal } from "@/components/motion/text";
import { button, buttonArrow } from "@/components/site/button";
import { ConsultationSection } from "@/components/site/consultation/consultation-section";
import { JsonLdScript } from "@/components/site/json-ld";
import { ProductGrid } from "@/components/site/product-card";
import { RichText } from "@/components/site/rich-text";
import { cx } from "@/lib/cx";
import { env } from "@/lib/env";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { pickExact } from "@/lib/i18n/localized";
import { getRequestDictionary } from "@/lib/i18n/server";
import {
  getBrands,
  getClientLogos,
  getFeaturedProducts,
  getHero,
  getHomeCategories,
  getHomeSections,
  getLatestPosts,
  type CustomBlock,
  type HomeHero,
  type HomeSection,
} from "@/lib/public/home";
import { getLogoTones } from "@/lib/public/logo-tone";
import { getSiteSettings } from "@/lib/public/settings";
import { staticPaths } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { companyFactBlock, companyStatement } from "@/lib/seo/facts";
import { businessJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";
import { homeOfferCatalog } from "@/lib/seo/catalog-links";
import { getCorpus } from "@/lib/seo/corpus";
import { pageMetadata } from "@/lib/seo/metadata";
import { markdownHref } from "@/lib/seo/rewrites";

const chapterWindows = [
  { key: "exterior", from: 0.19, to: 0.27, placement: "bottom" },
  { key: "threshold", from: 0.3, to: 0.5, placement: "bottom" },
  { key: "living", from: 0.56, to: 0.77, placement: "bottom" },
  { key: "kitchen", from: 0.83, to: 1.01, placement: "top" },
] as const satisfies Pick<HeroChapter, "key" | "from" | "to" | "placement">[];

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const [{ locale, dict }, settings] = await Promise.all([
    getRequestDictionary(),
    getSiteSettings(),
  ]);
  return pageMetadata({
    locale,
    title: pickExact(settings.seoTitle, locale) ?? dict.meta.homeTitle,
    absoluteTitle: true,
    description: pickExact(settings.seoDescription, locale) ?? dict.meta.description,
    paths: staticPaths(routes.home()),
    og: { kind: "home" },
    markdownPath: markdownHref(localePath(locale, routes.home())),
  });
}

function SectionShell({
  id,
  eyebrow,
  title,
  tone = "white",
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  tone?: "white" | "mist";
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={tone === "mist" ? "surface-mist" : undefined}>
      <div className="container-page py-section">
        <div className="gap-x-column grid gap-y-6 lg:grid-cols-12">
          <p className="text-label text-cyan-ink uppercase lg:col-span-3 lg:pt-3">{eyebrow}</p>
          <LineReveal id={id} text={title} className="text-h2 lg:col-span-9" />
        </div>
        <Reveal className="mt-12 lg:mt-16">{children}</Reveal>
      </div>
    </section>
  );
}

async function BuiltInSection({
  section,
  locale,
  dict,
}: {
  section: Extract<HomeSection, { title: string | null }>;
  locale: Locale;
  dict: Dictionary;
}) {
  const id = `home-${section.key}`;
  switch (section.key) {
    case "categories": {
      const categories = await getHomeCategories(locale);
      if (!categories.length) return null;
      return (
        <SectionShell
          id={id}
          eyebrow={dict.home.categoriesEyebrow}
          title={section.title ?? dict.home.categoriesTitle}
        >
          <RowPreview
            label={section.title ?? dict.home.categoriesTitle}
            rows={categories.map((category) => ({
              id: category.id,
              href: category.href,
              title: category.name,
              image: previewImage(category.image),
            }))}
          />
          <Link
            href={localePath(locale, routes.catalogue())}
            className={cx(button({ variant: "outline" }), "mt-10")}
          >
            {dict.common.allProducts}
            <ArrowRightIcon size={20} className={buttonArrow} />
          </Link>
        </SectionShell>
      );
    }
    case "products": {
      const products = await getFeaturedProducts(locale);
      if (!products.length) return null;
      return (
        <SectionShell
          id={id}
          eyebrow={dict.home.productsEyebrow}
          title={section.title ?? dict.home.productsTitle}
        >
          <ProductGrid products={products} />
        </SectionShell>
      );
    }
    case "brands": {
      const brands = await getBrands(locale);
      if (!brands.length) return null;
      const tones = await getLogoTones(
        brands.flatMap((brand) => (brand.image ? [brand.image.src] : [])),
      );
      return (
        <SectionShell
          id={id}
          eyebrow={dict.home.brandsEyebrow}
          title={section.title ?? dict.home.brandsTitle}
          tone="mist"
        >
          <ul className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {brands.map((brand) => {
              const body = (
                <>
                  {brand.image ? (
                    <span
                      className={cx(
                        "flex h-20 items-center self-start",
                        tones[brand.image.src] === "light" && "rounded-xs bg-navy px-5",
                      )}
                    >
                      <Image
                        src={brand.image.src}
                        alt={brand.image.alt}
                        width={brand.image.width}
                        height={brand.image.height}
                        sizes="240px"
                        className="h-12 w-auto object-contain object-left"
                      />
                    </span>
                  ) : (
                    <span className="text-h3">{brand.name}</span>
                  )}
                  {brand.description ? (
                    <span className="text-ink-muted text-small">{brand.description}</span>
                  ) : null}
                  {brand.url ? (
                    <span className="text-cyan-ink group-hover/brand:text-ink mt-auto inline-flex min-h-11 items-end text-small underline decoration-1 underline-offset-4 transition-colors duration-200">
                      {dict.brands.visit}
                    </span>
                  ) : null}
                </>
              );
              return (
                <li key={brand.id} className="bg-mist flex">
                  {brand.url ? (
                    <a
                      href={brand.url}
                      target="_blank"
                      rel="noopener"
                      aria-label={`${brand.name}: ${dict.brands.visit}`}
                      className="group/brand flex min-h-48 w-full flex-col gap-4 p-8 transition-colors duration-200 hover:bg-white"
                    >
                      {body}
                    </a>
                  ) : (
                    <div className="flex min-h-48 w-full flex-col gap-4 p-8">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </SectionShell>
      );
    }
    case "clients": {
      const logos = await getClientLogos(locale);
      if (!logos.length) return null;
      return (
        <SectionShell
          id={id}
          eyebrow={dict.home.clientsEyebrow}
          title={section.title ?? dict.home.clientsTitle}
        >
          <ul className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
            {logos.map((logo) => (
              <li key={logo.id} className="flex min-h-32 items-center justify-center bg-white p-6">
                <Image
                  src={logo.image.src}
                  alt={logo.image.alt}
                  width={logo.image.width}
                  height={logo.image.height}
                  sizes="160px"
                  className="max-h-12 w-auto"
                />
              </li>
            ))}
          </ul>
        </SectionShell>
      );
    }
    case "posts": {
      const posts = await getLatestPosts(locale);
      if (!posts.length) return null;
      return (
        <SectionShell
          id={id}
          eyebrow={dict.home.postsEyebrow}
          title={section.title ?? dict.home.postsTitle}
        >
          <RowPreview
            label={section.title ?? dict.home.postsTitle}
            rows={posts.map((post) => ({ id: post.id, href: post.href, title: post.title }))}
          />
        </SectionShell>
      );
    }
  }
}

function CustomSection({ id, block }: { id: string; block: CustomBlock }) {
  const navy = block.tone === "navy";
  return (
    <section
      aria-labelledby={block.title ? `custom-${id}` : undefined}
      className={navy ? "surface-navy" : block.tone === "light" ? "surface-mist" : undefined}
    >
      <div className="gap-x-column container-page grid gap-y-10 py-section lg:grid-cols-12">
        <Reveal className={block.image || block.video ? "lg:col-span-6" : "lg:col-span-8"}>
          {block.eyebrow ? (
            <p className={cx("text-label uppercase", navy ? "text-cyan" : "text-cyan-ink")}>
              {block.eyebrow}
            </p>
          ) : null}
          {block.title ? (
            <h2 id={`custom-${id}`} className="mt-4 text-h2">
              {block.title}
            </h2>
          ) : null}
          {block.body ? <RichText doc={block.body} className="mt-6" /> : null}
          {block.link ? (
            <Link
              href={block.link.href}
              className={cx(button({ variant: navy ? "accent" : "filled" }), "mt-8")}
            >
              {block.link.label}
              <ArrowRightIcon size={20} className={buttonArrow} />
            </Link>
          ) : null}
        </Reveal>
        {block.image ? (
          <Reveal className="lg:col-span-6">
            <Image
              src={block.image.src}
              alt={block.image.alt}
              width={block.image.width}
              height={block.image.height}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="h-auto w-full"
            />
          </Reveal>
        ) : block.video ? (
          <Reveal className="lg:col-span-6">
            <video
              controls
              muted={!block.video.sound}
              playsInline
              preload="metadata"
              poster={block.poster?.src}
              aria-label={block.video.label ?? undefined}
              className="h-auto w-full"
            >
              <source src={block.video.src} type={block.video.type} />
            </video>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}

function Statement({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <PanelPush labelledBy="home-statement" className="flex items-center">
      <div className="gap-x-column container-page grid w-full gap-y-8 py-section lg:grid-cols-12">
        <h2 id="home-statement" className="text-label text-cyan uppercase lg:col-span-3 lg:pt-3">
          {dict.home.statementEyebrow}
        </h2>
        <div className="lg:col-span-9">
          <WordReveal text={dict.home.statement} className="text-h3" />
          <Reveal className="mt-10">
            <Link
              href={localePath(locale, routes.catalogue())}
              className={button({ variant: "accent" })}
            >
              {dict.common.allProducts}
              <ArrowRightIcon size={20} className={buttonArrow} />
            </Link>
          </Reveal>
        </div>
      </div>
    </PanelPush>
  );
}

function fallbackHero(dict: Dictionary): HomeHero {
  return { headline: dict.meta.homeTitle, subline: null, cta: null, film: null };
}

export default async function HomePage() {
  await connection();
  const { locale, dict } = await getRequestDictionary();
  const [hero, sections, settings, requestHeaders, corpus] = await Promise.all([
    getHero(locale),
    getHomeSections(locale),
    getSiteSettings(),
    headers(),
    getCorpus(),
  ]);
  const saveData = requestHeaders.get("save-data")?.toLowerCase() === "on";
  const chapters: HeroChapter[] = chapterWindows.map((window) => ({
    ...window,
    ...dict.home.chapters[window.key],
  }));

  return (
    <>
      <JsonLdScript
        data={[
          ...businessJsonLd(settings, locale, env.NEXT_PUBLIC_SITE_URL, {
            description: companyStatement(corpus, locale, dict),
            brands: corpus.brands,
            hasOfferCatalog: homeOfferCatalog(corpus, locale),
          }),
          websiteJsonLd({ locale, siteUrl: env.NEXT_PUBLIC_SITE_URL, name: settings.legalName }),
        ]}
      />
      <HeroFilm
        hero={hero ?? fallbackHero(dict)}
        staticOnly={saveData}
        chapters={hero?.film ? chapters : []}
        panel={<Statement locale={locale} dict={dict} />}
      />
      {sections
        .filter((section) => section.visible)
        .map((section) =>
          section.key === "custom" ? (
            <CustomSection key={section.id} id={section.id} block={section.block} />
          ) : (
            <BuiltInSection key={section.key} section={section} locale={locale} dict={dict} />
          ),
        )}
      <div className="container-page py-section">
        <FactBlockView
          block={companyFactBlock(corpus, locale, dict)}
          className="border-t border-line pt-12 lg:pt-16"
        />
      </div>
      <ConsultationSection locale={locale} dict={dict} />
    </>
  );
}

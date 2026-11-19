import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";

import { button } from "@/components/site/button";
import { JsonLdScript } from "@/components/site/json-ld";
import { ProductGrid } from "@/components/site/product-card";
import { RichText } from "@/components/site/rich-text";
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
  type HomeSection,
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
  return pageMetadata({
    locale,
    title: pickExact(settings.seoTitle, locale) ?? dict.meta.homeTitle,
    absoluteTitle: true,
    description: pickExact(settings.seoDescription, locale) ?? dict.meta.description,
    paths: staticPaths(routes.home()),
    image: settings.ogImage?.width
      ? {
          src: settings.ogImage.src,
          width: settings.ogImage.width,
          height: settings.ogImage.height,
        }
      : null,
  });
}

function SectionShell({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="container-page py-section">
      <h2 id={id} className="text-h2">
        {title}
      </h2>
      <div className="mt-8">{children}</div>
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
        <SectionShell id={id} title={section.title ?? dict.home.categoriesTitle}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={category.href}
                  className="flex min-h-24 items-end border border-line bg-light p-4 text-card font-semibold text-navy hover:border-cyan"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </SectionShell>
      );
    }
    case "products": {
      const products = await getFeaturedProducts(locale);
      if (!products.length) return null;
      return (
        <SectionShell id={id} title={section.title ?? dict.home.productsTitle}>
          <ProductGrid products={products} />
        </SectionShell>
      );
    }
    case "brands": {
      const brands = await getBrands(locale);
      if (!brands.length) return null;
      return (
        <SectionShell id={id} title={section.title ?? dict.home.brandsTitle}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {brands.map((brand) => (
              <li
                key={brand.id}
                className="flex min-h-24 items-center justify-center border border-line p-4"
              >
                {brand.image ? (
                  <Image
                    src={brand.image.src}
                    alt={brand.image.alt}
                    width={brand.image.width}
                    height={brand.image.height}
                    sizes="240px"
                    className="max-h-16 w-auto"
                  />
                ) : (
                  <span className="text-card font-semibold text-navy">{brand.name}</span>
                )}
              </li>
            ))}
          </ul>
        </SectionShell>
      );
    }
    case "clients": {
      const logos = await getClientLogos(locale);
      if (!logos.length) return null;
      return (
        <SectionShell id={id} title={section.title ?? dict.home.clientsTitle}>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {logos.map((logo) => (
              <li key={logo.id} className="flex min-h-20 items-center justify-center p-2">
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
        <SectionShell id={id} title={section.title ?? dict.home.postsTitle}>
          <ul className="grid gap-4 md:grid-cols-3">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={post.href}
                  className="block border border-line p-4 text-card text-navy hover:border-cyan"
                >
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        </SectionShell>
      );
    }
  }
}

function CustomSection({ id, block }: { id: string; block: CustomBlock }) {
  return (
    <section
      aria-labelledby={block.title ? `custom-${id}` : undefined}
      className={
        block.tone === "navy" ? "bg-navy text-white" : block.tone === "light" ? "bg-light" : ""
      }
    >
      <div className="container-page grid gap-8 py-section md:grid-cols-2">
        <div>
          {block.eyebrow ? <p className="text-meta">{block.eyebrow}</p> : null}
          {block.title ? (
            <h2
              id={`custom-${id}`}
              className={block.tone === "navy" ? "text-h2 text-white" : "text-h2"}
            >
              {block.title}
            </h2>
          ) : null}
          {block.body ? <RichText doc={block.body} className="mt-4" /> : null}
          {block.link ? (
            <Link href={block.link.href} className={button({ className: "mt-6" })}>
              {block.link.label}
            </Link>
          ) : null}
        </div>
        {block.image ? (
          <Image
            src={block.image.src}
            alt={block.image.alt}
            width={block.image.width}
            height={block.image.height}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="h-auto w-full"
          />
        ) : block.video ? (
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
        ) : null}
      </div>
    </section>
  );
}

export default async function HomePage() {
  await connection();
  const { locale, dict } = await getRequestDictionary();
  const [hero, sections, settings] = await Promise.all([
    getHero(locale),
    getHomeSections(locale),
    getSiteSettings(),
  ]);

  return (
    <>
      <JsonLdScript
        data={[
          ...businessJsonLd(settings, locale, env.NEXT_PUBLIC_SITE_URL),
          websiteJsonLd(settings, locale, env.NEXT_PUBLIC_SITE_URL),
        ]}
      />
      <section data-hero="" className="bg-navy text-white">
        <div className="container-page py-section">
          <h1 className="max-w-4xl text-h1 text-white">{hero?.headline ?? dict.meta.homeTitle}</h1>
          {hero?.subline ? <p className="mt-4 max-w-2xl text-lead">{hero.subline}</p> : null}
          <div className="mt-8 flex flex-wrap gap-4">
            {hero?.cta ? (
              <Link href={hero.cta.href} className={button({ className: "bg-cyan text-navy" })}>
                {hero.cta.label}
              </Link>
            ) : (
              <Link
                href={localePath(locale, routes.catalogue())}
                className={button({ className: "bg-cyan text-navy" })}
              >
                {dict.common.allProducts}
              </Link>
            )}
          </div>
          {hero?.film?.poster ? (
            <Image
              src={hero.film.poster.src}
              alt={hero.film.poster.alt}
              width={hero.film.poster.width}
              height={hero.film.poster.height}
              sizes="100vw"
              priority
              className="mt-10 h-auto w-full"
            />
          ) : null}
        </div>
      </section>
      {sections
        .filter((section) => section.visible)
        .map((section) =>
          section.key === "custom" ? (
            <CustomSection key={section.id} id={section.id} block={section.block} />
          ) : (
            <BuiltInSection key={section.key} section={section} locale={locale} dict={dict} />
          ),
        )}
    </>
  );
}

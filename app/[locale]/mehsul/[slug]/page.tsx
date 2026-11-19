import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import {
  ArrowRightIcon,
  CallIcon,
  DocumentDownloadIcon,
  ExportSquareIcon,
} from "@/components/icons/iconsax";
import { LineReveal, Reveal } from "@/components/motion/text";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { button, buttonArrow } from "@/components/site/button";
import { ConsultationSection } from "@/components/site/consultation/consultation-section";
import { FitHeading } from "@/components/site/fit-heading";
import { FactBlockView } from "@/components/seo/fact-block";
import { JsonLdScript } from "@/components/site/json-ld";
import { ProductGrid } from "@/components/site/product-card";
import { ProductGallery } from "@/components/site/product/product-gallery";
import { ProductVideo } from "@/components/site/product/product-video";
import { QuoteBar } from "@/components/site/product/quote-bar";
import { SpecTable } from "@/components/site/product/spec-table";
import { RichText } from "@/components/site/rich-text";
import { telHref } from "@/lib/contact-links";
import { richTextToPlain, summarize } from "@/lib/content/rich-text";
import { cx } from "@/lib/cx";
import { env } from "@/lib/env";
import { localePath } from "@/lib/i18n/config";
import { fill, formatFileSize } from "@/lib/i18n/format";
import { getRequestDictionary } from "@/lib/i18n/server";
import { formatAzerbaijaniPhone } from "@/lib/phone";
import { getProductBySlug, getRelatedProducts, groupSpecs } from "@/lib/public/product";
import { getSiteSettings } from "@/lib/public/settings";
import { localizedPaths, redirectToCanonicalSlug } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { getCorpus, entityInfo } from "@/lib/seo/corpus";
import { productFactBlock } from "@/lib/seo/facts";
import { productJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { markdownHref } from "@/lib/seo/rewrites";
import { describeEntity } from "@/lib/seo/text";

export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/mehsul/[slug]">): Promise<Metadata> {
  await connection();
  const [{ slug }, { locale, dict }] = await Promise.all([params, getRequestDictionary()]);
  const product = await getProductBySlug(locale, slug);
  if (!product) notFound();
  redirectToCanonicalSlug(product.slug, locale, slug, routes.product);
  const info = await entityInfo("product", product.id);
  const description = describeEntity({
    locale,
    name: product.name,
    admin: product.seoDescription,
    summary: summarize(richTextToPlain(product.shortDescription ?? product.description)),
    fallback: fill(dict.product.description, { name: product.name }),
  });
  return pageMetadata({
    locale,
    title: product.seoTitle ?? product.name,
    absoluteTitle: Boolean(product.seoTitle),
    description,
    paths: localizedPaths(product.slug, routes.product),
    availableLocales: info.locales,
    og: { kind: "product", slug },
    markdownPath: markdownHref(localePath(locale, routes.product(slug))),
  });
}

const factRow = "flex min-h-12 items-center justify-between gap-4 border-b border-line py-2";

export default async function ProductPage({ params }: PageProps<"/[locale]/mehsul/[slug]">) {
  await connection();
  const [{ slug }, { locale, dict }] = await Promise.all([params, getRequestDictionary()]);
  const product = await getProductBySlug(locale, slug);
  if (!product) notFound();
  redirectToCanonicalSlug(product.slug, locale, slug, routes.product);
  const [related, settings, corpus] = await Promise.all([
    getRelatedProducts(locale, product.id, product.category?.id ?? null),
    getSiteSettings(),
    getCorpus(),
  ]);
  const corpusProduct = corpus.products.find((item) => item.id === product.id) ?? null;
  const text = dict.product;
  const path = localePath(locale, routes.product(slug));
  const lang = product.contentLocale !== locale ? product.contentLocale : undefined;
  const groups = groupSpecs(product.specs);
  const phone = settings.phones[0]?.number ?? null;
  const cover = product.images[0] ?? null;
  const hasGallery = product.images.length > 0;
  const meta = [product.brand?.name, product.category?.name].filter(Boolean).join(" · ");

  return (
    <>
      <div className="container-page pt-6">
        <Breadcrumbs
          label={dict.common.breadcrumb}
          items={[
            { label: dict.common.home, href: localePath(locale) },
            { label: dict.catalog.title, href: localePath(locale, routes.catalogue()) },
            ...(product.category
              ? [{ label: product.category.name, href: product.category.href }]
              : []),
            { label: product.name, href: path },
          ]}
        />
      </div>

      <section aria-labelledby="product-title" className="container-page pt-8 pb-section lg:pt-12">
        <div className="gap-x-column grid gap-y-10 lg:grid-cols-12">
          {hasGallery ? (
            <div className="min-w-0 lg:col-span-7">
              <ProductGallery
                images={product.images}
                labels={{
                  gallery: fill(text.galleryLabel, { name: product.name }),
                  open: text.galleryOpen,
                  close: text.galleryClose,
                  previous: text.galleryPrevious,
                  next: text.galleryNext,
                  position: text.galleryPosition,
                }}
              />
            </div>
          ) : null}
          <div
            className={cx(
              "lg:top-header min-w-0 lg:sticky lg:self-start lg:pt-2",
              hasGallery ? "lg:col-span-5" : "lg:col-span-8",
            )}
          >
            {meta ? <p className="text-label text-grey uppercase">{meta}</p> : null}
            <FitHeading
              id="product-title"
              size="h2"
              text={product.name}
              lang={lang}
              className="mt-4"
            />
            {lang ? (
              <p className="border-cyan-ink text-ink-muted mt-6 border-l-2 pl-4 text-small">
                {text.fallbackNotice}
              </p>
            ) : null}
            {product.shortDescription && !corpusProduct ? (
              <div lang={lang}>
                <RichText doc={product.shortDescription} className="rich-text-lead mt-6" />
              </div>
            ) : null}
            <div id="product-cta" className="mt-8 flex flex-wrap gap-3">
              <a href="#consultation" className={cx(button(), "max-sm:w-full")}>
                {text.requestQuote}
                <ArrowRightIcon size={20} className={buttonArrow} />
              </a>
              {phone ? (
                <a
                  href={telHref(phone)}
                  className={cx(button({ variant: "outline" }), "tabular max-sm:w-full")}
                >
                  <CallIcon size={20} />
                  {formatAzerbaijaniPhone(phone)}
                </a>
              ) : null}
            </div>
            <dl className="mt-10 border-t border-line text-small">
              {product.brand ? (
                <div className={factRow}>
                  <dt className="text-ink-muted">{text.brand}</dt>
                  <dd>
                    {product.brand.url ? (
                      <a
                        href={product.brand.url}
                        target="_blank"
                        rel="noopener"
                        className="hover:text-cyan-ink inline-flex min-h-11 items-center gap-2 underline decoration-1 underline-offset-4"
                      >
                        {product.brand.name}
                        <ExportSquareIcon size={16} />
                      </a>
                    ) : (
                      product.brand.name
                    )}
                  </dd>
                </div>
              ) : null}
              {product.category ? (
                <div className={factRow}>
                  <dt className="text-ink-muted">{text.category}</dt>
                  <dd className="text-right">
                    <Link
                      href={product.category.href}
                      prefetch={false}
                      className="hover:text-cyan-ink inline-flex min-h-11 items-center underline decoration-1 underline-offset-4"
                    >
                      {product.category.name}
                    </Link>
                  </dd>
                </div>
              ) : null}
              {product.sku ? (
                <div className={factRow}>
                  <dt className="text-ink-muted">{text.model}</dt>
                  <dd className="tabular">{product.sku}</dd>
                </div>
              ) : null}
              {product.specs.length ? (
                <div className={factRow}>
                  <dt className="text-ink-muted">{text.specs}</dt>
                  <dd>
                    <a
                      href="#product-specs"
                      className="hover:text-cyan-ink inline-flex min-h-11 items-center underline decoration-1 underline-offset-4"
                    >
                      {fill(text.specCount, { count: product.specs.length })}
                    </a>
                  </dd>
                </div>
              ) : null}
              {product.documents.length ? (
                <div className={factRow}>
                  <dt className="text-ink-muted">{text.documents}</dt>
                  <dd>
                    <a
                      href="#product-documents"
                      className="hover:text-cyan-ink inline-flex min-h-11 items-center underline decoration-1 underline-offset-4"
                    >
                      {fill(text.documentCount, { count: product.documents.length })}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </section>

      {corpusProduct ? (
        <div className="container-page pb-section">
          <FactBlockView
            block={productFactBlock(corpus, corpusProduct, locale, dict)}
            lang={lang}
            className="border-t border-line pt-12 lg:pt-16"
          />
        </div>
      ) : null}

      {product.description || product.benefits.length ? (
        <section aria-labelledby="product-overview" className="container-page pb-section">
          <div className="gap-x-column grid gap-y-8 border-t border-line pt-12 lg:grid-cols-12 lg:pt-16">
            <h2 id="product-overview" className="text-label text-cyan-ink uppercase lg:col-span-3">
              {text.overview}
            </h2>
            <div lang={lang} className="lg:col-span-8 lg:col-start-5">
              {product.description ? (
                <Reveal>
                  <RichText doc={product.description} className="rich-text-lead" />
                </Reveal>
              ) : null}
              {product.benefits.length ? (
                <div className={product.description ? "mt-14" : undefined}>
                  <h3 className="text-h4">{text.benefits}</h3>
                  <ol data-reveal-group="" className="gap-x-column mt-6 grid md:grid-cols-2">
                    {product.benefits.map((benefit, index) => (
                      <li
                        key={`${benefit}-${index}`}
                        data-reveal=""
                        className="flex gap-4 border-t border-line py-4"
                      >
                        <span aria-hidden="true" className="text-label text-grey tabular pt-1">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {groups.length || product.documents.length ? (
        <section
          id="product-specs"
          aria-labelledby="product-specs-title"
          className="surface-mist scroll-mt-header"
        >
          <div className="gap-x-column container-page grid gap-y-10 py-section lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="text-label text-cyan-ink uppercase">{text.technicalEyebrow}</p>
              <LineReveal
                id="product-specs-title"
                text={groups.length ? text.specs : text.documents}
                className="text-safe mt-4 text-h2"
              />
            </div>
            <div className="lg:col-span-8">
              {groups.length ? (
                <div lang={lang}>
                  <SpecTable
                    groups={groups}
                    caption={fill(text.specsCaption, { name: product.name })}
                    parameterLabel={text.parameter}
                    valueLabel={text.value}
                  />
                </div>
              ) : null}
              {product.documents.length ? (
                <div
                  id="product-documents"
                  className={cx("scroll-mt-header", groups.length ? "mt-14" : undefined)}
                >
                  {groups.length ? <h3 className="text-h4">{text.documents}</h3> : null}
                  <ul className={cx("border-t border-line", groups.length ? "mt-6" : undefined)}>
                    {product.documents.map((document) => (
                      <li key={document.href} className="border-b border-line">
                        <a
                          href={document.href}
                          download
                          className="group/doc flex min-h-16 items-center gap-4 py-3"
                        >
                          <DocumentDownloadIcon size={24} className="text-ink shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="text-ink block underline-offset-4 group-hover/doc:underline">
                              {document.title}
                            </span>
                            <span className="text-grey tabular block text-small">
                              PDF, {formatFileSize(document.size, locale)}
                            </span>
                          </span>
                          <span className="text-cyan-ink shrink-0 text-small">{text.download}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {product.video ? (
        <section aria-labelledby="product-video" className="surface-navy">
          <div className="gap-x-column container-page grid gap-y-10 py-section lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="text-label text-cyan uppercase">
                {product.brand?.name ?? dict.meta.siteName}
              </p>
              <LineReveal id="product-video" text={text.video} className="mt-4 text-h2" />
            </div>
            <Reveal className="lg:col-span-8">
              <ProductVideo
                video={
                  product.video.kind === "file"
                    ? {
                        kind: "file",
                        src: product.video.src,
                        type: product.video.type,
                        poster: product.video.poster ?? cover,
                      }
                    : {
                        kind: "link",
                        url: product.video.url,
                        poster: product.video.poster ?? cover,
                      }
                }
                title={fill(text.videoTitle, { name: product.name })}
                playLabel={text.videoPlay}
                openLabel={text.videoOpen}
              />
            </Reveal>
          </div>
        </section>
      ) : null}

      {related.length ? (
        <section aria-labelledby="product-related" className="container-page py-section">
          <div className="gap-x-column grid gap-y-4 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <p className="text-label text-cyan-ink uppercase">{dict.catalog.eyebrow}</p>
              <LineReveal id="product-related" text={text.related} className="mt-4 text-h2" />
            </div>
            {product.category ? (
              <Link
                href={product.category.href}
                className="group/link text-cyan-ink hover:text-ink inline-flex min-h-11 items-center gap-2 text-small underline decoration-1 underline-offset-4 lg:col-span-4 lg:justify-self-end"
              >
                {product.category.name}
                <ArrowRightIcon
                  size={16}
                  className="transition-transform duration-200 group-hover/link:translate-x-1"
                />
              </Link>
            ) : null}
          </div>
          <ProductGrid products={related} moreLabel={dict.common.more} className="mt-12" />
        </section>
      ) : null}

      <ConsultationSection
        id="consultation"
        locale={locale}
        dict={dict}
        title={text.quoteTitle}
        intro={text.quoteIntro}
        products={[
          {
            id: product.id,
            name: product.name,
            image: cover ? { src: cover.src, alt: cover.alt } : null,
          },
        ]}
      />

      <QuoteBar
        name={product.name}
        label={text.requestQuote}
        href="#consultation"
        after="product-cta"
        before="consultation"
      />

      <JsonLdScript
        data={productJsonLd(
          {
            name: product.name,
            url: path,
            images: product.images.map((image) => image.src),
            description:
              summarize(richTextToPlain(product.shortDescription ?? product.description)) || null,
            category: product.category?.name ?? null,
            sku: product.sku,
            brand: product.brand?.name ?? null,
            specs: product.specs.map((spec) => ({
              name: spec.label,
              value: spec.value,
              unit: spec.unit,
            })),
            documents: product.documents.map((document) => ({
              name: document.title,
              url: document.href,
            })),
          },
          env.NEXT_PUBLIC_SITE_URL,
        )}
      />
    </>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ConsultationSection } from "@/components/site/consultation/consultation-section";
import { JsonLdScript } from "@/components/site/json-ld";
import { PageHeading } from "@/components/site/page-heading";
import { ProductGrid } from "@/components/site/product-card";
import { RichText } from "@/components/site/rich-text";
import { richTextToPlain, summarize } from "@/lib/content/rich-text";
import { env } from "@/lib/env";
import { localePath } from "@/lib/i18n/config";
import { fill } from "@/lib/i18n/format";
import { getRequestDictionary } from "@/lib/i18n/server";
import { getProductBySlug, getRelatedProducts } from "@/lib/public/product";
import { localizedPaths, redirectToCanonicalSlug } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { productJsonLd } from "@/lib/seo/json-ld";
import { entityInfo } from "@/lib/seo/corpus";
import { pageMetadata } from "@/lib/seo/metadata";
import { markdownHref } from "@/lib/seo/rewrites";
import { describeEntity } from "@/lib/seo/text";
import { formatFileSize } from "@/lib/validation/media";

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

export default async function ProductPage({ params }: PageProps<"/[locale]/mehsul/[slug]">) {
  await connection();
  const [{ slug }, { locale, dict }] = await Promise.all([params, getRequestDictionary()]);
  const product = await getProductBySlug(locale, slug);
  if (!product) notFound();
  redirectToCanonicalSlug(product.slug, locale, slug, routes.product);
  const related = await getRelatedProducts(locale, product.id, product.category?.id ?? null);
  const path = localePath(locale, routes.product(slug));
  const [cover, ...gallery] = product.images;

  return (
    <>
      <PageHeading
        title={product.name}
        breadcrumbLabel={dict.common.breadcrumb}
        breadcrumbs={[
          { label: dict.common.home, href: localePath(locale) },
          { label: dict.catalog.title, href: localePath(locale, routes.catalogue()) },
          ...(product.category
            ? [{ label: product.category.name, href: product.category.href }]
            : []),
          { label: product.name, href: path },
        ]}
      >
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-small">
          {product.brand ? (
            <div className="flex gap-2">
              <dt className="text-ink-muted">{dict.product.brand}</dt>
              <dd>{product.brand.name}</dd>
            </div>
          ) : null}
          {product.sku ? (
            <div className="flex gap-2">
              <dt className="text-ink-muted">{dict.product.model}</dt>
              <dd>{product.sku}</dd>
            </div>
          ) : null}
        </dl>
      </PageHeading>

      <div className="container-page grid gap-10 py-section lg:grid-cols-2">
        {cover ? (
          <Image
            src={cover.src}
            alt={cover.alt}
            width={cover.width}
            height={cover.height}
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
            className="bg-mist h-auto w-full object-contain"
          />
        ) : null}
        <div className="flex flex-col gap-8">
          {product.shortDescription ? <RichText doc={product.shortDescription} /> : null}
          {product.benefits.length ? (
            <section aria-labelledby="product-benefits">
              <h2 id="product-benefits" className="text-h3">
                {dict.product.benefits}
              </h2>
              <ul className="mt-4 list-disc pl-5">
                {product.benefits.map((benefit) => (
                  <li key={benefit}>{benefit}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <div className="container-page flex flex-col gap-section pb-section">
        {product.description ? <RichText doc={product.description} className="max-w-3xl" /> : null}

        {product.specs.length ? (
          <section aria-labelledby="product-specs">
            <h2 id="product-specs" className="text-h2">
              {dict.product.specs}
            </h2>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-small">
                <thead>
                  <tr className="border-b border-line-strong">
                    <th scope="col" className="py-3 pr-4 font-semibold">
                      {dict.product.parameter}
                    </th>
                    <th scope="col" className="py-3 font-semibold">
                      {dict.product.value}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {product.specs.map((spec, index) => (
                    <tr key={`${spec.label}-${index}`} className="border-b border-line">
                      <th scope="row" className="text-ink-muted py-3 pr-4 font-normal">
                        {spec.label}
                      </th>
                      <td className="py-3">
                        {spec.unit ? `${spec.value} ${spec.unit}` : spec.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {product.video ? (
          <section aria-labelledby="product-video">
            <h2 id="product-video" className="text-h2">
              {dict.product.video}
            </h2>
            {product.video.kind === "file" ? (
              <video
                controls
                playsInline
                preload="metadata"
                poster={product.video.poster?.src}
                className="mt-6 h-auto w-full"
              >
                <source src={product.video.src} type={product.video.type} />
              </video>
            ) : (
              <a
                href={product.video.url}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-block text-navy underline decoration-cyan underline-offset-4"
              >
                {product.video.url}
              </a>
            )}
          </section>
        ) : null}

        {product.documents.length ? (
          <section aria-labelledby="product-documents">
            <h2 id="product-documents" className="text-h2">
              {dict.product.documents}
            </h2>
            <ul className="mt-6 flex flex-col gap-2">
              {product.documents.map((document) => (
                <li key={document.href}>
                  <a
                    href={document.href}
                    download
                    className="inline-flex min-h-11 items-center gap-3 text-navy underline decoration-cyan underline-offset-4"
                  >
                    {document.title}
                    <span className="text-ink-muted text-small no-underline">
                      PDF, {formatFileSize(document.size)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {gallery.length ? (
          <section aria-labelledby="product-gallery">
            <h2 id="product-gallery" className="text-h2">
              {dict.product.gallery}
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((image) => (
                <li key={image.src}>
                  <Image
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="bg-mist h-auto w-full object-contain"
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {related.length ? (
          <section aria-labelledby="product-related">
            <h2 id="product-related" className="text-h2">
              {dict.product.related}
            </h2>
            <div className="mt-6">
              <ProductGrid products={related} />
            </div>
          </section>
        ) : null}
      </div>

      <ConsultationSection
        locale={locale}
        dict={dict}
        products={[
          {
            id: product.id,
            name: product.name,
            image: cover ? { src: cover.src, alt: cover.alt } : null,
          },
        ]}
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

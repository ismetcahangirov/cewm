import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ArrowLink } from "@/components/site/arrow-link";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { fill } from "@/components/site/catalog/listing-grid";
import { CtaBand } from "@/components/site/cta-band";
import { Eyebrow } from "@/components/site/eyebrow";
import { ProductGallery } from "@/components/site/gallery/product-gallery";
import { JsonLdScript } from "@/components/site/json-ld";
import { pill } from "@/components/site/pill";
import { ProductCard } from "@/components/site/product-card";
import { ModelPreview } from "@/components/site/product/model-preview";
import { ProductSubnav, type SubnavLink } from "@/components/site/product/product-subnav";
import { SpecList } from "@/components/site/product/spec-list";
import { RichText } from "@/components/site/rich-text";
import { ScrollRow } from "@/components/site/scroll-row";
import { richTextToPlain, summarize } from "@/lib/content/rich-text";
import { cx } from "@/lib/cx";
import { env } from "@/lib/env";
import { localePath } from "@/lib/i18n/config";
import { getRequestDictionary } from "@/lib/i18n/server";
import { productHref } from "@/lib/public/catalog";
import { getPageLinks } from "@/lib/public/home";
import { getProductBySlug, getRelatedProducts, type ProductDetail } from "@/lib/public/product";
import { localizedPaths, redirectToCanonicalSlug } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { productJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";

const sectionIds = { features: "xususiyyetler", gallery: "qalereya", related: "oxsar" };

function plainDescription(product: ProductDetail): string | null {
  const text = richTextToPlain(product.shortDescription) || richTextToPlain(product.description);
  return text ? summarize(text) : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/mehsul/[slug]">): Promise<Metadata> {
  await connection();
  const [{ slug }, { locale, dict }] = await Promise.all([params, getRequestDictionary()]);
  const product = await getProductBySlug(locale, slug);
  if (!product) notFound();
  redirectToCanonicalSlug(product.slug, locale, slug, routes.product);
  return pageMetadata({
    locale,
    title: product.seoTitle ?? product.name,
    absoluteTitle: Boolean(product.seoTitle),
    description:
      product.seoDescription ??
      plainDescription(product) ??
      fill(dict.seo.description.product, { name: product.name }),
    paths: localizedPaths(product.slug, routes.product),
    image: product.images[0] ?? null,
    eyebrow: product.category?.name ?? dict.catalog.title,
  });
}

async function ProductContent({ params }: Pick<PageProps<"/[locale]/mehsul/[slug]">, "params">) {
  await connection();
  const [{ slug }, { locale, dict }] = await Promise.all([params, getRequestDictionary()]);
  const product = await getProductBySlug(locale, slug);
  if (!product) notFound();
  redirectToCanonicalSlug(product.slug, locale, slug, routes.product);

  const [related, links] = await Promise.all([
    getRelatedProducts(locale, product.id, product.category?.id ?? null),
    getPageLinks(locale),
  ]);
  const quoteHref = links.quote ?? null;
  const quote = quoteHref
    ? { href: `${quoteHref}?mehsul=${product.id}`, label: dict.common.requestQuote }
    : null;
  const text = dict.product;
  const url = productHref(product.slug, locale);
  const subnavLinks: SubnavLink[] = [
    { id: sectionIds.features, label: text.features },
    ...(product.images.length ? [{ id: sectionIds.gallery, label: text.gallery }] : []),
    ...(related.length ? [{ id: sectionIds.related, label: text.related }] : []),
  ];

  return (
    <article>
      <JsonLdScript
        data={productJsonLd(
          {
            name: product.name,
            url,
            images: product.images.map((image) => image.src),
            description: plainDescription(product),
            category: product.category?.name ?? null,
            sku: product.sku,
          },
          env.NEXT_PUBLIC_SITE_URL,
        )}
      />
      <header className="container-page pt-15 pb-15">
        <Breadcrumbs
          label={dict.common.breadcrumb}
          items={[
            { label: dict.common.home, href: localePath(locale) },
            { label: text.products, href: localePath(locale, routes.catalogue()) },
            ...(product.category
              ? [{ label: product.category.name, href: product.category.href }]
              : []),
            { label: product.name },
          ]}
        />
        <h1 className="mt-2.5 text-h1">{product.name}</h1>
        {(product.category || product.sku) && (
          <div className="mt-5 flex flex-wrap items-center gap-x-10 gap-y-2">
            {product.category && (
              <Eyebrow>
                <Link
                  href={product.category.href}
                  className="inline-flex min-h-11 items-center transition-colors duration-200 hover:text-black"
                >
                  {product.category.name}
                </Link>
              </Eyebrow>
            )}
            {product.sku && (
              <p className="text-meta text-muted">
                {text.model}: {product.sku}
              </p>
            )}
          </div>
        )}
      </header>

      <ProductSubnav name={product.name} label={text.sections} links={subnavLinks} quote={quote} />

      <div className="container-page mt-12 grid grid-cols-1 gap-y-12 lg:mt-15 lg:grid-cols-12 lg:gap-x-7.5">
        {product.images.length > 0 && (
          <section
            id={sectionIds.gallery}
            aria-label={text.photos}
            className="scroll-mt-44 lg:sticky lg:top-48 lg:col-span-5 lg:self-start lg:header-hidden:top-28"
          >
            <ProductGallery
              images={product.images}
              labels={{
                dialog: text.viewer,
                close: dict.common.close,
                previous: dict.common.previous,
                next: dict.common.next,
                photos: text.photos,
                photo: text.photo,
                open: text.openPhoto,
              }}
            />
          </section>
        )}
        <section
          id={sectionIds.features}
          aria-labelledby="product-features"
          className={cx(
            "scroll-mt-44 lg:col-span-6",
            product.images.length > 0 && "lg:col-start-7",
          )}
        >
          <h2 id="product-features" className="sr-only">
            {text.features}
          </h2>
          <RichText doc={product.shortDescription} imageAlt={product.name} className="text-lead" />
          <RichText
            doc={product.description}
            imageAlt={product.name}
            className="mt-8"
            headingOffset={1}
          />
          {product.specs.length > 0 && (
            <>
              <h3 className="mt-12 text-h4">{text.specs}</h3>
              <SpecList rows={product.specs} className="mt-5 border-t border-line-strong" />
            </>
          )}
          {quote && (
            <Link href={quote.href} className={pill({ variant: "filled", className: "mt-10" })}>
              {quote.label}
            </Link>
          )}
          {product.model3d && (
            <div className="mt-12">
              <ModelPreview
                src={product.model3d.src}
                poster={product.model3d.poster}
                name={`${product.name}, ${text.model3d}`}
                label={text.view3d}
              />
            </div>
          )}
        </section>
      </div>

      {related.length > 0 && (
        <section
          id={sectionIds.related}
          aria-labelledby="related-products"
          className="mt-section scroll-mt-44 bg-sand py-section"
        >
          <div className="container-page">
            <h2 id="related-products" className="text-h3">
              {text.related}
            </h2>
            <ScrollRow
              label={text.related}
              previousLabel={dict.common.previous}
              nextLabel={dict.common.next}
              className="mt-10"
            >
              {related.map((item) => (
                <li
                  key={item.id}
                  className="w-4/5 shrink-0 snap-start pr-5 sm:w-1/2 sm:pr-7.5 lg:w-1/4"
                >
                  <ProductCard product={item} tone="tint" />
                </li>
              ))}
            </ScrollRow>
            {product.category && (
              <ArrowLink href={product.category.href} className="mt-10">
                {dict.common.viewAllIn}: {product.category.name}
              </ArrowLink>
            )}
          </div>
        </section>
      )}

      <CtaBand dict={dict} quoteHref={quoteHref} />
    </article>
  );
}

export default function ProductPage(props: PageProps<"/[locale]/mehsul/[slug]">) {
  return <ProductContent params={props.params} />;
}

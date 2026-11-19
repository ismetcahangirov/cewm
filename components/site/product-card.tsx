import Image from "next/image";
import Link from "next/link";

import { ArrowRightIcon } from "@/components/icons/iconsax";
import { cx } from "@/lib/cx";
import type { ProductCardItem } from "@/lib/public/catalog";

export const productCardSizes =
  "(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

export function ProductCard({
  product,
  headingLevel = "h3",
  moreLabel,
}: {
  product: ProductCardItem;
  headingLevel?: "h2" | "h3";
  moreLabel?: string;
}) {
  const Heading = headingLevel;
  return (
    <article
      className={cx("group/card relative flex h-full flex-col", product.image && "machine-card")}
    >
      {product.image ? (
        <div className="bg-mist relative aspect-video overflow-clip">
          <Image
            src={product.image.src}
            alt={product.image.alt}
            fill
            sizes={productCardSizes}
            className="machine-card-photo object-cover"
          />
        </div>
      ) : (
        <div aria-hidden="true" className="h-px bg-line" />
      )}
      <div className="machine-card-body flex flex-1 flex-col pt-5">
        {product.brand || product.category ? (
          <p className="text-label text-grey uppercase">
            {product.brand}
            {product.category ? (
              <span className={product.image ? "max-sm:hidden" : undefined}>
                {product.brand ? " · " : ""}
                {product.category}
              </span>
            ) : null}
          </p>
        ) : null}
        <Heading className="machine-card-title text-safe mt-2 text-h4">
          <Link
            href={product.href}
            className="decoration-1 underline-offset-4 group-hover/card:underline after:absolute after:inset-0"
          >
            {product.name}
          </Link>
        </Heading>
        {moreLabel ? (
          <span
            aria-hidden="true"
            className="machine-card-more text-cyan-ink mt-auto inline-flex items-center gap-2 pt-4 text-small"
          >
            {moreLabel}
            <ArrowRightIcon
              size={16}
              className="transition-transform duration-200 ease-standard group-hover/card:translate-x-1"
            />
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  headingLevel,
  moreLabel,
  className,
}: {
  products: ProductCardItem[];
  headingLevel?: "h2" | "h3";
  moreLabel?: string;
  className?: string;
}) {
  return (
    <ul
      data-reveal-group=""
      className={cx(
        "gap-x-column grid gap-y-8 sm:grid-cols-2 sm:gap-y-12 lg:grid-cols-3 2xl:grid-cols-4",
        className,
      )}
    >
      {products.map((product) => (
        <li key={product.id} data-reveal="">
          <ProductCard product={product} headingLevel={headingLevel} moreLabel={moreLabel} />
        </li>
      ))}
    </ul>
  );
}

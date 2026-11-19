import Image from "next/image";
import Link from "next/link";

import type { PublicImage } from "@/lib/public/images";
import { blurPlaceholder } from "@/lib/public/blur";

export type ProductCardData = {
  model: string;
  type: string | null;
  category: string | null;
  href: string;
  image: PublicImage | null;
  hoverImage: PublicImage | null;
};

const sizes = "(min-width: 1024px) 31vw, (min-width: 768px) 48vw, 100vw";

export function ProductCard({
  product,
  headingLevel = 3,
  tone = "white",
  priority = false,
}: {
  product: ProductCardData;
  headingLevel?: 2 | 3;
  tone?: "white" | "tint";
  priority?: boolean;
}) {
  const meta = product.type ?? product.category;
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <Link href={product.href} className="group block">
      <div className="relative aspect-square overflow-hidden bg-surface">
        {product.image && (
          <Image
            src={product.image.src}
            alt={product.image.alt}
            fill
            sizes={sizes}
            priority={priority}
            {...blurPlaceholder(product.image)}
            className={
              product.hoverImage
                ? "object-contain mix-blend-multiply transition-opacity duration-400 lg:group-hover:opacity-0 lg:group-focus-visible:opacity-0"
                : "object-contain mix-blend-multiply"
            }
          />
        )}
        {product.hoverImage && (
          <Image
            src={product.hoverImage.src}
            alt=""
            fill
            sizes={sizes}
            className="hidden object-contain opacity-0 mix-blend-multiply transition-opacity duration-400 group-hover:opacity-100 group-focus-visible:opacity-100 lg:block"
          />
        )}
      </div>
      <Heading className="mt-7.5 text-card font-text text-heading">{product.model}</Heading>
      {meta && (
        <p className={tone === "tint" ? "text-meta text-graphite" : "text-meta text-muted"}>
          {meta}
        </p>
      )}
    </Link>
  );
}

import Image from "next/image";
import Link from "next/link";

import type { ProductCardItem } from "@/lib/public/catalog";

export function ProductCard({ product }: { product: ProductCardItem }) {
  return (
    <Link href={product.href} className="group flex flex-col border border-line bg-white">
      <span className="bg-mist relative block aspect-[4/3]">
        {product.image ? (
          <Image
            src={product.image.src}
            alt={product.image.alt}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain p-4"
          />
        ) : null}
      </span>
      <span className="flex flex-col gap-1 p-4">
        {product.brand || product.category ? (
          <span className="text-ink-muted text-small">
            {[product.brand, product.category].filter(Boolean).join(" · ")}
          </span>
        ) : null}
        <span className="group-hover:text-cyan-ink text-h4 text-navy">{product.name}</span>
      </span>
    </Link>
  );
}

export function ProductGrid({ products }: { products: ProductCardItem[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <li key={product.id} className="flex">
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

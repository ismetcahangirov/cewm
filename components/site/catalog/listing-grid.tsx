import Link from "next/link";

import { ProductCard } from "@/components/site/product-card";
import { pill } from "@/components/site/pill";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ProductCardItem } from "@/lib/public/catalog";

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export function ListingGrid({
  items,
  total,
  shown,
  page,
  pageCount,
  basePath,
  dict,
}: {
  items: ProductCardItem[];
  total: number;
  shown: number;
  page: number;
  pageCount: number;
  basePath: string;
  dict: Dictionary;
}) {
  if (!items.length) {
    return <p className="mt-10 text-muted">{dict.catalog.empty}</p>;
  }
  return (
    <>
      <ul
        aria-label={dict.catalog.productsLabel}
        className="mt-10 grid gap-7.5 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-15"
      >
        {items.map((product, index) => (
          <li key={product.id}>
            <ProductCard product={product} headingLevel={2} priority={index === 0} />
          </li>
        ))}
      </ul>
      <div className="mt-section flex flex-col items-center gap-4">
        <p className="text-meta text-muted">{fill(dict.catalog.count, { shown, total })}</p>
        <div className="h-0.5 w-20 bg-chip" role="presentation">
          <div className="h-full bg-graphite" style={{ width: `${(shown / total) * 100}%` }} />
        </div>
        {page < pageCount && (
          <Link
            href={`${basePath}?page=${page + 1}`}
            scroll={false}
            className={pill({ variant: "outline" })}
          >
            {dict.catalog.loadMore}
          </Link>
        )}
      </div>
    </>
  );
}

export { fill };

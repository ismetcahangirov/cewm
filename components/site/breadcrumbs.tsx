import Link from "next/link";

import { env } from "@/lib/env";
import { cx } from "@/lib/cx";
import { breadcrumbJsonLd, type BreadcrumbItem } from "@/lib/seo/json-ld";

import { JsonLdScript } from "./json-ld";

export function Breadcrumbs({
  items,
  label,
  tone = "muted",
  className,
}: {
  items: BreadcrumbItem[];
  label: string;
  tone?: "muted" | "light";
  className?: string;
}) {
  const last = items.length - 1;
  return (
    <>
      <nav aria-label={label} className={cx("text-meta", className)}>
        <ol
          className={cx(
            "flex flex-wrap items-center",
            tone === "light" ? "text-white" : "text-muted",
          )}
        >
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`} className="flex items-center">
              {index > 0 && (
                <span aria-hidden="true" className="mx-2">
                  /
                </span>
              )}
              {item.href && index !== last ? (
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center transition-colors duration-200 hover:text-black"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={index === last ? "page" : undefined}>{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLdScript data={breadcrumbJsonLd(items, env.NEXT_PUBLIC_SITE_URL)} />
    </>
  );
}

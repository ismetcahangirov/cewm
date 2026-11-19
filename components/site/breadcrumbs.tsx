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
  const compact = items.length > 3;
  return (
    <>
      <nav aria-label={label} className={cx("text-small", className)}>
        <ol
          className={cx(
            "flex flex-wrap items-center",
            tone === "light" ? "text-white" : "text-ink-muted",
          )}
        >
          {items.map((item, index) => (
            <li
              key={`${item.label}-${index}`}
              className={cx(
                "flex items-center",
                ((compact && index === 0) || (index === last && last > 0)) && "max-md:hidden",
              )}
            >
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={cx("mx-2", compact && index === 1 && "max-md:hidden")}
                >
                  /
                </span>
              )}
              {item.href && index !== last ? (
                <Link
                  href={item.href}
                  prefetch={false}
                  className="hover:text-ink inline-flex min-h-11 min-w-11 items-center transition-colors duration-200"
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

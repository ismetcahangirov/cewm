import Link from "next/link";

import { ArrowRightIcon } from "@/components/icons/iconsax";
import { cx } from "@/lib/cx";

import { button, buttonArrow } from "./button";

export function EmptyState({
  title,
  body,
  actions,
  className,
}: {
  title: string;
  body?: string;
  actions: { label: string; href: string }[];
  className?: string;
}) {
  return (
    <div
      className={cx(
        "surface-mist gap-x-column grid gap-y-6 px-6 py-12 sm:px-10 lg:grid-cols-12 lg:py-16",
        className,
      )}
    >
      <div className="lg:col-span-7">
        <p className="text-h3">{title}</p>
        {body ? <p className="text-ink-muted mt-4">{body}</p> : null}
      </div>
      {actions.length ? (
        <div className="flex flex-wrap gap-3 lg:col-span-5 lg:items-end lg:justify-end">
          {actions.map((action, index) => (
            <Link
              key={action.href}
              href={action.href}
              className={button({ variant: index === actions.length - 1 ? "filled" : "outline" })}
            >
              {action.label}
              {index === actions.length - 1 ? (
                <ArrowRightIcon size={20} className={buttonArrow} />
              ) : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

import { ArrowRightIcon } from "@/components/icons/iconsax";
import Link from "next/link";
import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

export function ArrowLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "group inline-flex min-h-11 items-center gap-3.75 text-small text-graphite",
        className,
      )}
    >
      <ArrowRightIcon
        aria-hidden="true"
        className="size-4 transition-transform duration-300 group-hover:translate-x-1"
      />
      {children}
    </Link>
  );
}

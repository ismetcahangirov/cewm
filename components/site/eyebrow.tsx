import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

export function Eyebrow({
  children,
  dotClassName,
  className,
}: {
  children: ReactNode;
  dotClassName?: string;
  className?: string;
}) {
  return (
    <p className={cx("flex items-center gap-5 text-base", className)}>
      <span
        aria-hidden="true"
        className={cx("size-2.5 shrink-0 rounded-full", dotClassName ?? "bg-graphite")}
      />
      {children}
    </p>
  );
}

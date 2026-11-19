import Link from "next/link";

import { cx } from "@/lib/cx";

export type Chip = { key: string; label: string; href: string; current?: boolean; count?: number };

export function ChipNav({
  label,
  heading,
  chips,
  className,
}: {
  label: string;
  heading?: string;
  chips: Chip[];
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cx("flex flex-col gap-3", className)}>
      {heading ? <p className="text-label text-grey uppercase">{heading}</p> : null}
      <ul className="chip-scroll -mx-gutter px-gutter flex gap-2 overflow-x-auto pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        {chips.map((chip) => (
          <li key={chip.key} className="shrink-0">
            <Link
              href={chip.href}
              aria-current={chip.current ? "page" : undefined}
              className={cx(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-small whitespace-nowrap transition-colors duration-200 ease-standard",
                chip.current
                  ? "bg-cyan-ink border-cyan-ink text-white"
                  : "text-ink hover:border-ink border-line-strong",
              )}
            >
              {chip.label}
              {chip.count !== undefined ? (
                <span className={cx("tabular", chip.current ? "text-white" : "text-grey")}>
                  {chip.count}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

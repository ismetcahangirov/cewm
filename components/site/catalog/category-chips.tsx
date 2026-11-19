import { ChevronLeftIcon } from "@/components/icons/iconsax";
import Image from "next/image";
import Link from "next/link";

import { cx } from "@/lib/cx";
import type { PublicImage } from "@/lib/public/images";
import { blurPlaceholder } from "@/lib/public/blur";

export type CategoryChip = { id: string; name: string; href: string; image: PublicImage | null };

const chipClass =
  "flex h-31 w-46 flex-col items-center justify-center gap-2 rounded-sm border-2 bg-white px-3 text-center shadow-chip transition-colors duration-200";

export function CategoryChips({
  label,
  first,
  chips,
  activeId,
}: {
  label: string;
  first: { name: string; href: string; active: boolean; back: boolean };
  chips: CategoryChip[];
  activeId?: string;
}) {
  return (
    <nav aria-label={label} className="-mx-5 overflow-x-auto px-5 sm:-mx-7.5 sm:px-7.5">
      <ul className="flex w-max gap-3.75 py-2.5">
        <li>
          <Link
            href={first.href}
            aria-current={first.active ? "page" : undefined}
            className={cx(
              chipClass,
              first.active ? "border-graphite" : "border-transparent hover:border-line",
            )}
          >
            {first.back && <ChevronLeftIcon aria-hidden="true" className="size-4" />}
            <span className={cx("text-meta", first.active && "font-medium")}>{first.name}</span>
          </Link>
        </li>
        {chips.map((chip) => {
          const active = chip.id === activeId;
          return (
            <li key={chip.id}>
              <Link
                href={chip.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  chipClass,
                  active ? "border-graphite" : "border-transparent hover:border-line",
                )}
              >
                <span className="relative block h-15 w-full">
                  {chip.image && (
                    <Image
                      src={chip.image.src}
                      alt=""
                      fill
                      sizes="184px"
                      {...blurPlaceholder(chip.image)}
                      className="object-contain mix-blend-multiply"
                    />
                  )}
                </span>
                <span className={cx("line-clamp-1 text-meta", active && "font-medium")}>
                  {chip.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

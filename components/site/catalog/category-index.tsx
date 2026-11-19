"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons/iconsax";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { PublicImage } from "@/lib/public/images";
import type { PublicMenuItem } from "@/lib/public/menus";
import { blurPlaceholder } from "@/lib/public/blur";

type Labels = {
  back: string;
  viewAllIn: string;
  allProducts: string;
  projects: string;
  catalogue: string;
};

export function CategoryIndex({
  items,
  images,
  labels,
  allProductsHref,
  projectsHref,
  catalogueHref,
}: {
  items: PublicMenuItem[];
  images: Record<string, PublicImage>;
  labels: Labels;
  allProductsHref: string;
  projectsHref: string;
  catalogueHref: string | null;
}) {
  const [branch, setBranch] = useState<PublicMenuItem | null>(null);
  const firstImageHref = items.find((child) => child.href && child.href in images)?.href;
  const [activeHref, setActiveHref] = useState<string | null>(firstImageHref ?? null);
  const listRef = useRef<HTMLUListElement>(null);
  const moved = useRef(false);
  const list = branch ? branch.children : items;
  const image = activeHref ? images[activeHref] : undefined;

  useEffect(() => {
    if (!moved.current) return;
    listRef.current?.querySelector<HTMLElement>("a, button")?.focus();
  }, [branch]);

  const open = (next: PublicMenuItem | null) => {
    moved.current = true;
    setBranch(next);
  };

  return (
    <div className="grid lg:grid-cols-12">
      <div className="hidden bg-cream lg:col-span-5 lg:block" aria-hidden="true">
        <div className="sticky top-20 p-7.5 pt-12.5">
          <div className="relative aspect-square w-4/5 max-w-121 bg-surface">
            {image && (
              <Image
                key={image.src}
                src={image.src}
                alt=""
                fill
                priority
                fetchPriority="high"
                sizes="(min-width: 1024px) 485px, 0px"
                {...blurPlaceholder(image)}
                className="object-cover motion-safe:animate-fade-in"
              />
            )}
          </div>
        </div>
      </div>
      <div className="container-page py-10 lg:col-span-7 lg:max-w-none lg:py-12.5 lg:pl-12.5">
        <div key={branch?.id ?? "root"} className="max-w-110 motion-safe:animate-panel-in">
          {branch && (
            <div className="mb-6 flex flex-col items-start gap-2">
              <button
                type="button"
                onClick={() => open(null)}
                className="inline-flex min-h-11 items-center gap-2.5 text-small text-graphite"
              >
                <ChevronLeftIcon aria-hidden="true" className="size-4" />
                {labels.back}
              </button>
              {branch.href && (
                <Link href={branch.href} className="text-small text-graphite underline">
                  {labels.viewAllIn}: {branch.label}
                </Link>
              )}
            </div>
          )}
          <ul ref={listRef} className="flex flex-col gap-1.5">
            {list.map((child) => {
              const hover = () => child.href && child.href in images && setActiveHref(child.href);
              if (child.children.length) {
                return (
                  <li key={child.id}>
                    <button
                      type="button"
                      onClick={() => open(child)}
                      onMouseEnter={hover}
                      onFocus={hover}
                      className="flex min-h-11 w-full items-center justify-between gap-6 text-left text-h4 transition-opacity duration-200 hover:opacity-70 lg:text-menu"
                    >
                      {child.label}
                      <ChevronRightIcon aria-hidden="true" className="size-5" />
                    </button>
                  </li>
                );
              }
              return (
                <li key={child.id}>
                  <Link
                    href={child.href ?? "#"}
                    onMouseEnter={hover}
                    onFocus={hover}
                    className="flex min-h-11 items-center text-h4 transition-opacity duration-200 hover:opacity-70 lg:text-menu"
                  >
                    {child.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <ul className="mt-15 flex flex-col">
            <li>
              <Link href={allProductsHref} className="flex min-h-11 items-center text-base">
                {labels.allProducts}
              </Link>
            </li>
            <li>
              <Link href={projectsHref} className="flex min-h-11 items-center text-base">
                {labels.projects}
              </Link>
            </li>
            {catalogueHref && (
              <li>
                <a href={catalogueHref} className="flex min-h-11 items-center text-base">
                  {labels.catalogue}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

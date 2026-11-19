"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { useDragScroll } from "@/components/site/use-drag-scroll";
import { cx } from "@/lib/cx";
import { blurPlaceholder } from "@/lib/public/blur";

import { Lightbox, type LightboxImage, type LightboxLabels } from "./lightbox";

export type ProductGalleryLabels = LightboxLabels & {
  photos: string;
  photo: string;
  open: string;
};

export function ProductGallery({
  images,
  labels,
}: {
  images: LightboxImage[];
  labels: ProductGalleryLabels;
}) {
  const stripRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const total = images.length;
  useDragScroll(stripRef);

  const handleScroll = () => {
    const strip = stripRef.current;
    if (!strip || !strip.clientWidth) return;
    const next = Math.round(strip.scrollLeft / strip.clientWidth);
    if (next !== active) setActive(Math.min(Math.max(next, 0), total - 1));
  };

  const select = (index: number) => {
    const strip = stripRef.current;
    setActive(index);
    if (!strip) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollTo({ left: index * strip.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };

  const handleIndexChange = (index: number) => {
    setOpen(index);
    select(index);
  };

  return (
    <div>
      <ul
        ref={stripRef}
        aria-label={labels.photos}
        onScroll={handleScroll}
        className={cx(
          "no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain data-dragging:select-none",
          total > 1 && "data-dragging:cursor-grabbing",
        )}
      >
        {images.map((image, index) => (
          <li
            key={image.src}
            className="relative aspect-square w-full shrink-0 snap-center bg-surface"
          >
            <button
              type="button"
              onClick={() => setOpen(index)}
              aria-label={total > 1 ? `${labels.open}, ${index + 1} / ${total}` : labels.open}
              className="absolute inset-0 cursor-zoom-in"
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                draggable={false}
                priority={index === 0}
                fetchPriority={index === 0 ? "high" : "low"}
                {...blurPlaceholder(image)}
                className="object-contain mix-blend-multiply"
              />
            </button>
          </li>
        ))}
      </ul>
      {total > 1 && (
        <>
          <ul className="mt-2 hidden flex-wrap gap-2 md:flex">
            {images.map((image, index) => (
              <li key={image.src}>
                <button
                  type="button"
                  onClick={() => select(index)}
                  aria-label={`${labels.photo} ${index + 1}`}
                  aria-current={index === active ? "true" : undefined}
                  className={cx(
                    "relative block size-18 bg-surface outline-offset-0",
                    index === active && "outline outline-graphite",
                  )}
                >
                  <Image
                    src={image.src}
                    alt=""
                    fill
                    sizes="72px"
                    {...blurPlaceholder(image)}
                    className="object-contain mix-blend-multiply"
                  />
                </button>
              </li>
            ))}
          </ul>
          <div aria-hidden="true" className="mt-4 flex justify-center gap-2 md:hidden">
            {images.map((image, index) => (
              <span
                key={image.src}
                className={cx(
                  "size-1.5 rounded-full transition-colors duration-300",
                  index === active ? "bg-graphite" : "bg-chip",
                )}
              />
            ))}
          </div>
        </>
      )}
      <Lightbox
        images={images}
        index={open}
        labels={labels}
        onIndexChange={handleIndexChange}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}

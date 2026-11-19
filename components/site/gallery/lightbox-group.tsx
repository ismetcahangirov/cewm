"use client";

import { useState, type MouseEvent, type ReactNode } from "react";

import { Lightbox, type LightboxImage, type LightboxLabels } from "./lightbox";

export function LightboxGroup({
  images,
  labels,
  children,
  className,
}: {
  images: LightboxImage[];
  labels: LightboxLabels;
  children: ReactNode;
  className?: string;
}) {
  const [index, setIndex] = useState<number | null>(null);

  const openFrom = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest<HTMLElement>("[data-lightbox-index]");
    if (!trigger || !event.currentTarget.contains(trigger)) return;
    const value = Number(trigger.dataset.lightboxIndex);
    if (Number.isInteger(value) && value >= 0 && value < images.length) setIndex(value);
  };

  return (
    <div className={className} onClick={openFrom}>
      {children}
      <Lightbox
        images={images}
        index={index}
        labels={labels}
        onIndexChange={setIndex}
        onClose={() => setIndex(null)}
      />
    </div>
  );
}

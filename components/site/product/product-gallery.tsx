"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import {
  ArrowLeft2Icon,
  ArrowRight2Icon,
  CloseIcon,
  Maximize4Icon,
} from "@/components/icons/iconsax";
import { cx } from "@/lib/cx";
import { fill } from "@/lib/i18n/format";

export type GalleryImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string | null;
};

export type GalleryLabels = {
  gallery: string;
  open: string;
  close: string;
  previous: string;
  next: string;
  position: string;
};

const stageSizes = "(min-width: 1024px) 80vw, 140vw";

function slideTo(track: HTMLElement | null, index: number, instant = false) {
  if (!track) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  track.scrollTo({
    left: index * track.clientWidth,
    behavior: instant || reduce ? "instant" : "smooth",
  });
}

function useCurrentSlide(track: React.RefObject<HTMLUListElement | null>, count: number) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const onScroll = () => {
      const index = Math.min(
        count - 1,
        Math.max(0, Math.round(element.scrollLeft / element.clientWidth)),
      );
      setCurrent((previous) => (previous === index ? previous : index));
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, [track, count]);
  return current;
}

function Controls({
  current,
  total,
  labels,
  onStep,
  tone,
}: {
  current: number;
  total: number;
  labels: GalleryLabels;
  onStep: (step: number) => void;
  tone: "light" | "dark";
}) {
  const iconButton = cx(
    "inline-flex size-11 items-center justify-center rounded-full border transition-colors duration-200 ease-standard disabled:cursor-not-allowed disabled:opacity-40",
    tone === "light"
      ? "text-ink hover:border-ink border-line-strong bg-white"
      : "border-white/40 text-white hover:border-white",
  );
  return (
    <div className="flex items-center gap-2">
      <p
        className={cx(
          "tabular min-w-14 text-center text-small",
          tone === "light" ? "text-grey" : "text-on-navy-muted",
        )}
      >
        {fill(labels.position, { current: current + 1, total })}
      </p>
      <button
        type="button"
        className={iconButton}
        aria-label={labels.previous}
        disabled={current === 0}
        onClick={() => onStep(-1)}
      >
        <ArrowLeft2Icon size={20} />
      </button>
      <button
        type="button"
        className={iconButton}
        aria-label={labels.next}
        disabled={current === total - 1}
        onClick={() => onStep(1)}
      >
        <ArrowRight2Icon size={20} />
      </button>
    </div>
  );
}

export function ProductGallery({
  images,
  labels,
}: {
  images: GalleryImage[];
  labels: GalleryLabels;
}) {
  const uid = useId();
  const trackRef = useRef<HTMLUListElement>(null);
  const boxTrackRef = useRef<HTMLUListElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const current = useCurrentSlide(trackRef, images.length);
  const boxCurrent = useCurrentSlide(boxTrackRef, images.length);
  const total = images.length;
  const caption = images[current]?.caption;

  const openBox = (index: number) => {
    openerRef.current = document.activeElement as HTMLElement | null;
    setOpen(true);
    dialogRef.current?.showModal();
    requestAnimationFrame(() => slideTo(boxTrackRef.current, index, true));
  };

  const closeBox = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      setOpen(false);
      const index = Math.round(
        (boxTrackRef.current?.scrollLeft ?? 0) / (boxTrackRef.current?.clientWidth || 1),
      );
      slideTo(trackRef.current, index, true);
      openerRef.current?.focus({ preventScroll: true });
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  const onBoxKey = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "ArrowRight")
      slideTo(boxTrackRef.current, Math.min(total - 1, boxCurrent + 1));
    if (event.key === "ArrowLeft") slideTo(boxTrackRef.current, Math.max(0, boxCurrent - 1));
  };

  if (!total) return null;

  return (
    <div className="product-gallery">
      <div className="relative">
        <ul
          ref={trackRef}
          aria-label={labels.gallery}
          className="gallery-track"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight")
              slideTo(trackRef.current, Math.min(total - 1, current + 1));
            if (event.key === "ArrowLeft") slideTo(trackRef.current, Math.max(0, current - 1));
          }}
        >
          {images.map((image, index) => (
            <li key={image.src} id={`${uid}-slide-${index}`} className="gallery-slide">
              <button
                type="button"
                onClick={() => openBox(index)}
                className="gallery-frame group/zoom"
                style={{ "--w": `${image.width}px` } as CSSProperties}
                aria-label={`${labels.open}: ${image.alt}`}
                tabIndex={index === current ? 0 : -1}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes={stageSizes}
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : undefined}
                  className="object-cover"
                />
                <span
                  aria-hidden="true"
                  className="text-ink absolute right-3 bottom-3 inline-flex size-11 items-center justify-center rounded-full bg-white transition-transform duration-200 ease-standard group-hover/zoom:scale-110"
                >
                  <Maximize4Icon size={20} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <p aria-live="polite" className="text-ink-muted min-h-6 flex-1 basis-60 text-small">
          {caption ?? <span className="sr-only">{images[current]?.alt}</span>}
        </p>
        {total > 1 ? (
          <Controls
            current={current}
            total={total}
            labels={labels}
            tone="light"
            onStep={(step) => slideTo(trackRef.current, current + step)}
          />
        ) : null}
      </div>

      {total > 1 ? (
        <ul className="gallery-thumbs mt-4" aria-label={labels.gallery}>
          {images.map((image, index) => (
            <li key={image.src} className="shrink-0">
              <a
                href={`#${uid}-slide-${index}`}
                aria-label={fill(labels.position, { current: index + 1, total })}
                aria-current={index === current ? "true" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  slideTo(trackRef.current, index);
                }}
                className="gallery-thumb"
              >
                <Image src={image.src} alt="" fill sizes="136px" className="object-cover" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-label={labels.gallery}
        className="gallery-box"
        data-lenis-prevent=""
        onKeyDown={onBoxKey}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeBox();
        }}
      >
        {open ? (
          <div className="flex h-full flex-col">
            <div className="container-page flex min-h-16 items-center justify-end gap-4 py-3">
              <button
                type="button"
                autoFocus
                onClick={closeBox}
                aria-label={labels.close}
                className="inline-flex size-11 items-center justify-center rounded-full border border-white/40 text-white transition-colors duration-200 hover:border-white"
              >
                <CloseIcon size={24} />
              </button>
            </div>
            <ul ref={boxTrackRef} className="gallery-track flex-1">
              {images.map((image) => (
                <li key={image.src} className="gallery-box-slide">
                  <figure className="flex h-full flex-col items-center justify-center gap-4 px-4">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width={image.width}
                      height={image.height}
                      sizes={`min(100vw, ${image.width}px)`}
                      className="gallery-box-image"
                    />
                    {image.caption ? (
                      <figcaption className="text-on-navy-muted max-w-3xl text-center text-small">
                        {image.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                </li>
              ))}
            </ul>
            {total > 1 ? (
              <div className="container-page flex justify-end py-4">
                <Controls
                  current={boxCurrent}
                  total={total}
                  labels={labels}
                  tone="dark"
                  onStep={(step) => slideTo(boxTrackRef.current, boxCurrent + step)}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </div>
  );
}

"use client";

import { ArrowLeftIcon, ArrowRightIcon, CloseIcon } from "@/components/icons/iconsax";
import Image from "next/image";
import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";

export type LightboxImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption?: string | null;
  blurDataURL?: string | null;
};

export type LightboxLabels = {
  dialog: string;
  close: string;
  previous: string;
  next: string;
};

const swipeDistance = 48;
const dragThreshold = 8;

const arrow =
  "absolute top-1/2 inline-flex size-13 -translate-y-1/2 items-center justify-center rounded-full text-white/80 transition-colors duration-300 hover:text-white";

export function Lightbox({
  images,
  index,
  labels,
  onIndexChange,
  onClose,
}: {
  images: LightboxImage[];
  index: number | null;
  labels: LightboxLabels;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const swipe = useRef<{ id: number; x: number; dx: number; moved: boolean } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const open = index !== null;
  const total = images.length;
  const current = index === null ? null : images[index];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(
    () => () => {
      document.documentElement.style.overflow = "";
    },
    [],
  );

  const go = (step: 1 | -1) => {
    if (index === null || total < 2) return;
    onIndexChange((index + step + total) % total);
  };

  const handleClose = () => {
    document.documentElement.style.overflow = "";
    returnFocus.current?.focus();
    returnFocus.current = null;
    onClose();
  };

  const handleKey = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "Tab") {
      const items = [...event.currentTarget.querySelectorAll<HTMLElement>("button")];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    }
  };

  const moveStage = (dx: number, animate: boolean) => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.style.transition = animate ? "" : "none";
    stage.style.transform = dx ? `translate3d(${dx}px, 0, 0)` : "";
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (total < 2 || (event.pointerType === "mouse" && event.button !== 0)) return;
    swipe.current = { id: event.pointerId, x: event.clientX, dx: 0, moved: false };
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const state = swipe.current;
    if (!state || state.id !== event.pointerId) return;
    state.dx = event.clientX - state.x;
    if (!state.moved) {
      if (Math.abs(state.dx) < dragThreshold) return;
      state.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    moveStage(state.dx, false);
  };

  const handlePointerEnd = (commit: boolean) => {
    const state = swipe.current;
    swipe.current = null;
    if (!state?.moved) return;
    if (commit && Math.abs(state.dx) >= swipeDistance) {
      moveStage(0, false);
      go(state.dx < 0 ? 1 : -1);
    } else {
      moveStage(0, true);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={labels.dialog}
      onClose={handleClose}
      onKeyDown={handleKey}
      className="on-dark fixed inset-0 m-0 size-full max-h-none max-w-none border-0 bg-black p-0 text-white backdrop:bg-black"
    >
      {current && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 pt-2.5 sm:px-7.5">
            <p className="text-meta" aria-live="polite">
              {(index ?? 0) + 1} / {total}
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label={labels.close}
              className="-mr-2.5 inline-flex size-11 items-center justify-center"
            >
              <CloseIcon aria-hidden="true" className="size-6" />
            </button>
          </div>
          <figure
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={() => handlePointerEnd(true)}
            onPointerCancel={() => handlePointerEnd(false)}
            onDragStart={(event) => event.preventDefault()}
            className="flex min-h-0 flex-1 touch-pan-y flex-col px-5 pt-2.5 pb-7.5 select-none sm:px-22"
          >
            <div
              ref={stageRef}
              className="relative min-h-0 flex-1 transition-transform duration-300 ease-soft"
            >
              <Image
                key={current.src}
                src={current.src}
                alt={current.alt}
                fill
                sizes="100vw"
                draggable={false}
                className="object-scale-down motion-safe:animate-fade-in"
              />
            </div>
            {current.caption && (
              <figcaption className="mt-4 text-center text-meta">{current.caption}</figcaption>
            )}
          </figure>
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={labels.previous}
                className={`${arrow} left-2.5 sm:left-5`}
              >
                <ArrowLeftIcon aria-hidden="true" className="size-13" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={labels.next}
                className={`${arrow} right-2.5 sm:right-5`}
              >
                <ArrowRightIcon aria-hidden="true" className="size-13" />
              </button>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}

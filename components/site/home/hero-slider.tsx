"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons/iconsax";
import Link from "next/link";
import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { flushSync } from "react-dom";

import { HeroImage } from "@/components/site/home/hero-image";
import { pill } from "@/components/site/pill";
import type { HeroSlide } from "@/lib/public/home";
import { cx } from "@/lib/cx";

const arrow =
  "absolute top-1/3 inline-flex size-13 -translate-y-1/2 sm:top-1/2 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur-md transition-[background-color,opacity] duration-300 hover:bg-white/30 focus-visible:opacity-100 pointer-fine:opacity-0 group-hover:opacity-100";

const dragThreshold = 8;
const swipeRatio = 0.15;
const flickSpeed = 0.35;

type Labels = { region: string; slide: string; previous: string; next: string; more: string };
type Side = 1 | -1;
type Position = { active: number; side: Side };
type Drag = {
  id: number;
  x: number;
  y: number;
  dx: number;
  time: number;
  velocity: number;
  moved: boolean;
};

function offsetOf(index: number, { active, side }: Position, count: number) {
  const relative = (index - active + count) % count;
  if (relative === 0) return 0;
  if (count === 2) return side;
  if (relative === 1) return 1;
  if (relative === count - 1) return -1;
  return 2;
}

export function HeroSlider({ slides, labels }: { slides: HeroSlide[]; labels: Labels }) {
  const [position, setPosition] = useState<Position & { from: Position }>({
    active: 0,
    side: 1,
    from: { active: 0, side: 1 },
  });
  const [primed, setPrimed] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const count = slides.length;
  const prime = () => setPrimed(true);

  const placeNeighbour = (side: Side) => {
    if (count !== 2 || position.side === side) return;
    flushSync(() =>
      setPosition((current) => ({
        active: current.active,
        side,
        from: { active: current.active, side: current.side },
      })),
    );
    sectionRef.current?.getBoundingClientRect();
  };

  const go = (step: Side) => {
    setPrimed(true);
    placeNeighbour(step);
    setPosition((current) => ({
      active: (current.active + step + count) % count,
      side: step === 1 ? -1 : 1,
      from: { active: current.active, side: current.side },
    }));
  };

  const setDrag = (value: number) => sectionRef.current?.style.setProperty("--drag", `${value}px`);

  const endDrag = (commit: boolean) => {
    const state = drag.current;
    drag.current = null;
    const section = sectionRef.current;
    if (!state?.moved || !section) return;
    delete section.dataset.dragging;
    setDrag(0);
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false));
    if (!commit) return;
    const far = Math.abs(state.dx) > section.clientWidth * swipeRatio;
    const fast =
      Math.abs(state.velocity) > flickSpeed && Math.sign(state.velocity) === Math.sign(state.dx);
    if (far || fast) go(state.dx < 0 ? 1 : -1);
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (count < 2 || (event.pointerType === "mouse" && event.button !== 0)) return;
    if ((event.target as Element).closest("button")) return;
    prime();
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      dx: 0,
      time: event.timeStamp,
      velocity: 0,
      moved: false,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    const dx = event.clientX - state.x;
    if (!state.moved) {
      const dy = event.clientY - state.y;
      if (Math.abs(dx) < dragThreshold && Math.abs(dy) < dragThreshold) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      state.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = "";
    }
    const elapsed = event.timeStamp - state.time;
    if (elapsed > 0) state.velocity = 0.8 * ((dx - state.dx) / elapsed) + 0.2 * state.velocity;
    state.dx = dx;
    state.time = event.timeStamp;
    if (dx !== 0) placeNeighbour(dx < 0 ? 1 : -1);
    setDrag(dx);
  };

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    if (event.timeStamp - state.time > 100) state.velocity = 0;
    endDrag(true);
  };

  const handleClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <section
      ref={sectionRef}
      data-hero=""
      aria-roledescription={count > 1 ? "carousel" : undefined}
      aria-label={labels.region}
      onPointerEnter={(event) => count > 1 && event.pointerType === "mouse" && prime()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => endDrag(false)}
      onClickCapture={handleClickCapture}
      onDragStart={(event) => event.preventDefault()}
      className={cx(
        "group on-dark relative -mt-16 hero-h-full overflow-hidden bg-graphite text-white data-dragging:cursor-grabbing data-dragging:select-none xl:-mt-20",
        count > 1 && "touch-pan-y",
      )}
    >
      {slides.map((slide, index) => {
        const current = index === position.active;
        const offset = offsetOf(index, position, count);
        const jump = Math.abs(offset - offsetOf(index, position.from, count)) > 1;
        return (
          <div
            key={slide.id}
            role={count > 1 ? "group" : undefined}
            aria-roledescription={count > 1 ? "slide" : undefined}
            aria-label={count > 1 ? `${labels.slide} ${index + 1} / ${count}` : undefined}
            aria-hidden={!current}
            inert={!current}
            style={{ transform: `translate3d(calc(${offset * 100}% + var(--drag, 0px)), 0, 0)` }}
            className={cx(
              "absolute inset-0 group-data-dragging:transition-none",
              jump ? "transition-none" : "transition-transform duration-800 ease-soft",
              offset === 2 && "invisible",
            )}
          >
            {(index === 0 || primed) && (
              <HeroImage
                image={slide.image}
                mobileImage={slide.mobileImage}
                priority={index === 0}
                className={cx("object-cover", current && "motion-safe:animate-hero-zoom")}
              />
            )}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-linear-to-t from-black/55 via-black/15 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 pb-10 sm:pb-12.5">
              <div className="container-page">
                <p
                  className={cx(
                    "max-w-5xl text-display font-light text-balance",
                    current && "motion-safe:animate-reveal-up",
                  )}
                >
                  {slide.title}
                </p>
              </div>
              <div
                aria-hidden="true"
                className={cx(
                  "mt-8 h-px origin-left bg-white/60 sm:mt-15",
                  current && "motion-safe:animate-draw-x",
                )}
              />
              <div
                className={cx(
                  "container-page mt-6 flex flex-col items-start gap-6 sm:mt-7.5 md:flex-row md:items-center md:justify-between",
                  current && "motion-safe:animate-reveal-up motion-safe:[animation-delay:150ms]",
                )}
              >
                {slide.lead && (
                  <p className="flex max-w-160 items-baseline gap-4 text-lead font-normal">
                    <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-white" />
                    {slide.lead}
                  </p>
                )}
                {slide.href && (
                  <Link
                    href={slide.href}
                    draggable={false}
                    className={cx(pill({ variant: "white" }), "font-normal")}
                  >
                    {labels.more}
                    <span className="sr-only">: {slide.title}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-black/45 to-transparent xl:h-48"
      />

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            onPointerEnter={prime}
            onFocus={prime}
            onTouchStart={prime}
            aria-label={labels.previous}
            className={cx(arrow, "left-5 sm:left-7.5")}
          >
            <ChevronLeftIcon aria-hidden="true" className="size-6" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            onPointerEnter={prime}
            onFocus={prime}
            onTouchStart={prime}
            aria-label={labels.next}
            className={cx(arrow, "right-5 sm:right-7.5")}
          >
            <ChevronRightIcon aria-hidden="true" className="size-6" />
          </button>
        </>
      )}
    </section>
  );
}

"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons/iconsax";
import { Children, useEffect, useRef, useState, type ReactNode } from "react";

import { useDragScroll } from "@/components/site/use-drag-scroll";
import { cx } from "@/lib/cx";

export function ScrollRow({
  children,
  label,
  previousLabel,
  nextLabel,
  className,
  listClassName = "flex",
  buttonClassName,
}: {
  children: ReactNode;
  label: string;
  previousLabel: string;
  nextLabel: string;
  className?: string;
  listClassName?: string;
  buttonClassName?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const [active, setActive] = useState(0);
  const count = Children.count(children);
  const scrollable = !(edges.start && edges.end);
  useDragScroll(listRef);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () => {
      const end = list.scrollLeft + list.clientWidth >= list.scrollWidth - 4;
      setEdges({ start: list.scrollLeft <= 4, end });
      const items = [...list.children];
      const origin = list.getBoundingClientRect().left;
      const nearest = items.reduce(
        (best, item, index) => {
          const gap = Math.abs(item.getBoundingClientRect().left - origin);
          return gap < best.gap ? { index, gap } : best;
        },
        { index: 0, gap: Infinity },
      );
      setActive(end ? items.length - 1 : nearest.index);
    };
    update();
    list.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => {
      list.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const move = (direction: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollBy({
      left: direction * list.clientWidth * 0.9,
      behavior: reduce ? "auto" : "smooth",
    });
  };

  const button = cx(
    "inline-flex size-13 items-center justify-center rounded-full text-graphite transition-[color,opacity] duration-300 hover:text-black disabled:pointer-events-none disabled:opacity-0",
    buttonClassName,
  );

  return (
    <div className={cx("relative min-w-0", className)}>
      <ul
        ref={listRef}
        aria-label={label}
        className={cx(
          "-mr-5 no-scrollbar snap-x snap-mandatory overflow-x-auto overscroll-x-contain data-dragging:cursor-grabbing data-dragging:select-none sm:-mr-7.5",
          scrollable && "pointer-fine:cursor-grab",
          listClassName,
        )}
      >
        {children}
      </ul>
      {count > 1 && scrollable && (
        <div
          aria-hidden="true"
          className="mt-6 flex justify-center gap-2 text-graphite in-[.on-dark]:text-sand md:hidden"
        >
          {Array.from({ length: count }, (_, index) => (
            <span
              key={index}
              className={cx(
                "size-1.5 rounded-full bg-current transition-opacity duration-300",
                index === active ? "opacity-100" : "opacity-25",
              )}
            />
          ))}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 justify-between px-2.5 md:flex">
        <button
          type="button"
          onClick={() => move(-1)}
          disabled={edges.start}
          aria-label={previousLabel}
          className={cx(button, "pointer-events-auto")}
        >
          <ArrowLeftIcon aria-hidden="true" className="size-13" />
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          disabled={edges.end}
          aria-label={nextLabel}
          className={cx(button, "pointer-events-auto")}
        >
          <ArrowRightIcon aria-hidden="true" className="size-13" />
        </button>
      </div>
    </div>
  );
}

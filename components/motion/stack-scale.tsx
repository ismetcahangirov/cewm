"use client";

import { useEffect, useRef, type ReactNode } from "react";

import {
  clamp,
  documentTop,
  measure,
  readScroll,
  reducedMotion,
  subscribe,
  whenNear,
} from "@/lib/motion/loop";

const shrinkPerCard = 0.045;

export function StackScale({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const list = root?.querySelector<HTMLElement>("[data-stack]");
    if (!root || !list || reducedMotion()) return;
    const cards = [...list.querySelectorAll<HTMLElement>("[data-stack-card]")];
    const written = cards.map(() => 1);
    let geometry: { stuck: number; span: number }[] = [];

    const reset = () => {
      cards.forEach((card, index) => {
        card.style.transform = "";
        written[index] = 1;
      });
    };

    const stopMeasure = measure(list, () => {
      if (getComputedStyle(cards[0] ?? list).position !== "sticky") {
        geometry = [];
        reset();
        return;
      }
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
      let natural = documentTop(list);
      geometry = cards.map((card) => {
        const stickTop = parseFloat(getComputedStyle(card).top) || 0;
        const span = card.offsetHeight + gap;
        const entry = { stuck: natural - stickTop, span };
        natural += span;
        return entry;
      });
    });

    const tick = () => {
      if (!geometry.length) return;
      const { y } = readScroll();
      for (let index = 0; index < cards.length - 1; index += 1) {
        const entry = geometry[index];
        const card = cards[index];
        if (!entry || !card) continue;
        const covered = clamp((y - entry.stuck) / entry.span, 0, cards.length - 1 - index);
        const scale = Math.round((1 - covered * shrinkPerCard) * 10000) / 10000;
        if (scale === written[index]) continue;
        written[index] = scale;
        card.style.transform = scale < 1 ? `scale(${scale})` : "";
      }
    };

    let stopTick: (() => void) | null = null;
    const stopNear = whenNear(root, (near) => {
      stopTick?.();
      stopTick = near ? subscribe(tick) : null;
    });

    return () => {
      stopMeasure();
      stopNear();
      stopTick?.();
      reset();
    };
  }, []);

  return <div ref={rootRef}>{children}</div>;
}

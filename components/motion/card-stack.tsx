"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

import {
  clamp,
  documentTop,
  measure,
  readScroll,
  reducedMotion,
  subscribe,
  whenNear,
} from "@/lib/motion/loop";

export type StackCard = { id: string; title: string; text: string; icon?: ReactNode };

export function CardStack({ cards, label }: { cards: StackCard[]; label?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion()) return;
    const wide = matchMedia("(min-width: 1024px)");
    if (!wide.matches) return;
    root.setAttribute("data-stacked", "");
    const items = [...root.querySelectorAll<HTMLElement>("[data-card]")];
    const steps = [...root.querySelectorAll<HTMLElement>("[data-step]")];
    const box = { top: 0, height: 0 };
    let arrived = -1;
    const stopMeasure = measure(root, () => {
      box.top = documentTop(root);
      box.height = root.offsetHeight;
    });
    let stopTick: (() => void) | null = null;
    const stopNear = whenNear(root, (near) => {
      stopTick?.();
      stopTick = near
        ? subscribe(() => {
            const { y, viewportHeight } = readScroll();
            const progress = clamp((y - box.top) / Math.max(box.height - viewportHeight, 1));
            const next = Math.min(items.length - 1, Math.floor(progress * items.length));
            if (next === arrived) return;
            arrived = next;
            items.forEach((item, index) => {
              item.toggleAttribute("data-arrived", index <= next);
              item.toggleAttribute("data-glass", index === next && index > 0);
            });
            steps.forEach((step, index) => step.toggleAttribute("data-on", index <= next));
          })
        : null;
    });
    return () => {
      stopMeasure();
      stopNear();
      stopTick?.();
      root.removeAttribute("data-stacked");
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="card-stack"
      style={{ "--n": cards.length } as CSSProperties}
      aria-label={label}
      role={label ? "region" : undefined}
    >
      <div className="card-stack-stage container-page">
        <ol className="card-stack-list">
          {cards.map((card, index) => (
            <li
              key={card.id}
              data-card=""
              className="card-stack-card"
              style={{ "--i": index } as CSSProperties}
            >
              <span aria-hidden="true" className="card-stack-fill" />
              <div className="relative">
                <p className="text-label tabular text-cyan">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-4 text-h3 text-white">{card.title}</h3>
                {card.icon ? <div className="mt-8 text-white">{card.icon}</div> : null}
                <p className="text-on-navy-muted mt-8 text-small">{card.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <ol aria-hidden="true" className="card-stack-rail">
          {cards.map((card) => (
            <li key={card.id} data-step="" className="card-stack-step" />
          ))}
        </ol>
      </div>
    </div>
  );
}

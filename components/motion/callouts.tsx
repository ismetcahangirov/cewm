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

export type Callout = {
  id: string;
  x: number;
  y: number;
  label: string;
  showAt: number;
  hideAt: number;
};

export function Callouts({ media, items }: { media: ReactNode; items: Callout[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const marks = [...root.querySelectorAll<HTMLElement>("[data-callout]")];
    if (reducedMotion()) {
      for (const mark of marks) mark.setAttribute("data-shown", "");
      return;
    }
    root.setAttribute("data-callouts-live", "");
    const box = { top: 0, height: 0 };
    const shown = marks.map(() => false);
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
            const progress = clamp((y + viewportHeight - box.top) / (viewportHeight + box.height));
            marks.forEach((mark, index) => {
              const item = items[index];
              if (!item) return;
              const visible = progress >= item.showAt && progress < item.hideAt;
              if (visible === shown[index]) return;
              shown[index] = visible;
              mark.toggleAttribute("data-shown", visible);
            });
          })
        : null;
    });
    return () => {
      stopMeasure();
      stopNear();
      stopTick?.();
      root.removeAttribute("data-callouts-live");
    };
  }, [items]);

  return (
    <div ref={rootRef} className="callouts">
      <div className="callouts-media">
        {media}
        {items.map((item, index) => (
          <div
            key={item.id}
            data-callout=""
            className={item.x > 50 ? "callout is-left" : "callout"}
            style={{ "--x": `${item.x}%`, "--y": `${item.y}%`, "--i": index } as CSSProperties}
          >
            <span aria-hidden="true" className="callout-dot">
              <span className="callout-number tabular">{index + 1}</span>
            </span>
            <span aria-hidden="true" className="callout-line-x" />
            <span aria-hidden="true" className="callout-line-y" />
            <span className="callout-label">{item.label}</span>
          </div>
        ))}
      </div>
      <ol className="callouts-list">
        {items.map((item, index) => (
          <li key={item.id} className="flex gap-3 text-small">
            <span className="callout-number-static tabular">{index + 1}</span>
            {item.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

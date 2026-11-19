"use client";

import { useEffect, type RefObject } from "react";

const dragThreshold = 6;
const momentum = 250;

function snapTarget(list: HTMLElement, desired: number) {
  const max = list.scrollWidth - list.clientWidth;
  const origin = list.getBoundingClientRect().left - list.scrollLeft;
  const padding = parseFloat(getComputedStyle(list).paddingLeft) || 0;
  let best = Math.min(Math.max(desired, 0), max);
  let distance = Infinity;
  for (const child of list.children) {
    const left = Math.min(Math.max(child.getBoundingClientRect().left - origin - padding, 0), max);
    const gap = Math.abs(left - desired);
    if (gap < distance) {
      distance = gap;
      best = left;
    }
  }
  if (Math.abs(max - desired) < distance) best = max;
  return best;
}

export function useDragScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    let pointer: number | null = null;
    let startX = 0;
    let startLeft = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    let dragged = false;
    let restoreTimer = 0;

    const restore = () => {
      window.clearTimeout(restoreTimer);
      list.removeEventListener("scrollend", restore);
      list.style.scrollSnapType = "";
      list.style.scrollBehavior = "";
    };

    const down = (event: PointerEvent) => {
      dragged = false;
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      if (list.scrollWidth <= list.clientWidth + 1) return;
      pointer = event.pointerId;
      startX = lastX = event.clientX;
      startLeft = list.scrollLeft;
      lastTime = event.timeStamp;
      velocity = 0;
    };

    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      const distance = event.clientX - startX;
      if (!dragged) {
        if (Math.abs(distance) < dragThreshold) return;
        dragged = true;
        restore();
        list.setPointerCapture(event.pointerId);
        list.style.scrollSnapType = "none";
        list.style.scrollBehavior = "auto";
        list.dataset.dragging = "";
      }
      const elapsed = event.timeStamp - lastTime;
      if (elapsed > 0) velocity = 0.8 * ((event.clientX - lastX) / elapsed) + 0.2 * velocity;
      lastX = event.clientX;
      lastTime = event.timeStamp;
      list.scrollLeft = startLeft - distance;
    };

    const up = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      if (!dragged) return;
      window.setTimeout(() => (dragged = false));
      delete list.dataset.dragging;
      if (event.timeStamp - lastTime > 100) velocity = 0;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const left = snapTarget(list, list.scrollLeft - velocity * momentum);
      if (reduce || Math.abs(left - list.scrollLeft) < 1) {
        list.scrollLeft = left;
        restore();
        return;
      }
      list.addEventListener("scrollend", restore, { once: true });
      restoreTimer = window.setTimeout(restore, 1000);
      list.scrollTo({ left, behavior: "smooth" });
    };

    const click = (event: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      event.preventDefault();
      event.stopPropagation();
    };

    const dragStart = (event: DragEvent) => event.preventDefault();

    list.addEventListener("pointerdown", down);
    list.addEventListener("pointermove", move);
    list.addEventListener("pointerup", up);
    list.addEventListener("pointercancel", up);
    list.addEventListener("click", click, true);
    list.addEventListener("dragstart", dragStart);
    return () => {
      restore();
      list.removeEventListener("pointerdown", down);
      list.removeEventListener("pointermove", move);
      list.removeEventListener("pointerup", up);
      list.removeEventListener("pointercancel", up);
      list.removeEventListener("click", click, true);
      list.removeEventListener("dragstart", dragStart);
    };
  }, [ref]);
}

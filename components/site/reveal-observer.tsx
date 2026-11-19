"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const groupSelector = "[data-reveal-group]";
const pendingSelector = "[data-reveal]:not([data-revealed])";

function show(target: Element) {
  const elements = target.matches(groupSelector) ? target.querySelectorAll(pendingSelector) : [];
  for (const element of elements) element.setAttribute("data-revealed", "");
  if (target.hasAttribute("data-reveal")) target.setAttribute("data-revealed", "");
}

export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const pending = new Set<Element>([
      ...[...document.querySelectorAll(groupSelector)].filter((group) =>
        group.querySelector(pendingSelector),
      ),
      ...[...document.querySelectorAll(pendingSelector)].filter(
        (element) => !element.closest(groupSelector),
      ),
    ]);
    let frame = 0;

    const stop = () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
    const check = () => {
      frame = 0;
      const limit = window.innerHeight * 0.9;
      for (const element of pending) {
        if (element.getBoundingClientRect().top >= limit) continue;
        show(element);
        pending.delete(element);
      }
      if (!pending.size) stop();
    };
    function schedule() {
      if (!frame) frame = requestAnimationFrame(check);
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    check();
    return stop;
  }, [pathname]);

  return null;
}

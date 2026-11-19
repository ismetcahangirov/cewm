import type Lenis from "lenis";

import { setScrollDriver, wake, writeScroll, writeViewport } from "./loop";

let lenis: Lenis | null = null;

export function smoothScroller() {
  return lenis;
}

export function startSmoothScroll() {
  let active = true;
  const syncViewport = () => writeViewport(window.innerHeight);
  const onNativeScroll = () => writeScroll(window.scrollY);
  syncViewport();
  writeScroll(window.scrollY);
  addEventListener("resize", syncViewport, { passive: true });

  const fine = matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
  if (!fine.matches) {
    addEventListener("scroll", onNativeScroll, { passive: true });
    return () => {
      removeEventListener("resize", syncViewport);
      removeEventListener("scroll", onNativeScroll);
    };
  }

  const wakeOnInput = () => wake();
  addEventListener("wheel", wakeOnInput, { passive: true });
  addEventListener("click", wakeOnInput, { capture: true, passive: true });

  void import("lenis").then(({ default: LenisClass }) => {
    if (!active) return;
    lenis = new LenisClass({
      autoRaf: false,
      lerp: 0.08,
      smoothWheel: true,
      syncTouch: false,
      anchors: true,
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
      prevent: (node) => node.closest("[data-lenis-prevent]") !== null,
    });
    lenis.on("scroll", ({ scroll }: Lenis) => writeScroll(scroll));
    setScrollDriver(lenis);
  });

  return () => {
    active = false;
    removeEventListener("resize", syncViewport);
    removeEventListener("wheel", wakeOnInput);
    removeEventListener("click", wakeOnInput, { capture: true });
    setScrollDriver(null);
    lenis?.destroy();
    lenis = null;
  };
}

export function resetScroll() {
  lenis?.scrollTo(0, { immediate: true, force: true });
}

export function scrollToTop() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    lenis?.scrollTo(0, { immediate: true, force: true });
    scrollTo({ top: 0, behavior: "instant" });
    return;
  }
  if (lenis) lenis.scrollTo(0, { force: true });
  else scrollTo({ top: 0, behavior: "smooth" });
}

export function lockScroll(locked: boolean) {
  if (locked) lenis?.stop();
  else lenis?.start();
  document.documentElement.style.overflow = locked ? "hidden" : "";
}

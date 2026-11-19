"use client";

import { useEffect } from "react";

import {
  clamp,
  documentTop,
  measure,
  readScroll,
  reducedMotion,
  subscribe,
  whenNear,
} from "@/lib/motion/loop";
import { smoothScroller } from "@/lib/motion/smooth-scroll";
import type { HeroFilmTierFrames } from "@/lib/public/home";

export type HeroChapter = {
  key: string;
  label: string;
  text: string;
  from: number;
  to: number;
  placement: "top" | "bottom";
};

type Size = { width: number; height: number };

type Budget = { ahead: number; behind: number; ladderStep: number };

type FrameMessage =
  | {
      type: "frame";
      index: number;
      ladder: boolean;
      generation: number;
      decodeMs: number;
      bitmap: ImageBitmap;
    }
  | { type: "progress"; loaded: number; bytes: number }
  | { type: "unsupported" };

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

const budgets = {
  desktop: { ahead: 12, behind: 4, ladderStep: 16 },
  mobile: { ahead: 16, behind: 6, ladderStep: 16 },
  lowMemory: { ahead: 10, behind: 3, ladderStep: 32 },
} satisfies Record<string, Budget>;

const headlineFade = 0.18;
const ctaFade = 0.12;
const underPanel = 0.35;
const maxPixelRatio = 1.5;

function constrained() {
  const nav = navigator as Navigator & { connection?: NetworkInformation; deviceMemory?: number };
  const connection = nav.connection;
  if (connection?.saveData) return true;
  if (connection?.effectiveType && ["slow-2g", "2g", "3g"].includes(connection.effectiveType)) {
    return true;
  }
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) return true;
  return typeof Worker === "undefined" || typeof createImageBitmap === "undefined";
}

function frameUrls(tier: HeroFilmTierFrames) {
  return Array.from({ length: tier.count }, (_, index) =>
    tier.frames.replace("{frame}", String(index + 1).padStart(4, "0")),
  );
}

function afterLoad(start: () => void) {
  let idle = 0;
  let timer = 0;
  const run = () => {
    if (typeof window.requestIdleCallback === "function") {
      idle = window.requestIdleCallback(start, { timeout: 2000 });
    } else {
      timer = window.setTimeout(start, 200);
    }
  };
  if (document.readyState === "complete") run();
  else addEventListener("load", run, { once: true });
  return () => {
    removeEventListener("load", run);
    if (idle) window.cancelIdleCallback(idle);
    window.clearTimeout(timer);
  };
}

function runFilm(
  section: HTMLElement,
  desktop: HeroFilmTierFrames,
  mobile: HeroFilmTierFrames | null,
) {
  const stage = section.querySelector<HTMLElement>(".hero-stage");
  const spacer = section.querySelector<HTMLElement>(".hero-spacer");
  const slot = section.querySelector<HTMLElement>("[data-hero-canvas]");
  const poster = section.querySelector<HTMLElement>("[data-hero-poster]");
  const groupA = section.querySelector<HTMLElement>("[data-hero-a]");
  const groupB = section.querySelector<HTMLElement>("[data-hero-b]");
  const cta = section.querySelector<HTMLElement>("[data-hero-cta]");
  const chapters = [...section.querySelectorAll<HTMLElement>("[data-chapter]")].map((element) => ({
    element,
    from: Number(element.dataset.from),
    to: Number(element.dataset.to),
    active: false,
  }));
  if (!stage || !spacer || !slot) return () => undefined;

  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowMemory = nav.deviceMemory !== undefined && nav.deviceMemory <= 4;
  const wide = window.innerWidth >= 1024;
  const tier = !wide || lowMemory ? (mobile ?? desktop) : desktop;
  const budget = lowMemory
    ? budgets.lowMemory
    : tier === desktop
      ? budgets.desktop
      : budgets.mobile;
  const count = tier.count;

  const box = { top: 0, height: 0, filmEnd: 1, shift: 0 };
  let canvas: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;
  let canvasSize: Size = { width: 0, height: 0 };
  let decodeSize: Size = { width: tier.width, height: tier.height };
  let generation = 0;
  const windowFrames = new Map<number, ImageBitmap>();
  const ladderFrames = new Map<number, ImageBitmap>();
  let worker: Worker | null = null;
  let center = 0;
  let current = 0;
  let drawnBitmap: ImageBitmap | null = null;
  let lastSeek = 0;
  let lastSeekIndex = -1;
  let direction = 1;
  let posterHidden = false;
  let pinActive = false;
  const written = { a: Number.NaN, cta: Number.NaN };
  const stats = { drawMs: [] as number[], decodeMs: [] as number[] };

  const tau = smoothScroller() ? 60 : 100;

  function measureBox() {
    box.top = documentTop(section);
    box.height = section.offsetHeight;
    const viewport = window.innerHeight;
    const range = Math.max(box.height - viewport, 1);
    const spacerHeight = spacer?.offsetHeight ?? 0;
    box.filmEnd = clamp((spacerHeight + underPanel * viewport) / range, 0.05, 1);
    box.shift = window.innerWidth * 0.08;
  }

  function sizes() {
    const ratio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
    const width = Math.round(slot!.clientWidth * ratio);
    const height = Math.round(slot!.clientHeight * ratio);
    const scale = Math.min(Math.max(width / tier.width, height / tier.height), 1);
    return {
      canvas: { width, height },
      decode: { width: Math.round(tier.width * scale), height: Math.round(tier.height * scale) },
    };
  }

  function windowHas(index: number) {
    const ahead = direction >= 0 ? budget.ahead : budget.behind;
    const behind = direction >= 0 ? budget.behind : budget.ahead;
    return index >= center - behind && index <= center + ahead;
  }

  function evict() {
    for (const [index, bitmap] of windowFrames) {
      if (windowHas(index)) continue;
      bitmap.close();
      windowFrames.delete(index);
    }
  }

  function pick(index: number): ImageBitmap | null {
    const exact = windowFrames.get(index);
    if (exact) return exact;
    for (let distance = 1; distance <= 8; distance += 1) {
      const near =
        windowFrames.get(index - distance * direction) ??
        windowFrames.get(index + distance * direction);
      if (near) return near;
    }
    const step = budget.ladderStep;
    const below = Math.floor(index / step) * step;
    return ladderFrames.get(Math.round(index / step) * step) ?? ladderFrames.get(below) ?? null;
  }

  function draw(index: number) {
    const bitmap = pick(index);
    if (!bitmap || !context || !canvas) return;
    if (bitmap === drawnBitmap) return;
    const started = performance.now();
    const scale = Math.max(canvasSize.width / bitmap.width, canvasSize.height / bitmap.height);
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    context.drawImage(
      bitmap,
      (canvasSize.width - width) / 2,
      (canvasSize.height - height) / 2,
      width,
      height,
    );
    stats.drawMs.push(performance.now() - started);
    if (stats.drawMs.length > 2000) stats.drawMs.splice(0, 1000);
    drawnBitmap = bitmap;
    if (!posterHidden && windowFrames.has(index)) {
      posterHidden = true;
      poster?.setAttribute("data-hidden", "");
    }
  }

  function seek(index: number, now: number) {
    if (!worker || index === lastSeekIndex || now - lastSeek < 50) return;
    direction = index >= lastSeekIndex ? 1 : -1;
    lastSeek = now;
    lastSeekIndex = index;
    center = index;
    evict();
    worker.postMessage({ type: "seek", index, direction });
  }

  function choreograph(film: number) {
    const fade = Math.round(clamp(film / headlineFade) * 1000) / 1000;
    if (fade !== written.a) {
      written.a = fade;
      if (groupA) {
        groupA.style.transform = `translate3d(${-box.shift * fade}px, 0, 0)`;
        groupA.style.opacity = String(1 - fade);
      }
      if (groupB) {
        groupB.style.transform = `translate3d(${box.shift * fade}px, 0, 0)`;
        groupB.style.opacity = String(1 - fade);
      }
    }
    const ctaOpacity = Math.round((1 - clamp(film / ctaFade)) * 1000) / 1000;
    if (ctaOpacity !== written.cta && cta) {
      written.cta = ctaOpacity;
      cta.style.opacity = String(ctaOpacity);
      cta.style.visibility = ctaOpacity < 0.02 ? "hidden" : "";
    }
    for (const chapter of chapters) {
      const active = film >= chapter.from && film < chapter.to;
      if (active === chapter.active) continue;
      chapter.active = active;
      chapter.element.toggleAttribute("data-active", active);
    }
  }

  function tick(_time: number, dt: number) {
    const { y, viewportHeight } = readScroll();
    const progress = clamp((y - box.top) / Math.max(box.height - viewportHeight, 1));
    const film = clamp(progress / box.filmEnd);
    const pinned = progress > 0 && progress < 1;
    if (pinned !== pinActive) {
      pinActive = pinned;
      document.documentElement.toggleAttribute("data-pin-active", pinned);
    }
    choreograph(film);
    const target = film * (count - 1);
    current += (target - current) * (1 - Math.exp(-dt / tau));
    if (Math.abs(target - current) < 0.01) current = target;
    const index = Math.round(current);
    seek(index, performance.now());
    draw(index);
  }

  function createCanvas() {
    const next = sizes();
    canvasSize = next.canvas;
    decodeSize = next.decode;
    canvas = document.createElement("canvas");
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    canvas.setAttribute("aria-hidden", "true");
    context = canvas.getContext("2d", { alpha: false });
    slot!.append(canvas);
  }

  function ladderSize(): Size {
    return { width: Math.round(decodeSize.width / 2), height: Math.round(decodeSize.height / 2) };
  }

  function startWorker() {
    createCanvas();
    worker = new Worker(new URL("./hero-film.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<FrameMessage>) => {
      const message = event.data;
      if (message.type === "progress") {
        section.dataset.filmLoaded = String(message.loaded);
        section.dataset.filmBytes = String(message.bytes);
        return;
      }
      if (message.type === "unsupported") {
        stop();
        section.setAttribute("data-hero-static", "");
        return;
      }
      if (message.generation !== generation) {
        message.bitmap.close();
        return;
      }
      stats.decodeMs.push(message.decodeMs);
      if (message.ladder) {
        ladderFrames.get(message.index)?.close();
        ladderFrames.set(message.index, message.bitmap);
      } else if (windowHas(message.index)) {
        windowFrames.get(message.index)?.close();
        windowFrames.set(message.index, message.bitmap);
      } else {
        message.bitmap.close();
        return;
      }
      if (Math.abs(message.index - Math.round(current)) <= 8 || message.ladder) {
        drawnBitmap = null;
        draw(Math.round(current));
      }
    };
    center = Math.round(current);
    worker.postMessage({
      type: "init",
      frames: frameUrls(tier),
      decode: decodeSize,
      ladder: ladderSize(),
      ladderStep: budget.ladderStep,
      ahead: budget.ahead,
      behind: budget.behind,
    });
    worker.postMessage({ type: "seek", index: center, direction: 1 });
  }

  let resizeTimer = 0;
  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (!canvas || !worker) return;
      const next = sizes();
      if (next.canvas.width === canvasSize.width && next.canvas.height === canvasSize.height)
        return;
      canvasSize = next.canvas;
      decodeSize = next.decode;
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      generation += 1;
      for (const bitmap of windowFrames.values()) bitmap.close();
      for (const bitmap of ladderFrames.values()) bitmap.close();
      windowFrames.clear();
      ladderFrames.clear();
      drawnBitmap = null;
      worker.postMessage({ type: "resize", decode: decodeSize, ladder: ladderSize(), generation });
    }, 200);
  }

  const onVisibility = () => worker?.postMessage({ type: "visibility", hidden: document.hidden });

  const stopMeasure = measure(section, measureBox);
  measureBox();
  let stopTick: (() => void) | null = null;
  const stopNear = whenNear(section, (near) => {
    stopTick?.();
    stopTick = near ? subscribe(tick) : null;
  });
  let stopLoad: (() => void) | null = null;
  const stopVisible = whenNear(stage, (near) => {
    if (!near || worker || stopLoad) return;
    stopLoad = afterLoad(startWorker);
  });
  addEventListener("resize", onResize, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  (window as Window & { __heroFilm?: unknown }).__heroFilm = {
    stats,
    tier: tier === desktop ? "desktop" : "mobile",
    budget,
    frames: () => ({ window: windowFrames.size, ladder: ladderFrames.size, decode: decodeSize }),
  };

  function stop() {
    stopMeasure();
    stopNear();
    stopVisible();
    stopLoad?.();
    stopTick?.();
    removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibility);
    worker?.terminate();
    worker = null;
    for (const bitmap of windowFrames.values()) bitmap.close();
    for (const bitmap of ladderFrames.values()) bitmap.close();
    windowFrames.clear();
    ladderFrames.clear();
    canvas?.remove();
    poster?.removeAttribute("data-hidden");
    document.documentElement.removeAttribute("data-pin-active");
  }

  return stop;
}

export function HeroFilmPlayer({
  desktop,
  mobile,
}: {
  version: number;
  desktop: HeroFilmTierFrames;
  mobile: HeroFilmTierFrames | null;
}) {
  useEffect(() => {
    const section = document.querySelector<HTMLElement>("[data-hero-film]");
    if (!section || reducedMotion()) return;
    if (constrained() || window.innerHeight < 500) {
      section.setAttribute("data-hero-static", "");
      return () => section.removeAttribute("data-hero-static");
    }
    return runFilm(section, desktop, mobile);
  }, [desktop, mobile]);

  return null;
}

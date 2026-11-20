"use client";

import { useEffect } from "react";

import { frameBudget } from "@/lib/motion/frame-budget";
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

type Budget = { ahead: number; behind: number };

type Step = [number, number, number];

type Motion = { steps: Step[]; pace: number[] | null };

type Similarity = { scale: number; x: number; y: number };

type FrameMessage =
  | {
      type: "frame";
      index: number;
      generation: number;
      decodeMs: number;
      bitmap: ImageBitmap;
    }
  | { type: "progress"; loaded: number; bytes: number; total: number }
  | { type: "unsupported" };

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

const budgets = {
  wide: { ahead: 10, behind: 3 },
  desktop: { ahead: 12, behind: 4 },
  mobile: { ahead: 12, behind: 4 },
  lowMemory: { ahead: 8, behind: 3 },
} satisfies Record<string, Budget>;

const headlineFade = 0.18;
const ctaFade = 0.12;
const underPanel = 0.35;
const maxPixelRatio = 2;
const wideThreshold = 1.08;
const maxWarp = 3;
const settled = 0.002;
const identity: Similarity = { scale: 1, x: 0, y: 0 };

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

function isStep(value: unknown): value is Step {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((part) => typeof part === "number" && Number.isFinite(part))
  );
}

async function loadMotion(url: string, count: number): Promise<Motion | null> {
  const response = await fetch(url, { priority: "low" } as RequestInit);
  if (!response.ok) return null;
  const data = (await response.json()) as { motion?: unknown; pace?: unknown };
  const steps = Array.isArray(data.motion) ? data.motion : [];
  if (steps.length !== count - 1 || !steps.every(isStep)) return null;
  const pace =
    Array.isArray(data.pace) &&
    data.pace.length === count &&
    data.pace.every(
      (value, index, list) =>
        typeof value === "number" && (index === 0 || value >= (list[index - 1] as number)),
    )
      ? (data.pace as number[])
      : null;
  return { steps, pace };
}

function compose(first: Similarity, second: Similarity): Similarity {
  return {
    scale: first.scale * second.scale,
    x: second.scale * first.x + second.x,
    y: second.scale * first.y + second.y,
  };
}

function invert(value: Similarity): Similarity {
  return { scale: 1 / value.scale, x: -value.x / value.scale, y: -value.y / value.scale };
}

function runFilm(
  section: HTMLElement,
  tiers: {
    desktop: HeroFilmTierFrames;
    mobile: HeroFilmTierFrames | null;
    wide: HeroFilmTierFrames | null;
  },
  motionUrl: string | null,
) {
  const stage = section.querySelector<HTMLElement>(".hero-stage");
  const spacer = section.querySelector<HTMLElement>(".hero-spacer");
  const slot = section.querySelector<HTMLElement>("[data-hero-canvas]");
  const poster = section.querySelector<HTMLElement>("[data-hero-poster]");
  const groupA = section.querySelector<HTMLElement>("[data-hero-a]");
  const groupB = section.querySelector<HTMLElement>("[data-hero-b]");
  const cta = section.querySelector<HTMLElement>("[data-hero-cta]");
  const scrimTop = section.querySelector<HTMLElement>(".hero-scrim-top");
  const scrimBottom = section.querySelector<HTMLElement>(".hero-scrim-bottom");
  const chapters = [...section.querySelectorAll<HTMLElement>("[data-chapter]")].map((element) => ({
    element,
    from: Number(element.dataset.from),
    to: Number(element.dataset.to),
    top: element.classList.contains("is-top"),
    active: null as boolean | null,
  }));
  if (!stage || !spacer || !slot) return () => undefined;

  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowMemory = nav.deviceMemory !== undefined && nav.deviceMemory <= 4;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
  const coverWidth = (frames: HeroFilmTierFrames) =>
    Math.max(slot.clientWidth, (slot.clientHeight * frames.width) / frames.height);
  const tier = (() => {
    if (window.innerWidth < 1024 || lowMemory) return tiers.mobile ?? tiers.desktop;
    const wide = tiers.wide;
    if (wide && coverWidth(tiers.desktop) * pixelRatio > tiers.desktop.width * wideThreshold) {
      return wide;
    }
    return tiers.desktop;
  })();
  const tierName = tier === tiers.wide ? "wide" : tier === tiers.mobile ? "mobile" : "desktop";
  const budget = lowMemory ? budgets.lowMemory : budgets[tierName];
  const count = tier.count;

  const box = { top: 0, height: 0, filmEnd: 1, shift: 0 };
  let canvas: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;
  let canvasSize: Size = { width: 0, height: 0 };
  let decodeSize: Size = { width: tier.width, height: tier.height };
  let generation = 0;
  const frames = new Map<number, ImageBitmap>();
  let worker: Worker | null = null;
  let motion: Motion | null = null;
  let current = 0;
  let drawnAt = Number.NaN;
  let dirty = true;
  let lastSeek = 0;
  let lastSeekPosition = Number.NaN;
  let direction = 1;
  let posterHidden = false;
  let pinActive = false;
  const written = { a: Number.NaN, cta: Number.NaN, top: Number.NaN, bottom: Number.NaN };
  const stats = { drawMs: [] as number[], decodeMs: [] as number[] };
  const smoothness = frameBudget();

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
    const ratio = Math.min(pixelRatio, tier.width / coverWidth(tier));
    const width = Math.round(slot!.clientWidth * ratio);
    const height = Math.round(slot!.clientHeight * ratio);
    const scale = Math.min(Math.max(width / tier.width, height / tier.height), 1);
    return {
      canvas: { width, height },
      decode: { width: Math.round(tier.width * scale), height: Math.round(tier.height * scale) },
    };
  }

  function frameAt(film: number) {
    const linear = film * (count - 1);
    const pace = motion?.pace;
    if (!pace) return linear;
    let low = 0;
    let high = pace.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if ((pace[middle] as number) <= linear) low = middle;
      else high = middle;
    }
    const from = pace[low] as number;
    const to = pace[high] as number;
    return low + (to > from ? clamp((linear - from) / (to - from)) : 0);
  }

  function travel(from: number, to: number): Similarity {
    const steps = motion?.steps;
    if (!steps || from === to) return identity;
    if (to < from) return invert(travel(to, from));
    let result = identity;
    let at = from;
    while (at < to - 1e-6) {
      const index = Math.floor(at + 1e-6);
      const step = steps[index];
      const end = Math.min(index + 1, to);
      const fraction = end - at;
      if (step) {
        result = compose(result, {
          scale: step[0] ** fraction,
          x: step[1] * fraction,
          y: step[2] * fraction,
        });
      }
      at = end;
    }
    return result;
  }

  function windowRange() {
    const base = Math.floor(current);
    const before = direction >= 0 ? budget.behind : budget.ahead;
    const after = direction >= 0 ? budget.ahead + 1 : budget.behind + 1;
    return { from: base - before, to: base + after };
  }

  function windowHas(index: number) {
    const range = windowRange();
    return index >= range.from && index <= range.to;
  }

  function evict() {
    for (const [index, bitmap] of frames) {
      if (windowHas(index)) continue;
      bitmap.close();
      frames.delete(index);
    }
  }

  function source(position: number): number | null {
    let below: number | null = null;
    let above: number | null = null;
    for (const index of frames.keys()) {
      if (index <= position) {
        if (below === null || index > below) below = index;
      } else if (above === null || index < above) {
        above = index;
      }
    }
    if (below !== null && position - below <= maxWarp) return below;
    if (above !== null && above - position <= maxWarp) return above;
    if (below === null) return above;
    if (above === null) return below;
    return position - below <= above - position ? below : above;
  }

  function place(bitmap: ImageBitmap, warp: Similarity, cover: boolean) {
    const fit = Math.max(canvasSize.width / bitmap.width, canvasSize.height / bitmap.height);
    const base = { width: bitmap.width * fit, height: bitmap.height * fit };
    let scale = warp.scale;
    if (cover) {
      scale = Math.max(scale, canvasSize.width / base.width, canvasSize.height / base.height);
    }
    const width = base.width * scale;
    const height = base.height * scale;
    let x = (canvasSize.width - width) / 2 + warp.x * base.height;
    let y = (canvasSize.height - height) / 2 + warp.y * base.height;
    if (cover) {
      x = clamp(x, canvasSize.width - width, 0);
      y = clamp(y, canvasSize.height - height, 0);
    }
    return { x, y, width, height };
  }

  function paint(bitmap: ImageBitmap, warp: Similarity, alpha: number) {
    if (!context) return;
    const rect = place(bitmap, warp, alpha === 1);
    context.globalAlpha = alpha;
    context.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height);
  }

  function render(position: number) {
    if (!context || !canvas) return;
    if (!dirty && Math.abs(position - drawnAt) < settled) return;
    const base = Math.floor(position);
    const fraction = position - base;
    const near = frames.get(base);
    const next = frames.get(base + 1);
    const started = performance.now();
    if (near && next && fraction >= settled && smoothness.rich) {
      paint(near, travel(base, position), 1);
      paint(next, travel(base + 1, position), fraction);
    } else if (near && fraction < settled) {
      paint(near, identity, 1);
    } else {
      const index = source(position);
      if (index === null) return;
      const bitmap = frames.get(index);
      if (!bitmap) return;
      const reach = clamp(position, index - maxWarp, index + maxWarp);
      paint(bitmap, travel(index, reach), 1);
    }
    context.globalAlpha = 1;
    stats.drawMs.push(performance.now() - started);
    if (stats.drawMs.length > 2000) stats.drawMs.splice(0, 1000);
    drawnAt = position;
    dirty = false;
    if (!posterHidden && (near || next)) {
      posterHidden = true;
      poster?.setAttribute("data-hidden", "");
    }
  }

  function seek(position: number, now: number) {
    if (!worker || now - lastSeek < 50) return;
    if (Math.floor(position) === Math.floor(lastSeekPosition)) return;
    direction = Number.isNaN(lastSeekPosition) || position >= lastSeekPosition ? 1 : -1;
    lastSeek = now;
    lastSeekPosition = position;
    evict();
    worker.postMessage({ type: "seek", position, direction });
  }

  function writeOpacity(element: HTMLElement | null, key: "top" | "bottom", value: number) {
    if (!element || value === written[key]) return;
    written[key] = value;
    element.style.opacity = String(value);
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
    let topText = false;
    let bottomText = false;
    for (const chapter of chapters) {
      const active = film >= chapter.from && film < chapter.to;
      if (active) {
        if (chapter.top) topText = true;
        else bottomText = true;
      }
      if (active === chapter.active) continue;
      chapter.active = active;
      chapter.element.toggleAttribute("data-active", active);
    }
    writeOpacity(scrimTop, "top", topText ? 1 : 1 - fade);
    writeOpacity(scrimBottom, "bottom", bottomText ? 1 : 1 - fade);
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
    const target = frameAt(film);
    current += (target - current) * (1 - Math.exp(-dt / tau));
    if (Math.abs(target - current) < settled) current = target;
    if (pinned && Math.abs(current - drawnAt) >= settled) smoothness.record(dt);
    seek(current, performance.now());
    render(current);
  }

  function prepareContext() {
    if (!context) return;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
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
    prepareContext();
    slot!.append(canvas);
  }

  function startWorker() {
    createCanvas();
    if (motionUrl) {
      void loadMotion(motionUrl, count)
        .then((loaded) => {
          if (!loaded) return;
          motion = loaded;
          dirty = true;
        })
        .catch(() => undefined);
    }
    worker = new Worker(new URL("./hero-film.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<FrameMessage>) => {
      const message = event.data;
      if (message.type === "progress") {
        section.dataset.filmLoaded = String(message.loaded);
        section.dataset.filmBytes = String(message.bytes);
        section.dataset.filmTotal = String(message.total);
        return;
      }
      if (message.type === "unsupported") {
        stop();
        section.setAttribute("data-hero-static", "");
        return;
      }
      if (message.generation !== generation || !windowHas(message.index)) {
        message.bitmap.close();
        return;
      }
      stats.decodeMs.push(message.decodeMs);
      if (stats.decodeMs.length > 2000) stats.decodeMs.splice(0, 1000);
      frames.get(message.index)?.close();
      frames.set(message.index, message.bitmap);
      if (Math.abs(message.index - current) <= maxWarp + 1) {
        dirty = true;
        render(current);
      }
    };
    worker.postMessage({
      type: "init",
      frames: frameUrls(tier),
      decode: decodeSize,
      ahead: budget.ahead,
      behind: budget.behind,
    });
    lastSeekPosition = current;
    worker.postMessage({ type: "seek", position: current, direction: 1 });
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
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      prepareContext();
      dirty = true;
      if (next.decode.width === decodeSize.width && next.decode.height === decodeSize.height) {
        render(current);
        return;
      }
      decodeSize = next.decode;
      generation += 1;
      for (const bitmap of frames.values()) bitmap.close();
      frames.clear();
      worker.postMessage({ type: "resize", decode: decodeSize, generation });
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
    smoothness,
    tier: tierName,
    budget,
    frames: () => ({
      window: frames.size,
      decode: decodeSize,
      canvas: canvasSize,
      motion: Boolean(motion),
      pace: Boolean(motion?.pace),
    }),
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
    for (const bitmap of frames.values()) bitmap.close();
    frames.clear();
    canvas?.remove();
    poster?.removeAttribute("data-hidden");
    scrimTop?.style.removeProperty("opacity");
    scrimBottom?.style.removeProperty("opacity");
    for (const chapter of chapters) chapter.element.removeAttribute("data-active");
    for (const group of [groupA, groupB]) {
      group?.style.removeProperty("transform");
      group?.style.removeProperty("opacity");
    }
    cta?.style.removeProperty("opacity");
    cta?.style.removeProperty("visibility");
    document.documentElement.removeAttribute("data-pin-active");
  }

  return stop;
}

export function HeroFilmPlayer({
  desktop,
  mobile,
  wide,
  motion,
}: {
  desktop: HeroFilmTierFrames;
  mobile: HeroFilmTierFrames | null;
  wide: HeroFilmTierFrames | null;
  motion: string | null;
}) {
  useEffect(() => {
    const section = document.querySelector<HTMLElement>("[data-hero-film]");
    if (!section || reducedMotion()) return;
    if (constrained() || window.innerHeight < 500) {
      section.setAttribute("data-hero-static", "");
      return () => section.removeAttribute("data-hero-static");
    }
    return runFilm(section, { desktop, mobile, wide }, motion);
  }, [desktop, mobile, wide, motion]);

  return null;
}

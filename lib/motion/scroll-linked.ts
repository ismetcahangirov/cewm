import {
  clamp,
  documentTop,
  measure,
  readScroll,
  reducedMotion,
  subscribe,
  whenNear,
} from "./loop";

type Box = { top: number; height: number };

const gable = [
  [50, 8],
  [86, 34],
  [86, 92],
  [14, 92],
  [14, 34],
];
const full = [
  [50, 0],
  [100, 0],
  [100, 100],
  [0, 100],
  [0, 0],
];

export function supportsScrollTimeline() {
  return typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()");
}

function track(element: HTMLElement, update: (box: Box) => void) {
  const box: Box = { top: 0, height: 0 };
  const stopMeasure = measure(element, () => {
    box.top = documentTop(element);
    box.height = element.offsetHeight;
  });
  let stopTick: (() => void) | null = null;
  const stopNear = whenNear(element, (near) => {
    stopTick?.();
    stopTick = near ? subscribe(() => update(box)) : null;
  });
  return () => {
    stopMeasure();
    stopNear();
    stopTick?.();
  };
}

function wordReveal(element: HTMLElement) {
  const words = [...element.querySelectorAll<HTMLElement>(".wr")];
  const count = words.length || 1;
  let shown = -1;
  return track(element, (box) => {
    const { y, viewportHeight } = readScroll();
    const cover = clamp((y + viewportHeight - box.top) / (viewportHeight + box.height));
    const next = Math.floor(((cover - 0.2) / 0.35) * count);
    if (next === shown) return;
    shown = next;
    words.forEach((word, index) => word.toggleAttribute("data-on", index < next));
  });
}

function clipExpand(element: HTMLElement) {
  const media = element.querySelector<HTMLElement>(".stage-media");
  if (!media) return () => undefined;
  let last = -1;
  return track(element, (box) => {
    const { y, viewportHeight } = readScroll();
    const range = Math.max(box.height - viewportHeight, 1);
    const progress = Math.round(clamp((y - box.top) / range / 0.7) * 1000) / 1000;
    if (progress === last) return;
    last = progress;
    const points = gable
      .map(([x, top], index) => {
        const [toX, toY] = full[index] ?? [x, top];
        return `${x + (toX - x) * progress}% ${top + (toY - top) * progress}%`;
      })
      .join(", ");
    media.style.clipPath = `polygon(${points})`;
    media.style.transform = `scale(${1.12 - 0.12 * progress})`;
  });
}

export function startScrollLinked(root: ParentNode = document) {
  if (reducedMotion() || supportsScrollTimeline()) return () => undefined;
  document.documentElement.setAttribute("data-no-timeline", "");
  const stops = [
    ...[...root.querySelectorAll<HTMLElement>("[data-word-reveal]")].map(wordReveal),
    ...[...root.querySelectorAll<HTMLElement>("[data-clip-expand]")].map(clipExpand),
  ];
  return () => {
    for (const stop of stops) stop();
  };
}

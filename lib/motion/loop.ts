type Tick = (time: number, dt: number) => void;

type ScrollDriver = { raf: (time: number) => void; isScrolling: unknown };

type ScrollListener = (y: number, previous: number) => void;

const ticks = new Set<Tick>();
const scrollListeners = new Set<ScrollListener>();
const scrollState = { y: 0, viewportHeight: 0 };
let frameId = 0;
let lastTime = 0;
let driver: ScrollDriver | null = null;

function frame(time: number) {
  const dt = lastTime ? Math.min(time - lastTime, 64) : 16.7;
  lastTime = time;
  driver?.raf(time);
  for (const tick of ticks) tick(time, dt);
  frameId = ticks.size > 0 || driver?.isScrolling ? requestAnimationFrame(frame) : 0;
}

export function wake() {
  if (!frameId) {
    lastTime = 0;
    frameId = requestAnimationFrame(frame);
  }
}

export function subscribe(tick: Tick) {
  ticks.add(tick);
  wake();
  return () => {
    ticks.delete(tick);
  };
}

export function setScrollDriver(next: ScrollDriver | null) {
  driver = next;
  wake();
}

export function readScroll() {
  return scrollState;
}

export function writeScroll(y: number) {
  const previous = scrollState.y;
  scrollState.y = y;
  for (const listener of scrollListeners) listener(y, previous);
  wake();
}

export function writeViewport(height: number) {
  scrollState.viewportHeight = height;
}

export function onScroll(listener: ScrollListener) {
  scrollListeners.add(listener);
  return () => {
    scrollListeners.delete(listener);
  };
}

export function reducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function clamp(value: number, min = 0, max = 1) {
  return value < min ? min : value > max ? max : value;
}

export function documentTop(element: Element) {
  return element.getBoundingClientRect().top + window.scrollY;
}

export function whenNear(element: Element, onChange: (near: boolean) => void) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) onChange(entry.isIntersecting);
    },
    { rootMargin: "50% 0px" },
  );
  observer.observe(element);
  return () => observer.disconnect();
}

export function measure(element: Element, onMeasure: () => void) {
  const observer = new ResizeObserver(() => onMeasure());
  observer.observe(element);
  observer.observe(document.documentElement);
  void document.fonts?.ready.then(onMeasure);
  return () => observer.disconnect();
}

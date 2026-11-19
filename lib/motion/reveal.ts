import { reducedMotion } from "./loop";

const revealSelector = "[data-reveal],[data-line-reveal],[data-wordmark]";

function indexLines(heading: HTMLElement) {
  let line = -1;
  let top = Number.NEGATIVE_INFINITY;
  for (const word of heading.querySelectorAll<HTMLElement>(".lr-w")) {
    if (word.offsetTop > top + 2) {
      line += 1;
      top = word.offsetTop;
    }
    word.style.setProperty("--line", String(line));
  }
}

function groupDelay(element: HTMLElement) {
  const group = element.parentElement;
  if (!group?.hasAttribute("data-reveal-group")) return;
  const siblings = [...group.children].filter((child) => child.hasAttribute("data-reveal"));
  const index = siblings.indexOf(element);
  element.style.setProperty("--reveal-delay", `${Math.min(Math.max(index, 0), 4) * 120}ms`);
}

function reveal(element: HTMLElement) {
  if (element.hasAttribute("data-line-reveal")) indexLines(element);
  groupDelay(element);
  element.setAttribute("data-revealed", "");
}

export function startReveal(root: ParentNode = document) {
  const elements = [...root.querySelectorAll<HTMLElement>(revealSelector)].filter(
    (element) => !element.hasAttribute("data-revealed"),
  );
  if (reducedMotion()) return () => undefined;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0 },
  );
  for (const element of elements) observer.observe(element);
  return () => observer.disconnect();
}

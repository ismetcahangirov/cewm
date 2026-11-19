# Motion recipes

Every number here comes from `reference-motion.md` (measured) or from a benchmark run on
2026-11-19 (listed at the end). Where a value is our choice, it says **chosen**.

## Principles

1. Motion explains structure: a pinned subject, a scene that changes underneath, a step that
   arrives. Nothing loops, nothing moves on its own, nothing decorates.
2. Two kinds of motion only. **Scroll-linked** moves are mapped to scroll position (pins, panel
   push, clip expand, word reveal, the hero film, the card stack scale). **Arrivals** are time-based, start when a
   threshold is crossed and run once (reveals, callouts, cards, header states, hovers).
3. Compositor first: `transform` and `opacity`. `clip-path` only for the one primitive that needs
   it (clip expand); it was measured at 1.7-2.3 ms of main-thread work per frame at
   4x CPU throttle. Never animate `width`, `height`, `top`, `left`, `margin`, `filter` or
   `box-shadow`.
4. Asymmetric timing (measured on the row hover): exits run at half the enter time with
   `--ease-in`; arrivals use `--ease-out-expo` or `--ease-standard`.
5. Every primitive has a `prefers-reduced-motion: reduce` behaviour (listed per recipe). Content
   is complete and readable without JavaScript: motion never hides content in the server HTML.

## Tokens

Defined in `tokens.css`. Durations are plain custom properties (Tailwind v4 has no duration
namespace); in classes use `duration-200`, `duration-400`, `duration-600`, `duration-900`.

| Token | Value | From |
|---|---|---|
| `--motion-fast` | 200 ms | Section copy fade-in f194-f200, callouts f234-f240, row image exit f651-f657 |
| `--motion-base` | 400 ms | Row image enter f609-f621, page transition enter (**chosen**) |
| `--motion-slow` | 600 ms | Card glass-to-solid f437-f455 |
| `--motion-slower` | 900 ms | Footer wordmark letters (**chosen**) |
| `--motion-stagger-word` | 60 ms | Callouts appear within two frames of each other (66 ms) |
| `--motion-stagger-item` | 120 ms | Line reveal stagger, measured about 170 ms; tightened (**chosen**) |
| `--motion-scroll-lerp` | 0.08 | Inertia decays 12 % per 33 ms frame, equivalent to lerp 0.065 at 60 Hz; a little crisper (**chosen**) |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Arrivals: cards, reveals, header, wordmark. The measured decays are exponential |
| `--ease-standard` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Row image enter, fitted RMSE 0.027; hover colour changes |
| `--ease-in` | `cubic-bezier(0.42, 0, 1, 1)` | Exits, fitted RMSE 0.025 on the row image exit |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Cross-fades (object to photo f314-f328, 470 ms) |
| Scroll-linked | `linear` | Pins, panel push, word reveal, clip expand, hero film |

Distances: arrivals rise 24 px (`translateY(1.5rem)`); cards rise from 110 % of their height;
stacked cards are offset 28 px (measured) and tilted +/-2 degrees (reference about 3-4, halved).

## Vocabulary

| Pattern | Primitive | Where |
|---|---|---|
| Route change | `PageTransition` | Every public route |
| Section enters | `Reveal` (`data-reveal`) | Section intros, cards, images below the fold |
| Heading enters | `LineReveal` | Section headings (H2), not body text |
| Statement paragraph | `WordReveal` | One per page at most: the home statement on navy, the about page lead |
| Scene change over a pinned subject | `PanelPush` | Home: navy statement panel over the hero film |
| Subject with labelled parts | `Callouts` | Hero film, machine detail hero image |
| Image takes over the viewport | `ClipExpand` | Home: project photo from the gable shape; project detail opener |
| Steps that build up | `CardStack` | Service process (consultation, planning, delivery, installation, training: owner copy) |
| Sticky cards that pile up | `StackCards` | Home catalogue: the machine areas |
| Browsable list with previews | `RowPreview` | Category index, posts, brands, projects list |
| Closing signature | `FooterWordmark` | Footer on every page |
| Navigation | `Header` | Every public page |
| Pointer feedback | `Hover` | Buttons, links, cards, rows |
| Wheel smoothing | `SmoothScroll` (Lenis) | Fine pointers only |
| Scroll-scrubbed film | `HeroFilm` | Home hero, see `hero-scroll.md` |

## Architecture

Files (client only, under `lib/motion/`): `loop.ts` (one rAF loop and the scroll state),
`smooth-scroll.ts` (Lenis), one file per primitive, `motion.css` (the scroll-driven CSS). Server
Components render the final, fully visible markup with `data-*` hooks; the client code only adds
motion on top.

### One shared rAF loop

```ts
type Tick = (time: number, dt: number) => void;

const ticks = new Set<Tick>();
const scrollState = { y: 0, viewportHeight: 0 };
let frameId = 0;
let lastTime = 0;
let driver: { raf: (time: number) => void; isScrolling: unknown } | null = null;

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
  return () => ticks.delete(tick);
}

export function setScrollDriver(next: typeof driver) {
  driver = next;
  wake();
}

export function readScroll() {
  return scrollState;
}

export function writeScroll(y: number) {
  scrollState.y = y;
  wake();
}
```

Rules for every primitive:

- Subscribe only while the element is near the viewport (an `IntersectionObserver` with
  `rootMargin: "50% 0px"` adds and removes the tick).
- Never read `window.scrollY`, `scrollHeight` or `getBoundingClientRect()` inside a tick. The
  scroll value is written from Lenis' `scroll` event or a passive `scroll` listener
  (`writeScroll(window.scrollY)` in the listener, not in rAF). Element tops and heights are
  measured in a `ResizeObserver` callback and after `document.fonts.ready`, then cached
  (`top = rect.top + scrollY`).
- Write styles only: `transform`, `opacity`, `clip-path`, or a custom property consumed by them.
- Skip writes when the value did not change (compare with the last written value).
- Cache formatters and objects outside the tick (no `new Intl.NumberFormat` per frame).

### CSS scroll-driven where supported, the loop elsewhere

`@supports (animation-timeline: view())` uses CSS scroll-driven animations (Chrome and Edge
115+, Safari 26+). Without support (Firefox today, older Safari), the same primitive registers a
tick that computes progress from the cached rect and writes the same custom property. Lenis
scrolls the real document, so CSS scroll timelines stay in sync with it.

```css
@supports (animation-timeline: view()) {
  [data-scroll-linked] {
    animation: var(--scroll-animation) linear both;
    animation-timeline: var(--scroll-timeline, view());
    animation-range: var(--scroll-range, cover 0% cover 100%);
  }
}
```

### Smooth scroll: Lenis, fine pointers only

| Option | Gzip | Decision |
|---|---|---|
| Native scroll + CSS `scroll-behavior: smooth` for anchors | 0 KB | Mouse wheels step in notches; the scrubbed film and pins look stepped on Windows mice. Kept on touch devices and under reduced motion |
| Lenis 1.3.27 (`lenis.min.js` 18,815 B, **5,425 B gzip -9**, measured 2026-11-19 with `npm pack lenis`) | 5.3 KB | **Chosen** for `(pointer: fine) and (prefers-reduced-motion: no-preference)`. Keeps native scroll position, scrollbar, keyboard, find-in-page and CSS scroll timelines |
| GSAP 3.15 core + ScrollTrigger (28.3 + 18.0 KB gzip, measured 2026-11-01 in kalbajar-city) | 46.3 KB | Rejected: every primitive here fits WAAPI, CSS scroll timelines and the shared loop |

```ts
import Lenis from "lenis";
import { setScrollDriver, writeScroll } from "./loop";

export function startSmoothScroll() {
  const fine = matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
  if (!fine.matches) {
    addEventListener("scroll", () => writeScroll(scrollY), { passive: true });
    return () => undefined;
  }
  const lenis = new Lenis({
    autoRaf: false,
    lerp: 0.08,
    smoothWheel: true,
    syncTouch: false,
    anchors: true,
    allowNestedScroll: true,
    stopInertiaOnNavigate: true,
    prevent: (node) => node.closest("[data-lenis-prevent]") !== null,
  });
  lenis.on("scroll", ({ scroll }) => writeScroll(scroll));
  setScrollDriver(lenis);
  return () => {
    setScrollDriver(null);
    lenis.destroy();
  };
}
```

Add `lenis/dist/lenis.css` (it sets `html.lenis { height: auto }` and the
`[data-lenis-prevent]` overscroll rules). Put `data-lenis-prevent` on every scrollable overlay:
mobile menu, dialogs, the admin. On route change call `lenis.scrollTo(0, { immediate: true })`.
Touch devices keep native momentum scrolling; under reduced motion Lenis is never created.

## Recipes

### PageTransition

- View Transition API through Next.js' `experimental.viewTransition` flag and React's
  `ViewTransition` component; check the exact export name against the installed React and Next
  versions before use. Same-document only; browsers without support navigate instantly.
- Old page: `opacity 1 to 0`, `translateY(0 to -12px)`, `--motion-fast`, `--ease-in`.
  New page: `opacity 0 to 1`, `translateY(24px to 0)`, `--motion-base`, `--ease-out-expo`,
  80 ms delay. The header and footer get their own `view-transition-name` with
  `animation: none` so they never move.
- A 2 px cyan progress bar at the top of the viewport appears only if the navigation takes
  longer than 300 ms (on navy header: cyan on navy passes 3:1).
- Reduced motion: `::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none; }`.

```css
::view-transition-old(root) {
  animation: var(--motion-fast) var(--ease-in) both page-out;
}
::view-transition-new(root) {
  animation: var(--motion-base) var(--ease-out-expo) 80ms both page-in;
}
@keyframes page-out {
  to {
    opacity: 0;
    transform: translateY(-12px);
  }
}
@keyframes page-in {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
}
```

### Reveal

- Markup: `data-reveal` on the element, `data-reveal-group` on a row whose children stagger.
- Hidden only when scripting is on and motion is allowed, so server HTML is always visible:

```css
@media (scripting: enabled) and (prefers-reduced-motion: no-preference) {
  [data-reveal]:not([data-revealed]) {
    opacity: 0;
    transform: translateY(1.5rem);
  }
  [data-reveal] {
    transition:
      opacity var(--motion-slow) var(--ease-out-expo) var(--reveal-delay, 0ms),
      transform var(--motion-slow) var(--ease-out-expo) var(--reveal-delay, 0ms);
  }
}
```

- One `IntersectionObserver` (`rootMargin: "0px 0px -10% 0px"`) sets `data-revealed` once and
  unobserves. Group children get `--reveal-delay: calc(var(--i) * 120ms)`, capped at 4 steps
  (480 ms) so long grids do not crawl.
- Elements already in the viewport at load are revealed immediately (no flash on the LCP area).
- Reduced motion: no rule applies, the element is simply visible.

### LineReveal

- Server render: every word wrapped as `<span class="lr-w"><span class="lr-i">word</span></span>`;
  the heading text stays one string for crawlers (spaces between spans, `aria-hidden` is not
  used).
- After `document.fonts.ready`, the client reads each `.lr-w` `offsetTop` once and sets
  `--line` (0, 1, 2...) on it. On resize, only the indices are recomputed (debounced 150 ms); the
  DOM is never rebuilt.
- `.lr-w { display: inline-block; overflow: clip; padding-block: 0.12em; margin-block: -0.12em; }`
  The padding keeps the dot of `İ`, the cedilla of `Ş`, `Ç` and the descenders inside the mask.
- `.lr-i` animates `translateY(105% to 0)`, `--motion-slow`, `--ease-out-expo`, delay
  `calc(var(--line) * var(--motion-stagger-item))`, triggered by the Reveal observer.
- Reduced motion: no transform; the heading is visible.

### WordReveal

- Server render: words in `<span class="wr" style="--i:N">`, the paragraph has `--n` (word
  count). Resting colour is the final colour, so without JS everything is solid.
- Effect: words change colour from the muted token to the full token as the paragraph scrolls
  through, never from transparent (the reference's faint words fail contrast). On navy:
  `on-navy-muted` (5.38:1) to `white` (17.28:1). On light: `ink-muted` (7.00:1) to `ink`.
- Range: the whole paragraph resolves between `cover 20%` and `cover 55%` of its view timeline,
  about 0.6 viewport, close to the measured 35 px per word for a 17-word statement.

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    [data-word-reveal] .wr {
      animation: word-in linear both;
      animation-timeline: --statement;
      animation-range: cover calc(20% + var(--i) / var(--n) * 35%) cover calc(23% + var(--i) / var(--n) * 35%);
    }
    [data-word-reveal] {
      view-timeline-name: --statement;
    }
  }
}
[data-word-reveal] {
  --word-from: var(--color-ink-muted);
  --word-to: var(--color-ink);
}
.surface-navy [data-word-reveal],
[data-word-reveal].surface-navy {
  --word-from: var(--color-on-navy-muted);
  --word-to: var(--color-white);
}
@keyframes word-in {
  from {
    color: var(--word-from);
  }
  to {
    color: var(--word-to);
  }
}
```

- Fallback: a tick computes `p` from the cached rect and writes `color` only on words whose
  state changed. Measured: changing the colour of 40 words every frame costs 3.79 ms of
  main-thread work per frame at 4x throttle.
- Reduced motion: final colours, no animation.

### PanelPush

- Pure layout, no JavaScript. The pinned subject is `position: sticky; top: 0; height: 100svh`
  inside a wrapper as tall as its scene (for the hero: `400svh` on desktop). The panel is the
  next sibling in normal flow with `position: relative; z-index: 1` and a solid `bg-navy`, so it
  scrolls up over the sticky subject; the subject keeps changing underneath (the film keeps
  scrubbing while it is covered).
- The panel's content uses `WordReveal` and `Reveal`. The panel is as tall as its content plus
  `py-section`, never a fixed viewport height (owner, 2026-11-19: a `100svh` statement panel was
  "too tall"). It slides up over the pinned subject; when its bottom reaches the bottom of the
  viewport the subject unpins and both leave together. Measured on the home statement: 473 px at
  1440 x 900 and 494 px at 390 x 844 (was 900 and 844).
- Reduced motion: unchanged (it is ordinary scrolling), but the hero film is replaced by its
  poster and the wrapper shrinks to `100svh`.

### Callouts

- A callout = anchor dot (12 px square, `rounded-xs`, 1 px white border, navy/60 fill), an
  elbow leader line (two 1 px segments, horizontal then vertical) and a label (`text-small`
  medium, max 24 characters per line, two lines max). Coordinates are percentages of the media
  box, edited in the admin per callout and per locale label.
- Arrival when the scene progress crosses the callout's `showAt` (0-1): line `scaleX` and
  `scaleY` from the anchor (transform-origin at the dot) over `--motion-base`, label
  `opacity 0 to 1` and `translateY(8px to 0)` over `--motion-base` with `--ease-out-expo`, 60 ms
  stagger between callouts. Leaving the range reverses with `--motion-fast` and `--ease-in`.
  Time-based on a scroll threshold, not scrubbed: labels must never be half-visible.
- Below 768 px: no leader lines. Numbered dots (24 px, cyan on navy, number in `text-label`) on
  the media, and a numbered list under it.
- Reduced motion: all callouts visible at once, no line drawing.

### ClipExpand

- A wrapper `height: 200svh` with `view-timeline-name: --expand`; inside it a sticky stage
  `height: 100svh` with the photo (`next/image`, `fill`, `object-cover`).
- The photo's `clip-path` interpolates between `--clip-gable` and `--clip-full` (both five
  points, so the browser can interpolate), and the image inside scales `1.12 to 1`.

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    [data-clip-expand] .stage-media {
      animation: clip-expand linear both;
      animation-timeline: --expand;
      animation-range: contain 0% contain 70%;
    }
  }
}
@keyframes clip-expand {
  from {
    clip-path: var(--clip-gable);
    transform: scale(1.12);
  }
  to {
    clip-path: var(--clip-full);
    transform: scale(1);
  }
}
```

- The gable is our own shape (the house film and the fir tree of the logo), not the reference's
  container silhouette. Measured cost of a scroll-linked polygon clip: 2.28 ms main thread per
  frame at 4x; WAAPI-driven: 1.40 ms.
- Fallback without scroll timelines: a tick writes `clip-path` and `transform` from cached
  progress.
- Reduced motion: no pin (`height: auto`), the photo is full-bleed from the start.

### CardStack

- Desktop (from 1024 px): wrapper `height: calc((var(--n) + 1) * 60svh)`; a sticky stage
  `100svh`; cards absolutely stacked at the left column, a progress rail of `n` 12 px squares at
  the right (active square `bg-cyan`, others `border border-white/40`).
- Card `i` arrives when the stage progress passes `i / n`: `translateY(110% to i * 28px)` and
  `rotate((i % 2 ? 2 : -2)deg)` over `--motion-slow` with `--ease-out-expo`. It arrives as glass
  (`bg-navy/72`, `backdrop-blur-glass`) and an inner solid layer (`bg-navy-raised`) fades in over
  `--motion-slow`, so the fill change is an opacity change. Scrolling back reverses the last card
  with `--motion-fast` and `--ease-in`.
- Only one card is glass at a time; backdrop blur only under `(pointer: fine)` and
  `(prefers-reduced-transparency: no-preference)`, otherwise the card arrives solid.
- Card: `rounded-md`, `shadow-stack`, `p-8`, number in `text-label` cyan, title `text-h3`
  white, one Iconsax Linear icon at 32 px, one sentence in `on-navy-muted`.
- Below 1024 px: no pin; cards are a vertical list using `Reveal` with 120 ms stagger.
- Reduced motion: the list layout at every width.

### RowPreview

- One shared preview element per list: `position: fixed; pointer-events: none`, aspect 4:5,
  width `clamp(12.5rem, 18vw, 20rem)`, `rotate(3deg)` (reference about 5, reduced), image
  AVIF at 320 and 640 w, preloaded when the list enters the viewport.
- Pointer follow in the shared loop: `x += (pointerX - x) * (1 - Math.exp(-dt / 80))`, same for
  y (about lerp 0.19 at 60 Hz); written as `translate3d(x, y, 0) rotate(3deg) scale(s)`.
- Enter (pointer enters a row): `scale 0 to 1`, `--motion-base`, `--ease-standard`. Row change:
  old image `scale 1 to 0` over `--motion-fast` with `--ease-in`, then the new one enters.
  Leave the list: exit as above. All measured on the reference row hover.
- Row state: title `text-ink-muted` to `text-ink`, the arrow icon moves 4 px right, tags go from
  `border-line` to `border-line-strong`; 200 ms `--ease-standard`. Titles never go below 4.5:1 in
  any state.
- Touch, `(hover: none)`: no floating preview. Each row shows a 64 px square thumbnail at the
  start (`object-cover`, `rounded-xs`) and the whole row is the link.
- Reduced motion: the preview appears at a fixed offset beside the hovered row, opacity only.

### StackCards

The home catalogue, after the "What we build" section of alievsspace.com (structure and
behaviour only; colours, type, icons and copy are ours).

- Section head: eyebrow, `LineReveal` H2, a lead paragraph, and the outline "all products"
  button aligned to the right on the last line (wraps under the head on phones).
- One card per top-level machine area, in admin order, as an `<ol>`. Each card is
  `position: sticky` at `calc(var(--spacing-header) + 0.75rem + var(--i) * 1rem)`, so every next
  card stops 16 px lower and the earlier ones show as a pile of 16 px edges. `min-height:
  min(66svh, 40rem)`, `rounded-md`, `shadow-stack`, a 1 px `white/15` top edge, surfaces
  rotating `navy`, `navy-raised`, `navy-deep`.
- Card grid (from 768 px): three columns, `align-items: center` on the card row. Left: the area
  name set upright and horizontal (`aria-hidden`, display weight 500, `-0.045em`, left aligned,
  at most two balanced lines, hyphenated in the language), in a `28cqw` column. Middle: the
  body, vertically centred: number (`text-label` cyan), the name as `text-h3` (the real heading
  and the link), the description summary (`on-navy-muted`, 160 characters) and one tag with the
  product count. Right: the image box, `clamp(10rem, 30cqw, 26rem)` wide and as tall as the
  card, full bleed to the top, right and bottom edges, `object-cover`. Every card in the list
  has the same height (`grid-auto-rows: 1fr` on the list, `min-height: min(66svh, 40rem)`) and
  so the same image box, whatever the source aspect ratio; a card without a cover keeps the box
  as a plain `navy-raised` panel.
- The name is split server-side into at most two balanced lines (names over 14 characters) and
  sized to fit its column: `clamp(1.75rem, (column - 2.25rem) / (chars x 0.52), min(5.5rem,
  9.5svh))`, with `cqw` units (the card is an inline-size container).
- Below 768 px the card stacks: image on top (full width, 16:9, identical on every card), then
  the name and the body as one block centred in the remaining height.
- Scroll-linked: while a later card covers card `i`, card `i` scales down by 0.045 per covering
  card (`transform-origin: 50% 0`), from cached positions in the shared loop, written only when
  the value changes.
- The whole card is one link (the title link stretched with `::after`); the image ignores the
  pointer. Hover: title underline, image `scale(1.04 to 1)`; focus ring around the card.
- Touch: identical (sticky works with native momentum scrolling).
- Reduced motion and landscape phones (`max-height: 500px`): no sticky, no scaling; a plain
  vertical list of the same cards. Without JavaScript the cards still stack (CSS only), without
  the scale.

### FooterWordmark

- The footer is `position: sticky; bottom: 0; z-index: 0`; `<main>` has `position: relative;
  z-index: 1` and a solid background, so the page lifts off the footer like a curtain without
  JavaScript.
- Layers inside the footer, back to front: background photo or `bg-navy-deep`; the wordmark;
  a foreground cut-out (AVIF with alpha: the roofline of the house or the top of a machine);
  the footer links and contact block.
- Wordmark: "CEWM" in Inter 600, `letter-spacing: -0.04em`, `font-size: 32cqi` on a
  `container-type: inline-size` box spanning the container (Inter display "CEWM" measures
  3.03 em with that tracking, so 32cqi fills about 97 % of the width), `line-height: 0.8`,
  `text-white`. Replace with the vector logotype once it exists (see `tokens.md`, Logo).
- Arrival once, when 30 % of the footer is visible: each letter rises `translateY(40% to 0)`
  inside a clip mask over `--motion-slower` with `--ease-out-expo`, 60 ms stagger.
- Reduced motion: static.

### Header

The header never gets smaller (owner, 2026-11-19). The reference's contracting island is not
used.

| State | When | Look | Motion |
|---|---|---|---|
| `clear` | Home only, while the pinned house film is behind the header: until the statement panel reaches the header or the film unpins, whichever comes first; at scroll 0 when the film is static (reduced motion, Save-Data, no film) | Full width, transparent background, white logo and links, a top scrim `from-navy-deep/60` (10 rem) over the film's own top scrim keeps 4.5:1 over bright frames | none |
| `solid` | Every other scroll position, every other page, and while the mobile menu is open | Full width, solid `bg-navy` | Background `opacity` 0 to 1 (scrim 1 to 0), `--motion-base`, `--ease-standard` |

- The logo is a real link to the locale home. Clicking it on the home page scrolls to 0
  (Lenis on fine pointers, instant with reduced motion); from any other page it navigates and the
  new page starts at 0. Reloading any page starts at 0 (`history.scrollRestoration = "manual"`
  until the first user input, so later back/forward keeps the browser's restoration); a URL with a
  hash still lands on its target.
- Same height (`h-header`, 64 to 76 px), same logo (40 / 48 px), same container padding and
  same position in both states. No `clip-path`, no `translate`, no hide on scroll: the header is
  always in view, so sticky elements offset by `--spacing-header` (spec table heads, the card
  stack) never collide with it.
- The state is computed from cached positions (`ResizeObserver`, `resize`) and the shared scroll
  listener; nothing is measured per frame.
- From 1280 px the primary links are inline (the reference collapses them; a catalogue needs
  them). Below 1280 px: logo, language switch, menu button; the menu is a full-height navy sheet
  (`data-lenis-prevent`), links stagger in with `Reveal` timing, focus trapped, Escape closes.
- Reduced motion: the background change is instant.

### Hover

Only under `@media (hover: hover)`:

| Element | Change | Timing |
|---|---|---|
| Filled button | background `navy` to `navy-raised` (or `cyan` to `white` on navy), arrow icon `translateX(4px)` | 200 ms `--ease-standard` |
| Outline button | border `line-strong` to `ink`, background stays | 200 ms |
| Text link | underline offset `4px to 2px`, colour `cyan-ink` to `ink` | 200 ms |
| Machine card | photo `scale(1.04 to 1)` inside `overflow: clip`, title underline | 600 ms `--ease-out-expo` |
| Row | see RowPreview | |

Focus-visible gets the same visual change as hover plus the focus ring.

## Reduced motion, all primitives

| Primitive | `prefers-reduced-motion: reduce` |
|---|---|
| SmoothScroll | Not created; native scroll |
| PageTransition | Instant |
| Reveal, LineReveal | Visible, no transform |
| WordReveal | Final colours |
| PanelPush | Ordinary scroll; pinned wrapper shrinks to `100svh` |
| Callouts | All visible, no line drawing |
| ClipExpand | No pin, full-bleed photo |
| CardStack | Vertical list |
| StackCards | Plain list, no sticky, no scale |
| RowPreview | Fixed offset, opacity only; touch fallback unchanged |
| FooterWordmark | Static |
| Header | Instant background change (size never changes) |
| HeroFilm | Poster image only, see `hero-scroll.md` |

## Performance budget

| Budget | Limit |
|---|---|
| Motion JavaScript, our code (`lib/motion/*`), gzip | 8 KB |
| Lenis, gzip | 5.3 KB (measured) |
| Hero film worker, gzip | 3 KB |
| Total motion JavaScript on the home page, gzip | 17 KB |
| Main-thread work per frame while scrolling, 4x CPU throttle, p95 | 8 ms |
| Frames over 34 ms in a 5 s scroll trace from the hero through the card stack, 4x throttle | 0 |
| CLS | < 0.05 |
| INP | < 200 ms |

Check with Chrome DevTools Performance at 1440 x 900, CPU 4x slowdown, and report the numbers in
the PR. Headless runs do not show GPU cost: `backdrop-filter` and large repaints must also be
traced on a mid-range Android phone.

## Measured costs (2026-11-19)

Headless Chromium 1248 (playwright-core), 1440 x 900, DPR 1, a 1600 px photo full-bleed, 3 s per
row, main-thread task time per frame from `Performance.getMetrics`. Headless rAF is not tied to
vsync (4.2 ms intervals), so these are main-thread costs only.

| Animation | x1 | x4 throttle |
|---|---|---|
| `transform` translate + scale, JS per frame | 0.48 ms | 1.48 ms |
| `opacity`, JS per frame | 0.24 ms | 1.11 ms |
| `clip-path: inset()`, JS per frame | 0.40 ms | 1.73 ms |
| `clip-path: polygon()` 4 points, JS per frame | 0.67 ms | 2.28 ms |
| `clip-path: polygon()` via WAAPI | 0.40 ms | 1.40 ms |
| 40 words, colour change per frame | 0.77 ms | 3.79 ms |
| 40 words, opacity change per frame | 0.84 ms | 3.68 ms |
| 400 x 560 card moving, no blur | 0.26 ms | 1.30 ms |
| Same card with `backdrop-filter: blur(16px)` | 0.32 ms | 1.35 ms (GPU cost not captured) |

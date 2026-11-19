---
name: cewm-design
description: Use before writing or reviewing any UI in the cewm repo - public pages, layouts, sections, components, Tailwind classes, colours, fonts, icons, motion, scroll effects, the scroll-scrubbed house film hero, images, copy on screen, and every admin (shadcn/ui) screen. The single source of truth for colour, type, spacing, radius, motion and components of cewm.az, measured from the reference film and the current brand. Triggers on "page", "component", "section", "header", "footer", "hero", "card", "spec table", "form", "button", "icon", "animation", "motion", "scroll", "transition", "responsive", "admin", "design", "UI", "style", "font", "colour", "səhifə", "bölmə", "dizayn", "komponent", "animasiya", "hərəkət", "skroll", "rəng", "şrift", "ikon", "admin panel", "mobil görünüş".
---

# CEWM design system

CEWM is the HOMAG woodworking machinery partner in Azerbaijan; its customers are furniture and
woodworking manufacturers. The site is a B2B catalogue in four languages (az default, ru, en,
de). The feel: German engineering, calm and exact. Navy carries the brand, cyan is a signal used
sparingly on navy, photography of real machines and real factories does the talking, and motion
explains structure: one pinned house film, scenes that change underneath it, steps that arrive.

Structure, rhythm and motion are measured from a reference film (a logistics site); its colours,
copy, imagery and brand are not used. Colours come from the current cewm.az.

## Read the reference you need before you build

| File | Read it when |
|---|---|
| [references/tokens.css](references/tokens.css) | Setting up `app/globals.css` (paste-ready Tailwind v4 block) |
| [references/tokens.md](references/tokens.md) | Picking any colour, checking contrast, using the logo, spacing, radius, shadow |
| [references/typography.md](references/typography.md) | Fonts, the type scale, font loading, numbers in tables |
| [references/components.md](references/components.md) | Grid, header, footer, buttons, links, machine cards, spec tables, forms, images, icons, admin theming, slop list, responsive rules |
| [references/motion-recipes.md](references/motion-recipes.md) | Any animation, scroll effect, page transition, hover, smooth scroll, the motion budget |
| [references/hero-scroll.md](references/hero-scroll.md) | The home hero film: frames, formats, loading, worker decoding, choreography |
| [references/reference-motion.md](references/reference-motion.md) | Why a motion looks the way it does: the frame-by-frame measurement and the take / leave table |

Scripts: `scripts/contrast.py` (prints the contrast table, exits 1 if an allowed pair fails),
`scripts/build_fonts.py` (rebuilds `assets/fonts/*.woff2` from the Inter source, checks
coverage, computes the fallback metrics). Run both after changing colours or fonts and paste the
output into the references.

## Precedence

| Source | Status |
|---|---|
| 1. Owner requirements (repo `CLAUDE.md` and the epic): four languages, palette from cewm.az, Iconsax rounded icons, no emojis, the scroll-scrubbed house film, smooth scroll, 360-1920 px | Always wins |
| 2. Accessibility: WCAG 2.2 AA contrast, `prefers-reduced-motion`, keyboard and focus | Wins over this skill's motion and over the reference |
| 3. This skill (`tokens.css` and the references) | The rules for everything below |
| 4. The measured reference (`reference-motion.md`) | Only for questions this skill does not answer, and only for structure and motion |
| 5. The Mebline `mebline-design` skill | Code structure patterns only. Its colours, Work Sans, Iconsax Bold, square-only radius and native-only scrolling do **not** apply here |

## Hard rules

1. **Never invent a token.** Colours, sizes, spacing, radius, shadows, easings and durations
   come from `tokens.css`. The block resets Tailwind's defaults, so `text-xl`, `rounded-lg`,
   `font-bold`, `bg-black` and `text-blue-500` produce nothing. Missing a value: add it to the
   tokens with a reason in the same PR. No arbitrary values (`text-[19px]`, `#334455`).
2. **Cyan lives on navy.** Cyan text, icons and rings only on `navy`, `navy-deep`,
   `navy-raised` (6.52-8.53:1). On white or mist it fails (2.24 and 2.07:1): use `cyan-ink`
   (5.10 and 4.71:1). A cyan fill always carries `ink` text, never white.
3. **One family: Inter**, variable with optical size; display 500 with tight tracking, text 400.
   Self-hosted subset files in `assets/fonts/`, metric-matched fallback faces, no layout shift.
   `<html lang>` always matches the locale (`uppercase` must turn `i` into `İ` in az).
4. **Icons: Iconsax Linear**, 1.5 stroke, sizes 16 / 20 / 24 / 32, `currentColor`, inline SVG
   components in `components/icons/`, no icon package in the browser. Bold only for social brand
   marks. The admin uses the same set.
5. **No emojis anywhere**, including pictographs used as bullets or icons.
6. **Motion runs on the compositor and has a reduced-motion form.** `transform` and `opacity`;
   `clip-path` only in ClipExpand and the header morph. One shared rAF loop, no layout reads in
   it. Every primitive lists its reduced-motion behaviour. Content is complete without JS.
7. **Smooth scroll is Lenis on fine pointers only** (5.3 KB gzip, `lerp: 0.08`), native on touch
   and under reduced motion. No GSAP.
8. **The hero film is a canvas over a real poster `<img>`.** The poster is the LCP element;
   frames load after `load`, decode in a worker to `ImageBitmap`, within 6.0 MB desktop and
   3.0 MB mobile; Save-Data, low memory and reduced motion get the poster only.
9. **Radius:** 0 for photos, bands and tables; 2 px controls; 4 px dropdowns; 8 px the header
   island, stacked cards and dialogs; pills for tags and icon buttons. Nothing else.
10. **Real content only.** No invented facts, numbers, customers or quotes; unknown values are
    `[placeholders]` editable in the admin. Images and videos are uploaded once and shared by
    all locales.

## Visual language in short

- Surfaces: white, `mist` bands, `navy` bands and header island, `navy-deep` footer and scrims.
- Type: split display words (56-184 px) around the film; headings 500 with negative tracking;
  13 px uppercase labels with 0.08em tracking as eyebrows; tabular figures in every table.
- Layout: `container-page`, 12 / 8 / 4 columns, `gap-column`, `py-section` (64-160 px); six
  section shapes (split display, text block, card grid, list rows, full-bleed media, pinned
  scene).
- Details that make it ours: the gable clip shape (house film and the fir tree of the logo),
  callouts with elbow leader lines on machine parts, a 2 px cyan rule on navy, the "CEWM"
  wordmark across the footer behind a cut-out photo.

## Motion in short

Tokens: `--motion-fast` 200 ms, `--motion-base` 400 ms, `--motion-slow` 600 ms,
`--motion-slower` 900 ms; staggers 60 / 120 ms; `--ease-out-expo` for arrivals,
`--ease-standard` for hover-in, `--ease-in` for exits at half the enter time, `linear` for
everything scroll-linked.

| Pattern | Primitive | Where |
|---|---|---|
| Route change | `PageTransition` | Every public route |
| Section enters | `Reveal` | Section intros, cards |
| Heading enters | `LineReveal` | H2 headings |
| Statement paragraph | `WordReveal` (muted to full colour, never transparent) | One per page |
| Scene change over a pinned subject | `PanelPush` | Home, over the film |
| Labelled parts | `Callouts` | Film, machine detail |
| Image takes over | `ClipExpand` (gable to full bleed) | Home, project opener |
| Steps that build up | `CardStack` | Service process |
| List with previews | `RowPreview` | Categories, brands, projects |
| Closing signature | `FooterWordmark` | Footer |
| Navigation | `Header` (top, island, hidden) | Every page |
| Wheel smoothing | `SmoothScroll` | Fine pointers |
| Scroll-scrubbed film | `HeroFilm` | Home hero |

Budget: motion JS 17 KB gzip in total on the home page; at 4x CPU throttle, main-thread work per
frame p95 under 8 ms and no frame over 34 ms in a 5 s scroll trace; CLS under 0.05.

## Review checklist

Before calling any UI task done:

- [ ] Screenshots at 360, 390, 768, 1024, 1440 and 1920 in az, plus ru and de for anything with
      long words; no horizontal scroll, no clipped text, no overflowing buttons.
- [ ] `grep` the diff: no emojis or pictographs, no hex colours outside the token files, no
      arbitrary Tailwind values, no `font-bold`, no `rounded-lg/xl/2xl`, no `lucide-react`.
- [ ] Every text / background pair used appears as "pass" in the contrast table in `tokens.md`;
      no cyan text or icon on white or mist.
- [ ] Keyboard: every control reachable, visible focus ring (navy on light, cyan on navy),
      Escape closes overlays, focus trapped in open overlays and returned after.
- [ ] `prefers-reduced-motion: reduce` emulated: every animated element is visible and static,
      the hero shows the poster, no pins.
- [ ] JavaScript disabled: the page is complete and readable.
- [ ] Performance trace at 4x CPU throttle while scrolling the page: report main-thread p95 per
      frame and the count of frames over 34 ms in the PR.
- [ ] Lighthouse mobile on a production build: Accessibility, Best Practices and SEO 100,
      CLS under 0.05; LCP element is the expected one (the poster on home).
- [ ] Fonts: only `inter-latin.woff2` preloaded; Cyrillic file loads only on pages with Cyrillic
      text; no layout shift when the font swaps (throttle the font request and watch
      `layout-shift` entries).
- [ ] Icons are Iconsax Linear components at 16 / 20 / 24 / 32 with `aria-label` on icon-only
      buttons.
- [ ] Images through `next/image` with real `sizes`, locale `alt`, fixed aspect ratio; only the
      hero poster has `priority`.
- [ ] Copy is real or a `[placeholder]`; none of the phrases in the slop list.

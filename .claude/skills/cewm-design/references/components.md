# Components and layout

Every class below exists in `tokens.css`. Copy on screen is owner content from the admin: the
examples in square brackets are placeholders, not copy.

## Grid

- Container: the `container-page` utility (max width 1760 px including the gutter, side padding
  `--spacing-gutter`, 20 to 48 px). Above 1760 px the margins grow; nothing stretches.
- Columns: 12 from `lg` (1024), 8 from `md` (768), 4 below. Column gap `gap-column`
  (16 to 32 px). Row gap inside grids: `gap-y-12` (48 px).
- Section rhythm: `py-section` (64 to 160 px). Sections are separated by space or by a change of
  surface (white, mist, navy), never by a border stacked on a border.
- Section shapes (use one of these, do not invent a new one per page):

| Shape | Desktop layout | Below 1024 |
|---|---|---|
| Split display | Word group A in columns 1-8 top, group B in 5-12 bottom, lead and CTA in 1-5 | Stacked, left-aligned |
| Text block | Eyebrow in 1-3, heading and body in 5-11 | Eyebrow above heading |
| Card grid | 3 columns (4 from `2xl`), cards span 4 (3) columns | 2 columns from `sm`, 1 below |
| List rows | Title 1-4, tags 5-10, arrow 12 | Title, then tags, arrow at the end |
| Full-bleed media | Edge to edge, text in the container on a scrim | Same |
| Pinned scene | Sticky stage `100svh` in a tall wrapper (`motion-recipes.md`) | Usually unpinned, see each recipe |

## Surfaces

| Surface | Class | Text | Accent |
|---|---|---|---|
| White | `bg-white` | `text-ink`, `text-ink-muted`, `text-grey` (meta) | `text-cyan-ink`, decorative `cyan` rules |
| Mist | `surface-mist` | same as white | same |
| Navy | `surface-navy` | `text-white`, `text-on-navy-muted` | `text-cyan`, focus ring switches to cyan |
| Navy deep | `bg-navy-deep text-white` | footer, scrims | `text-cyan` |

## Header

- Height `h-header` (64 to 76 px). `position: fixed`, `z-index: 50`; pages offset anchors with
  `scroll-mt-header`.
- Content: logo (left, `next/image`, height 40 px below `md`, 48 px above), primary navigation
  (from `xl`: 4-5 items, `text-small font-medium`), language switch (`AZ RU EN DE`, Iconsax
  `Global` 20 px, a dropdown listing the language names in their own language), one CTA (filled
  cyan on navy: [Əlaqə]). Below `xl`: logo, language switch, menu button (Iconsax
  `HambergerMenu` 24 px, `aria-expanded`, `aria-controls`).
- The header never gets smaller (owner decision, 2026-11-19): full width, `h-header`, logo
  40 / 48 px and the container padding stay the same at every scroll position on every page,
  and it never hides. Only the background changes (`clear` over the pinned film, `solid` navy
  everywhere else): `motion-recipes.md`, Header.
- Current page: `text-cyan` plus `aria-current="page"`.
- Mobile menu: full-height navy sheet, links `text-h3`, language and contact at the bottom,
  focus trap, Escape and the close button (Iconsax `Add` rotated 45 degrees, 24 px) close it and
  return focus to the menu button. `data-lenis-prevent` on the sheet.

## Footer

- `bg-navy-deep`, curtain reveal and the giant wordmark (`motion-recipes.md`, FooterWordmark).
- Above the wordmark, four groups in the 12-column grid: contact (address, phones, email and
  WhatsApp from the admin settings, each with its Iconsax icon at 20 px), navigation, brands
  represented (as text links, or partner logos only where the partner's brand rules allow),
  social links (Iconsax Bold brand marks, 24 px, `aria-label` with the network name).
- Bottom line: legal name, year, privacy link, `text-small text-on-navy-muted`.
- The footer is never taller than `100svh` on desktop so the curtain reveal completes.

## Buttons

| Variant | Light surface | Navy surface |
|---|---|---|
| Primary | `bg-navy text-white`, hover `bg-navy-raised` | `bg-cyan text-ink`, hover `bg-white` |
| Secondary | `border border-line-strong text-ink`, hover `border-ink` | `border border-white/40 text-white`, hover `border-white` |
| Text | `text-cyan-ink underline underline-offset-4`, hover `text-ink` | `text-cyan`, hover `text-white` |
| Icon | `size-11 rounded-full border border-line-strong`, icon 20 px | `border-white/40` |

- Shape: `h-12 px-6 rounded-xs text-small font-medium`, `inline-flex items-center gap-3`.
  Compact (`h-10 px-4`) only in the admin and inside tables.
- A trailing Iconsax `ArrowRight` (20 px) marks navigation buttons; it moves 4 px right on hover.
  Submit buttons have no arrow.
- One primary button per view. Labels are verbs: [Təklif istə], [Kataloqu yüklə].
- Loading: the label stays, a 2 px progress bar runs along the bottom edge; no spinner that never
  shows progress. Disabled: `opacity-40 cursor-not-allowed`.
- Touch target at least 44 x 44 px everywhere.

## Links

- Inline in text: `text-cyan-ink underline decoration-1 underline-offset-4`, hover `text-ink`
  and `underline-offset-2`. On navy: `text-cyan`, hover `text-white`.
- Arrow link (section ends, cards): label plus `ArrowRight` 16 px, `gap-2`, the arrow moves 4 px.
- External links get Iconsax `ExportSquare` 16 px and `rel="noopener"`; PDFs get
  `DocumentDownload` 16 px and the file size in the label ([PDF, 4.2 MB]).

## Machine card

```text
+----------------------------+
|        photo 4:3           |  bg-mist, machine cut-out object-contain, 8 % padding
|                            |  in-situ photo: object-cover
+----------------------------+
 HOMAG                          text-label text-grey uppercase
 [Model name]                   text-h4 text-ink
 [Edge thickness 0.4-3 mm]      text-small text-ink-muted tabular, 2-3 key specs max
 [Ətraflı] ->                   arrow link
```

- The whole card is one link (the title link stretched with `after:absolute after:inset-0`);
  no nested links. No price, no star ratings, no badges except one optional text label
  ([Yeni], [Mövcuddur]) as `text-label` on `bg-cyan text-ink`, top-left of the photo.
- Hover: photo `scale(1.04 to 1)` over 600 ms `--ease-out-expo`, title underline.
- Images: `next/image`, `sizes="(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"`,
  aspect fixed by the container.
- Grid: 1 column below 640, 2 from 640, 3 from 1024, 4 from 1536.

## Specification table

- A real `<table>` with `<caption>` (visually hidden if the heading says the same), `<th
  scope="row">` for parameters, `<th scope="col">` for model columns.
- Single model: two columns (parameter, value with unit), `text-small`, rows `min-h-12`,
  `border-b border-line`, zebra `even:bg-mist`. Value `tabular` and right-aligned when numeric;
  the unit in `text-grey` after a normal space.
- Comparison (2-4 models): wrapper `overflow-x-auto` with `tabindex="0"`, `role="region"` and an
  `aria-label`; the first column is `sticky left-0 bg-white` so the parameter stays visible on
  phones. Differences can be highlighted with `font-medium`, never with colour alone.
- Numbers formatted per locale with a cached `Intl.NumberFormat`; ranges with an en dash
  (`0,4–3 mm`; az, ru and de use a decimal comma, en a decimal point).
- Under the table: the brochure link (PDF, `DocumentDownload`) and the data source/date if the
  owner provides it.

## Forms

- Only on `white` or `mist`. Label above the field (`text-small font-medium text-ink`), help
  text below (`text-small text-ink-muted`), error below that (`text-small text-danger` with
  Iconsax `Danger` 16 px, linked by `aria-describedby`, field gets `aria-invalid`).
- Field: `h-12 w-full rounded-xs border border-line-strong bg-white px-4 text-base`,
  focus `outline-2 outline-navy outline-offset-2` (from the base layer), error border
  `border-danger`. Textarea `min-h-32`. Select uses Iconsax `ArrowDown2` 20 px.
- Checkbox and radio: 20 px, `border-line-strong`, checked `bg-navy` with a white Iconsax
  `TickCircle`-derived check path, label clickable.
- Phone field with a fixed `+994` prefix for az; other locales accept any international number.
- Required fields: a `*` after the label plus `aria-required`; the form starts with one line
  saying that `*` means required.
- Validation messages come from the shared zod schemas, translated per locale, shown after blur
  and on submit, never on every keystroke.
- Success: the form is replaced by one confirmation sentence and a link back, focus moves to it.

## Images

- Machine photography: cut-out machines on `mist`, consistent 3/4 front view at working height,
  4:3, the same light direction across the catalogue. Installed machines at customer sites: full
  colour, real factories, no filters, no duotone, no blur overlays.
- No stock "smiling worker" photos, no AI-generated people or machines presented as real, no
  logistics imagery from the reference.
- Square corners. Hover zoom only on cards. Scrims only `navy-deep` gradients under text.
- `next/image` everywhere with real `sizes`, AVIF and WebP, the container fixes the aspect ratio
  (zero layout shift). Only the hero poster gets `priority`.
- `alt` per locale describes the machine and model ([brand, model and machine type in the locale]); decorative images get `alt=""`.
- Images and videos are uploaded once in the admin and shared by all locales.

## Icons: Iconsax Linear

- Style: **Linear** (round caps and joins, 1.5 px stroke on the 24 px grid). It matches the thin
  hairlines, the engineering line drawings of machines and the line icons on the reference's
  cards. Bold reads heavy and consumer; Bulk and TwoTone depend on a 40 % tint that is
  unpredictable on navy and photos; Outline is Linear converted to fills (same look, but the
  stroke no longer scales with the size); Broken is playful.
- Exceptions: brand marks use the Iconsax **Bold** brand icons (`Instagram`, `Facebook`,
  `Youtube`, `Whatsapp`). Iconsax has no LinkedIn or TikTok (`Linkedin` is absent from
  iconsax-react 0.0.8, checked): draw them on the same 24 grid as a rounded square with the
  glyph cut out (`fillRule="evenodd"`).
- Sizes: 16 (inline with `text-small`, arrows in links), 20 (buttons, inputs, header actions,
  list rows, contact rows), 24 (menu, close, carousel arrows, social), 32 (process cards,
  service blocks). The stroke stays 1.5 in the 24 viewBox, so it renders 1.0, 1.25, 1.5 and
  2.0 px. No other sizes.
- Colour: `currentColor` only. Never cyan icons on light surfaces.
- Source: copy the Linear paths from `iconsax-react@0.0.8` (MIT licence per its `package.json`
  and README; 995 icons in Linear, Outline, Bold, Bulk, Broken and TwoTone; checked with
  `npm pack` on 2026-11-19) into `components/icons/iconsax.tsx`. No icon package ships to the
  browser. Keep the MIT notice in `components/icons/LICENSE-iconsax.txt` (a legal notice is
  the one allowed exception to "no comments").

```tsx
import type { ReactNode, SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: 16 | 20 | 24 | 32 };

function Linear({ size = 20, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M14.43 5.93L20.5 12l-6.07 6.07M3.5 12h16.83" />
    </Linear>
  );
}
```

- Icon-only buttons carry `aria-label` in the current locale; the SVG stays `aria-hidden`.
- Starting set (all names checked to exist in iconsax-react): `ArrowRight`, `ArrowLeft`,
  `ArrowDown2`, `ArrowRight2`, `Add` (rotated 45 degrees for close), `Minus`, `HambergerMenu`,
  `Global`, `Call`, `Sms`, `Location`, `Clock`, `DocumentDownload`, `ExportSquare`, `Setting2`
  (service), `Box` (spare parts), `Ruler`, `Flash` (power), `Weight`, `Cpu` (CNC), `Gallery`,
  `Play`, `SearchNormal1`, `Filter`, `TickCircle`, `InfoCircle`, `Danger`, `Warning2`,
  `Buildings`, `Truck`, `Calendar`, `Send2`, `Maximize4`, `Category`. Bold: `Instagram`,
  `Facebook`, `Youtube`, `Whatsapp`.

## No emojis

None anywhere: UI, copy, alt text, toasts, admin, seed data, commits, docs. That includes
emoji-like pictographs used as icons or bullets (stars, check marks, arrows, hearts, filled
circles). Bullets are CSS (a 6 px `bg-cyan-ink` square on light, `bg-cyan` on navy); arrows are
Iconsax components. Before merging: `grep -P "[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}]"`
over the diff returns nothing.

## No AI slop (for this brand)

- A centred hero with headline, sub-headline, two buttons and three icon-in-a-circle feature
  cards. Ours is the split display headline over the film.
- Gradient text, gradient blobs, mesh gradients, glows, neon borders, cyan glows on navy.
- Glassmorphism everywhere. Glass is allowed in one place only: the one arriving card of the
  card stack, fine pointers only.
- "Stats" rows with giant numbers and plus signs (`500+ machines`, `20+ years`) unless the owner
  gives a real, sourced number; testimonial carousels with stars and stock avatars; "trusted by"
  logo walls of brands that are not real partners.
- Generic copy: "Elevate your production", "Unleash precision", "Seamless solutions",
  "Innovative solutions for your business", "Ən yaxşı keyfiyyət", "Müasir həllər",
  "Передовые решения", "Innovative Lösungen". Write what the machine does, its model, its
  numbers, the customer's factory. Unknown facts are `[placeholders]` for the owner.
- Rounded `2xl` cards with soft shadows, pastel badges, coloured icons in tinted circles,
  checkmark lists in green.
- Animations that carry no information: floating particles, parallax backgrounds, marquees,
  typewriter headings, counters, cursor trails, magnetic buttons.
- Bold everywhere, all-caps headings, centred long paragraphs, mixed fonts.
- Skeleton loaders on fast connections, spinners without progress.
- Cyan used as a "tech" accent on white (it fails contrast and reads generic).

## Responsive, 360 to 1920 px

- No horizontal page scroll at any width (`main` and `footer` are `overflow-x-clip`; only spec
  tables and galleries scroll inside their own region).
- Checked at 360, 390, 768, 1024, 1280, 1440 and 1920. 360 matters for long Azerbaijani and
  German words: headings use `text-wrap: balance`, the display size uses the longest-word cap
  (`typography.md`), buttons may wrap to two lines but never overflow.
- Touch targets at least 44 x 44 px; spacing between adjacent targets at least 8 px.
- Hover-only information does not exist: everything revealed on hover is also visible or
  reachable on touch (`RowPreview` thumbnails, card links).
- Per-width changes of the motion system: film tier below 1024; card stack and callout lines
  become lists below 1024 / 768; the header shows inline links from 1280, a menu button below.
- Images: `sizes` matches the layout at each breakpoint; art-directed posters below 1024.
- Landscape phones (height under 500 px): pinned scenes and the sticky card stack are unpinned
  (`@media (max-height: 500px)`); the header stays as on every other width.

## Admin (shadcn/ui)

The admin uses the same tokens, light theme only, and Inter. UI language follows the admin
user's chosen locale (az, ru, en, de). Keep the admin stylesheet separate from the public one
(as in Mebline: a shared theme file imported by both), and add this mapping only in the admin
stylesheet:

```css
:root {
  --background: #ffffff;
  --foreground: #001941;
  --card: #ffffff;
  --card-foreground: #001941;
  --popover: #ffffff;
  --popover-foreground: #001941;
  --primary: #001941;
  --primary-foreground: #ffffff;
  --secondary: #f3f6fc;
  --secondary-foreground: #001941;
  --muted: #f3f6fc;
  --muted-foreground: #4a5a73;
  --accent: #f3f6fc;
  --accent-foreground: #001941;
  --destructive: #b3261e;
  --border: #dbdbdb;
  --input: #7b8494;
  --ring: #001941;
  --chart-1: #001941;
  --chart-2: #0076a3;
  --chart-3: #7591bd;
  --chart-4: #6d6d6d;
  --chart-5: #7b8494;
  --sidebar: #001941;
  --sidebar-foreground: #ffffff;
  --sidebar-primary: #00b9ff;
  --sidebar-primary-foreground: #001941;
  --sidebar-accent: #0b2756;
  --sidebar-accent-foreground: #ffffff;
  --sidebar-border: rgb(255 255 255 / 0.12);
  --sidebar-ring: #00b9ff;
  --radius: 0.25rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-lg: var(--radius);
  --radius-xl: var(--radius);
  --shadow-sm: 0 0 0 0 transparent;
  --shadow-md: var(--shadow-island);
  --shadow-lg: var(--shadow-stack);
}
```

- No name in this mapping collides with a type token (there is no `--text-card`, `--text-muted`
  or `--text-accent`), so `text-muted-foreground` and `bg-card` are safe. Do not add a type
  token with any of these names later.
- Every pair above is in the contrast table: `muted-foreground` (#4a5a73) on white 7.00 and on
  mist 6.46; sidebar text white on navy 17.28; `sidebar-primary` cyan with navy text 7.72; input
  borders `line-strong` 3.77.
- `--radius` is 4 px (`rounded-md` in shadcn primitives = `--radius-md` from the public tokens,
  8 px, is not remapped; `lg` and `xl` resolve to 4 px). Admin controls: `h-10` from `md`,
  `h-11` below.
- Icons: Iconsax Linear at 16 px in the sidebar and tables, 20 px in toolbars, the same
  `components/icons` set as the public site. When adding a shadcn component, replace its
  `lucide-react` icons (checkbox check, select chevron, dialog close, dropdown chevrons) with
  the Iconsax components, so the admin has no second icon set.
- Locale tabs `AZ | RU | EN | DE` above every translatable field group; AZ required; empty tabs
  show that the AZ text will be used. Media fields are outside the tabs (uploaded once).
- Status badges: `rounded-xs px-2 py-0.5 text-small`; [Dərc olunub] `bg-navy text-white`,
  [Qaralama] `border border-line-strong text-ink-muted`, [Yeni müraciət] `bg-cyan text-ink`.
  No green, amber or red pastel pills.
- Charts use `chart-1` first; one series per chart where possible.

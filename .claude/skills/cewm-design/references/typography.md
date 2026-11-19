# Typography

## Decision: Inter (variable, optical size + weight), one family

- **Display and text from one file.** Inter 4 has an optical-size axis (`opsz` 14 to 32): at 32
  it is the Inter Display design (tight, closed apertures, smaller spacing) for the split hero
  words and headings; at 14 it is the open, calm text design for body copy and specification
  tables. The browser picks the optical size from the font size (`font-optical-sizing: auto`),
  so the reference's "tight display, calm text" pairing costs one family, not two.
- **German-engineering voice.** A neo-grotesque in the Akzidenz and Helvetica line, the
  vocabulary of industrial documentation, without decorative quirks.
- **Complete for our four languages** (verified below), with tabular figures, case-sensitive
  forms and a tailed `l` (`cv05`) to keep `Il1` apart in model numbers.

Inter is common on generated sites. What keeps ours from that look is how it is set: the
Display optical size at weight 500 with -0.045em tracking at 56-184 px, split around the film,
tabular spec tables, and the absence of the usual tells (gradient text, 700-weight headings,
centred hero with three feature cards). See the slop list in `components.md`.

Runner-up: **Onest** (full coverage including `₼`, the smallest files at 24.7 + 10.4 KB) is
friendlier and rounder, with no optical-size axis; use it only if the owner rejects Inter.

## Candidates compared

All files are the upright variable fonts from `github.com/google/fonts` (`ofl/<family>/`), SIL
Open Font License 1.1, which allows self-hosting, subsetting and bundling. Coverage was read from
each file's `cmap` with fontTools 4 in a venv on 2026-11-19. Required characters: Azerbaijani
`ə Ə ı İ ğ Ğ ş Ş ç Ç ö Ö ü Ü`, German `ä Ä ö Ö ü Ü ß ẞ`, Russian `А-я Ё ё` (66), printable
ASCII (95), symbols `₼ € № « » „ " " ' ' – — … ° × ± ² ³ ·`.

| Family | az | de incl. `ẞ` | ru | Symbols | `tnum` | Axes | WOFF2 Latin + az + de | WOFF2 Cyrillic | Character |
|---|---|---|---|---|---|---|---|---|---|
| **Inter 4.001** | all | all | all | all | yes | `opsz` 14-32, `wght` 100-900 | 52.8 KB (wght 400-700) | 18.4 KB | Neo-grotesque with a true display cut; neutral, technical |
| Inter Tight | all | all | all | all | yes | `wght` 100-900 | 32.9 KB (400-700) | 11.1 KB | Inter with display spacing at every size; too tight for 16 px body |
| Onest | all | all | all | all | yes | `wght` 100-900 | 24.7 KB (400-700) | 10.4 KB | Rounded grotesque, friendly; no optical size |
| Geologica | all | all | all | all | yes | `wght`, `CRSV`, `SHRP`, `slnt` | 23.8 KB (400-700, other axes pinned) | 13.5 KB | Geometric-humanist, wide; reads soft and "tech startup" |
| Geist | all | all | all | missing `₼` | yes | `wght` 100-900 | 20.4 KB (400-700) | 9.6 KB | Swiss and tight, but the Next.js starter default |
| Golos Text | missing `ə Ə` | all | all | missing `₼` | yes | `wght` 400-900 | 35.8 KB (full range) | 19.9 KB | Russian UI face; fails Azerbaijani |
| Manrope | missing `Ə` | all | all | missing `₼` | yes | `wght` 200-800 | 23.3 KB (full range) | 13.2 KB | Semi-geometric; fails Azerbaijani capitals |
| IBM Plex Sans | all | all | all | missing `₼` | no `tnum` feature | `wdth` 75-100, `wght` 100-700 | 52.9 KB (full range) | 39.7 KB | Engineering grotesque, but heavy and no tnum |
| Wix Madefor Display | missing `ə Ə` | all | all | missing `₼` | no | `wght` 400-800 | 18.5 KB (full range) | 12.5 KB | Display only, fails Azerbaijani |
| Hanken Grotesk | all | all | none | missing `₼` | no | `wght` 100-900 | 32.0 KB | none | No Cyrillic |
| Archivo | all | all | none | all | yes | `wdth`, `wght` | 86.0 KB | none | No Cyrillic |
| Mona Sans | missing `ə Ə` | all | none | missing `₼` | yes | `wdth`, `wght` | 104.0 KB | none | No Cyrillic |
| Instrument Sans | missing `ə Ə` | all | none | missing `₼ № ± ² ³` | yes | `wdth`, `wght` | 68.0 KB | none | No Cyrillic |

"(400-700)" sizes are the instanced files with this repo's feature set; "(full range)" sizes are
from the first pass with every axis and a larger feature set, so they are higher than a final
build would be. Specimens of the five complete candidates were rendered and compared at 110 px
display and 26 px text in az, de, ru and a spec line before the decision.

## Shipped files

Built by `scripts/build_fonts.py` from `Inter[opsz,wght].ttf` (Inter 4.001, google/fonts):
weight axis cut to 400-700, `opsz` kept, no hinting, layout features `ccmp locl mark mkmk kern
liga calt rvrn tnum lnum case cv05`.

| File | Size | Glyphs | Content |
|---|---|---|---|
| `assets/fonts/inter-latin.woff2` | 51.9 KB (53,112 B) | 530 | Basic Latin, Latin-1, `Ə ə Ğ ğ İ ı Ş ş Œ œ ẞ`, combining marks, punctuation, `₼ € № ™`, arrows, minus. Preloaded |
| `assets/fonts/inter-cyrillic.woff2` | 18.4 KB (18,820 B) | 144 | `U+0400-045F`, `Ґ ґ`, `Ұ ұ`. Not preloaded; downloads only when a Cyrillic character renders |
| `assets/fonts/OFL.txt` | | | The licence, shipped with the fonts |

Verification output of the script (2026-11-19), reading the shipped files back:

```text
shipped files cover az: 14/14
shipped files cover de: 8/8
shipped files cover ru: 66/66
shipped files cover en: 95/95
shipped files cover symbols: 19/19
inter-latin.woff2: glyphs 530, axes opsz 14-32, wght 400-700, GSUB calt case ccmp cv05 locl tnum
inter-cyrillic.woff2: glyphs 144, axes opsz 14-32, wght 400-700, GSUB
```

The file size changes by a few bytes on every rebuild (fontTools writes a new `head.modified`
timestamp); the glyph set does not.

## Loading in Next.js

```ts
import localFont from "next/font/local";

const LATIN =
  "U+0000-00FF, U+0130-0131, U+011E-011F, U+015E-015F, U+018F, U+0259, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0300-0301, U+0303, U+0307-0308, U+0327, U+1E9E, U+2000-206F, U+20AC, U+20BC, U+2116, U+2122, U+2190-2193, U+2212, U+2215";
const CYRILLIC = "U+0400-045F, U+0490-0491, U+04B0-04B1";

export const interLatin = localFont({
  src: "../assets/fonts/inter-latin.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--font-inter-latin",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: LATIN }],
});

export const interCyrillic = localFont({
  src: "../assets/fonts/inter-cyrillic.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-inter-cyrillic",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: CYRILLIC }],
});
```

`<html lang={locale} className={`${interLatin.variable} ${interCyrillic.variable}`}>`. The
`lang` attribute must match the locale: CSS `uppercase` maps `i` to `İ` only under `lang="az"`.

`adjustFontFallback: false` is required. Inter sets `OS/2.fsSelection` bit 7
(`USE_TYPO_METRICS`, verified), so browsers lay it out with the typo metrics (ascender 1984,
descender -494, line gap 0 on 2048 units). next/font's automatic fallback uses the hhea metrics
and Arial only. The fallback faces in `tokens.css` are written by hand from the typo metrics and
measured advance widths instead.

Without next/font (plain CSS), the equivalent faces are:

```css
@font-face {
  font-family: "Inter";
  src: url("../assets/fonts/inter-latin.woff2") format("woff2");
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0130-0131, U+011E-011F, U+015E-015F, U+018F, U+0259, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0300-0301, U+0303, U+0307-0308, U+0327, U+1E9E, U+2000-206F, U+20AC, U+20BC, U+2116, U+2122, U+2190-2193, U+2212, U+2215;
}
@font-face {
  font-family: "Inter";
  src: url("../assets/fonts/inter-cyrillic.woff2") format("woff2");
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0400-045F, U+0490-0491, U+04B0-04B1;
}
```

and the stacks in `tokens.css` name `"Inter"` instead of the two variables.

## Metric-matched fallback faces

From `scripts/build_fonts.py`: `size-adjust` is the mean of the advance-width ratios of four
sample sentences (az, en, ru, de) between Inter and the fallback; each override is the typo
metric divided by units per em and by `size-adjust`.

| Face | Matches | Per-language width ratio | `size-adjust` | `ascent-override` | `descent-override` | `line-gap-override` |
|---|---|---|---|---|---|---|
| `Inter Text Fallback` (Arial, Liberation Sans, Arimo) | opsz 14, wght 400 | az 105.68, en 106.32, ru 106.34, de 106.00 % | 106.09 % | 91.32 % | 22.74 % | 0 % |
| `Inter Text Fallback Roboto` (Android) | opsz 14, wght 400 | az 107.29, en 107.64, ru 105.07, de 107.05 % | 106.76 % | 90.74 % | 22.59 % | 0 % |
| `Inter Display Fallback` (Arial, Liberation Sans, Arimo) | opsz 32, wght 500 | az 98.59, en 99.12, ru 100.40, de 99.64 % | 99.44 % | 97.42 % | 24.26 % | 0 % |
| `Inter Display Fallback Roboto` (Android) | opsz 32, wght 500 | az 100.09, en 100.35, ru 99.20, de 100.62 % | 100.07 % | 96.81 % | 24.11 % | 0 % |

`local("Liberation Sans")` and `local("Arimo")` are listed because Linux CI has no Arial; Android
has neither and falls through to the Roboto faces.

Checked in headless Chromium 1248 (2026-11-19) by laying out the same elements with Inter and
with the fallback face: 17 px paragraphs at 560 px wide had identical width, height and baseline
in all four languages; 96 px single-line display headings had identical height and baseline
(plain Arial: baseline off by 2 px) and widths within -29 to +20 px (2-3 %).

## Scale

Fluid between 360 and 1440 px (display: 360 to 1920). Line height, tracking and weight come with
each size utility.

| Utility | 360 | 768 | 1440 | 1920 | Line height | Tracking | Weight | Use |
|---|---|---|---|---|---|---|---|---|
| `text-display` | 56 | 89.5 | 144.6 | 184 | 0.92 | -0.045em | 500 | The split hero words, the footer wordmark (600) |
| `text-h1` | 40 | 58.1 | 88 | 88 | 1.0 | -0.035em | 500 | Page title, hero statement |
| `text-h2` | 32 | 42.6 | 60 | 60 | 1.05 | -0.03em | 500 | Section headings |
| `text-h3` | 24 | 28.5 | 36 | 36 | 1.15 | -0.02em | 500 | Card titles in stacks, sub-sections |
| `text-h4` | 20 | 21.5 | 24 | 24 | 1.25 | -0.01em | 500 | Machine card title, list row title |
| `text-lead` | 18 | 19.5 | 22 | 22 | 1.5 | 0 | 400 | Intro paragraph |
| `text-base` | 16 | 16.4 | 17 | 17 | 1.6 | 0 | 400 | Body |
| `text-small` | 14 | 14.4 | 15 | 15 | 1.5 | 0 | 400 | Buttons, captions, footer links, table cells |
| `text-label` | 13 | 13 | 13 | 13 | 1.4 | 0.08em | 500 | Eyebrows and labels, uppercase, `font-feature-settings: "case"` |

Rules:

- Weights: 400 text, 500 headings, labels and buttons, 600 only for the footer wordmark and
  `<strong>`. 700 is in the file but not used. `font-bold` does not exist.
- Nothing smaller than 13 px. Body line length 60-75 characters (`max-w-[68ch]` is not allowed;
  use the grid: body text spans 6 of 12 columns on desktop).
- Long Azerbaijani words: the display size is capped per headline so the longest word fits.
  The headline component sets `--longest` (character count of the longest word, from the server)
  and uses `font-size: min(var(--text-display), calc((100cqi - 2 * var(--spacing-gutter)) / (var(--longest) * 0.56)))`
  inside a `container-type: inline-size` wrapper. 0.56 em per character is the widest measured
  mixed-case average at opsz 32, wght 500, -0.045em tracking ("Деревообрабатывающие" 0.545,
  "Holzbearbeitungsmaschinen" 0.462, "Avadanlıqlarımız" 0.410). Display words are never set in
  capitals (0.668 em per character). Never hyphenate display words.
- Numbers in specification tables, prices and dimensions: `tabular` utility
  (`tabular-nums lining-nums`) and `font-feature-settings: "cv05"` for model codes.
- Do not set `font-variation-settings` globally: it overrides automatic optical sizing.
- Headings `text-wrap: balance`, paragraphs `text-wrap: pretty` (in `tokens.css`).
- Units: a thin space before units is not used; a normal space (`3 680 mm`, `18,5 kW`) with the
  locale's decimal separator from `Intl.NumberFormat(locale)` (cached, never per frame).

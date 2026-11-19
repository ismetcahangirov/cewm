# Reference: the logistics site film

Source: `C:\dev\cewm-ref\pin-959477895687260086.mp4` (Pinterest pin 959477895687260086), 28.03 s,
720 x 1280, 30 fps, H.264 with AAC audio. It is a phone-format screen recording of a desktop
site: the browser viewport sits at x 53-667, y 441-838 of the video (614 x 397 px), which is a
1440 x 930 desktop viewport scaled by 0.426. All pixel values below are converted back to that
1440 px viewport (1 video px = 2.35 px).

Measured on 2026-11-19:

- Per-frame activity profile of the cropped viewport (mean absolute luminance difference, share of
  changed pixels) for all 840 frames, to find every motion burst and its start and end frame.
- Dense contact sheets at 30 fps (15 fps or 10 fps for slow passages) around every burst, with the
  frame number burned into each tile, and full-size 2x crops of the key frames; every PNG was read.
- Vertical scroll speed by row matching between consecutive frames (pixels per 33 ms frame).
- Easing by fitting cubic-bezier curves to the size of the hovered list image frame by frame
  (RMSE of normalised progress).

Frame `fN` means frame N at 30 fps; one frame is 33.3 ms. Timings are measured and rounded.
Scroll-linked motion has no fixed duration: its milliseconds describe this recording only, so it
is also given as scroll distance.

Take structure, rhythm and motion. Colour, copy, brand and content are ours: the orange palette,
the logistics imagery, the shipping container and the "Setby" brand are not taken.

## Screens

| # | Screen | Structure |
|---|---|---|
| 1 | Hero | Two huge tight grotesque words: one top-left, one bottom-right, the 3D object hangs between and overlaps both. Left rail: small meta line and a circular "watch" badge. Right rail: a small portrait card and three stacked stats. Bottom-left: one filled CTA. Full-width header: logo, four links, dark "Contact us" button. |
| 2 | Statement panel | Full-bleed brand-colour panel that slides over the pinned object. Centred eyebrow (small slanted mark + spaced caps), a 4-line statement, one dark button. |
| 3 | Pinned object with callouts | The object, now in its second colourway, pinned in the centre. Eyebrow left, a two-line label in the middle, a paragraph right. Four callouts (label + elbow leader line + small frosted square on a corner of the object). |
| 4 | Image takeover | A photo appears inside the object's silhouette, then the clip grows through a skewed hexagon to full bleed. The brand's parallelogram motif sits in the bottom-right corner. |
| 5 | Stacked process cards | Four portrait cards (number, title, line icon, one sentence) stack on the left over the full-bleed photo; a vertical progress rail with four squares on the right. |
| 6 | Project list | Eyebrow left, a two-line heading right with a dark button. Four rows separated by hairlines: title, three outlined pill tags in a mono face, arrow at the far right. |
| 7 | Footer | Giant wordmark across the full width, layered between the sky and a foreground photo (the wordmark is behind the containers). Footer links and a "Talk to us" button sit on the photo. |

## Motion, moment by moment

| Moment | What happens | Frames | ~ms | Easing guess |
|---|---|---|---|---|
| Hero hover lens | A circle about 27 % of the viewport width (about 390 px) follows the cursor across the object and shows it in a second colourway, clipped to the object's outline. Each cursor move settles in about 14 frames; the per-frame change decays by about 0.73 per frame. | f13-f27, f34-f50, f55-f70 | 470-530 per move | Exponential follow, lerp about 0.15 per 60 Hz frame |
| Lens exit | The circle slides off the object edge and disappears with it. | f76-f80 | 130 | Follow, then clipped by the object |
| Scroll starts | The page content moves up; the object stays where it is (sticky). Peak speed 61 px per frame (about 1830 px/s). | from f99 | | Smoothed wheel scroll |
| Header morph | The full-width bar contracts into a centred island about 40 % of the viewport wide: the logo slides right, the button slides left, the four links fade and blur out while a menu icon fades in at the centre. | f106-f136 | 1000, during about 770 px of scroll | Scroll-linked or a long ease-out; not separable in the recording |
| Island fill | The island gets a translucent fill once it sits over the colour panel. | f130-f136 | 200 | Ease-out |
| Panel push | A full-bleed colour panel scrolls up over the sticky object; under the panel the object has already changed colourway, so the panel acts as a wipe. | f106-f128 | 730 at this scroll speed; one viewport of scroll | Plain scroll, no easing of its own |
| Word reveal | The 17-word statement reveals word by word with scroll: each word goes from nearly invisible to faint (about 30 % opacity) to solid. The eyebrow types in letter by letter. | f112-f138 (eyebrow f126-f136) | 870, during about 600 px of scroll: about 35 px per word, about 0.65 viewport for the paragraph | Linear in scroll per word |
| Panel exit | The panel scrolls up and away, uncovering the object in its new colourway, still pinned. | f172-f192 | 670 | Plain scroll |
| Section copy in | Eyebrow, label and paragraph of the next section fade in. | f194-f200 | 200 | Ease-out |
| Callouts in | Four callouts fade in from a soft blur, all within two frames of each other. | f234-f240 | 200 | Ease-out |
| Object zoom and turn | The pinned object grows about 8 % and then turns about 3 degrees with scroll. | f233-f256, f270-f296 | 770 and 870 | Scroll-linked |
| Object to photo | The object and its callouts fade out while a photo fades in, clipped to the object's silhouette. | f314-f328 | 470 | Ease-in-out cross-fade |
| Polygon to full bleed | The clip grows from the object silhouette to a skewed hexagon to the full viewport; the brand parallelogram slides in at the bottom-right corner. | f346-f387 | 1370 at this scroll speed | Scroll-linked |
| Card 1 in | The first card rises from below the viewport and settles with a small rotation (about -3 degrees). The progress rail appears. | f382-f396 (rail f390) | 470 | Ease-out |
| Card 2 in | The next card rises as frosted glass, lands about 28 px lower than the previous card's top, and turns solid; the card underneath is blurred through it. | travel f435-f450, glass to solid f437-f455 | 500 travel, 600 fill | Ease-out |
| Cards 3 and 4 | Same pattern, alternating tilt. | f484-f500, f524-f544 | 530, 670 | Ease-out |
| Section leaves | The image section scrolls away normally (it is not pinned at the end). | f560-f576 | | Plain scroll |
| Heading line reveal | The list heading reveals line by line, each line sliding up inside a mask. | f576-f592 | about 170 per line, 170 stagger | Ease-out |
| Row hover in | Hovering a row darkens its title from grey to black and its tags from dim to full; a photo tilted about +5 degrees scales from 0 to 1 next to the row title. In this capture the photo is anchored to the row, not to the cursor (the cursor sits at the far right). | f609-f621 | 400 | CSS `ease`, RMSE 0.027 |
| Row change | The photo of the old row shrinks to nothing, then the next row's photo grows at the new row. | shrink f651-f657, grow f663-f675 | 200 out, 400 in | Out: `ease-in` (0.42, 0, 1, 1), RMSE 0.025. In: `ease` |
| Row hover out | The photo shrinks away when the pointer leaves the list. | f711-f726 | 500 (slow mouse-out) | Ease-in |
| Footer arrives | Fast scroll (peak 80 px per frame, about 2400 px/s); the wordmark and the photo rise into view; the header slides out of the way. | f730-f754 (header f755) | 800 | Plain scroll |
| Inertia | After the last wheel input the speed decays by about 12 % per 33 ms frame (f567-f593: 75 to 5 px per frame) and the tail lasts 0.9 to 1.3 s. | f567-f593, f730-f758 | 900-1300 tail | Smoothed scroll; equivalent to Lenis `lerp` about 0.065 at 60 Hz |
| End | f760 onwards is a static hold of the footer; the cut at 25.30 s is the end of the recording loop, not a site transition. | f760-f840 | | |

Scroll velocity profile, pixels per frame at 1440 x 930 (f567-f593):
`75 61 56 47 42 38 33 28 23 14 23 19 23 23 19 19 14 14 9 9 9 9 5 5 5 5`.

## What makes it work

- One object carries the first half of the page. It stays pinned while everything else changes
  around it: words, colour panel, callouts, finally the photo that grows out of its silhouette.
  The page reads as one continuous scene, not a stack of sections.
- Scale contrast: two display words at about 15 % of the viewport width against 11-13 px meta text.
- Rhythm: short ease-out moves of 200-600 ms on top of long scroll-linked moves of one viewport;
  nothing loops, nothing moves on its own.
- Every reveal is tied to reading: words appear at reading pace, cards appear one step at a time.
- Hover states change one thing at a time (the row's ink and one photo), with an asymmetric
  400 ms in, 200 ms out.

## What it gets wrong for us

- The hover lens only works with a pointer and needs a second render of the object. A machinery
  catalogue has hundreds of products, not one hero object.
- The word reveal starts with words at about 30 % opacity on orange, which fails contrast while
  it is partly revealed and leaves text unreadable if the user stops scrolling halfway.
- Frosted-glass cards over a busy photo, mono pill tags at about 10 px and grey row titles are
  below WCAG contrast.
- The header collapses all links into a menu icon on desktop, which hides the catalogue
  navigation that a B2B buyer needs.
- Scroll is smoothed everywhere with a long tail (about 1.2 s), which feels floaty for a
  precise engineering brand.

## What we take, and what we leave

| Take | From | Becomes in ours |
|---|---|---|
| Split display words around a central subject | Hero | Hero headline split top-left / bottom-right over the house film canvas (`hero-scroll.md`) |
| One pinned subject across several scenes | Screens 1-4 | The scroll-scrubbed house film is the pinned subject of the home page |
| Panel push as a wipe that changes the scene underneath | Panel push, f106-f192 | `PanelPush`: a navy panel scrolls over the pinned film; under it the film has moved on |
| Word reveal tied to scroll | f112-f138 | `WordReveal`: about 0.6 viewport per paragraph, but words change colour from `on-navy-muted` (5.38:1) to white (17.28:1) instead of fading in from transparent, so every state passes AA and the text is complete without JS |
| Callouts with leader lines anchored to the subject | f234-f240 | `Callouts` on the film and on machine detail photos (anchored to machine parts) |
| Clip-path growth from a shape to full bleed | f346-f387 | `ClipExpand` from the gable of the house (our own shape from the house film and the fir tree of the logo) to full bleed |
| Stacked cards with offset and alternating tilt | f382-f544 | `CardStack` for the service process, 28 px offset, tilt halved to +/-2 degrees, navy glass to solid navy |
| Line reveal of headings in a mask | f576-f592 | `LineReveal` for section headings, 120 ms stagger |
| Row hover with one tilted photo, 400 ms in / 200 ms out | f609-f675 | `RowPreview` on the machine category list, following the pointer with a lerp, static thumbnail on touch |
| Giant wordmark layered behind a foreground photo | Footer | `FooterWordmark`: "CEWM" across the full width behind a cut-out machine or house photo |
| Header contracting into an island | f106-f136 | Not taken (owner, 2026-11-19: the header must not get small). The bar keeps its full size; only its background changes from clear over the film to solid navy |
| Smoothed wheel scroll | Inertia | Lenis on fine pointers only, `lerp` 0.08 (a little crisper than the measured 0.065) |
| Asymmetric enter / exit easing | Row hover | `--ease-standard` in, `--ease-in` out, out is half the in time |

| Leave | Why |
|---|---|
| Orange palette, logistics photos, the container, "Setby" brand, its copy | Not ours; brand colours come from cewm.az (navy, cyan) |
| The cursor lens with an alternate colourway | Needs a second render per subject, pointer only, decorative |
| Collapsing all desktop links into a menu icon | Hides catalogue navigation on desktop |
| Partially transparent text as a resting state | Fails contrast if the user stops scrolling |
| Mono pill tags at about 10 px, grey row titles | Below WCAG AA |
| Frosted glass on every card | Costly on the GPU, unreadable over busy photos; we keep one glass moment per card and end solid |
| The brand parallelogram corner motif | Their logo shape; our corner detail comes from our own mark |

Character in one line: long scroll-linked moves of about one viewport, short ease-out arrivals of
200-600 ms, asymmetric exits at half the time, no loops, one pinned subject.

## How to repeat the measurement

```bash
FF=$(python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
IN=/c/dev/cewm-ref/pin-959477895687260086.mp4
"$FF" -y -copyts -i "$IN" -vf "select='between(t,3.2,5.1)',crop=614:396:53:442,scale=307:198,drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':text='f%{eif\:t*30+0.5\:d}':x=4:y=4:fontsize=13:fontcolor=white:box=1:boxcolor=black@0.7,tile=6x10" -frames:v 1 dense_panel.png
"$FF" -y -ss 3.93 -i "$IN" -frames:v 1 -vf "crop=614:396:53:442,scale=1228:-1:flags=lanczos" full_3.93.png
```

The activity profile, scroll tracking and easing fits were small numpy scripts over the cropped
frames (`crop=614:396:53:442,scale=307:198`, raw RGB); they are not kept in the repo.

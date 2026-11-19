# Hero: the scroll-scrubbed house film

The home hero is a photoreal film of a house (timber frame, glazing, interior joinery: the
things CEWM's customers build on HOMAG machines), drawn frame by frame on a canvas while the
section is pinned. Scrolling moves the film forward and back. This file gives the exact numbers;
measurements were taken on 2026-11-19 from `C:\dev\cewm-ref\homag-hero.mp4` (the sample film:
20.04 s, 980 x 420, 25 fps, H.264) and are marked **measured**; everything derived from them is
marked **estimate** and must be re-measured on the real render.

## The film itself

- The sample is 980 px wide: too small for production (it would be upscaled 1.6x on a 1600 px
  canvas). The owner supplies, or we render, two masters: **desktop 1920 x 1080 (16:9)** and
  **mobile 1080 x 1920 (9:16)** with its own camera framing (a centre crop of the landscape film
  loses the house).
- One continuous camera move, no cuts (cuts make scrubbing feel broken), no motion blur baked in
  above 180 degree shutter, constant exposure. The sample's cross-dissolves would show as
  ghosting when scrubbed slowly.
- Sampled evenly over its duration to the frame counts below; the source frame rate does not
  matter.

## Frames, sizes, pin length

All three tiers carry the same 300 frames of one continuous camera move (`manifest.json` version 3).

| Tier | Used when | Frame size | AVIF | Bytes (all frames) |
|---|---|---|---|---|
| Wide | viewport >= 1024 CSS px, `deviceMemory` > 4 (or unknown) and cover width x DPR > 1600 x 1.08 (1920 px screens at DPR 1, 1536 CSS px at DPR 1.25, 2560 px) | 1920 x 1080 | crf 34 | 9.95 MB |
| Desktop | viewport >= 1024 CSS px and the wide condition is false (1440 px at DPR 1, laptops) | 1600 x 900 | crf 36 | 7.17 MB |
| Mobile | viewport < 1024 CSS px, or `deviceMemory` <= 4 | 608 x 1080 (native centre crop of the landscape master) | crf 34 | 3.30 MB |

- Canvas backing store ratio = `min(devicePixelRatio, 2, tier.width / coverCssWidth)`: the canvas
  is never larger than the frame's native cover size, so the player never upscales; on a 2560 px
  screen the 1920 px canvas is stretched by the compositor, which halved the refresh interval cost
  against a 2560 px canvas (measured: 16.6 ms to 8.4 ms median while scrolling).
  `imageSmoothingQuality = "high"`, set again after every canvas resize.
- Why the film was re-made: v2 (1600 x 900 at crf 41, SSIM 0.947 against the master) was blotchy
  and was upscaled 1.2x on a 1920 px canvas. v3 uses lower crf and a 1920 tier.
- Scroll per frame is whatever the pin length gives (about 9 px per frame on desktop); the player
  blends between frames every refresh (below), so a step of one frame is no longer a visible jump.

## Format: AVIF, WebP as fallback

**Measured** on 24 frames sampled evenly across the sample film, libaom-av1 (`-still-picture 1
-cpu-used 4`, yuv420p) and libwebp (`-compression_level 6`), SSIM against the PNG source:

| Size | Codec | Mean KB | Max KB | SSIM |
|---|---|---|---|---|
| 980 x 420 | WebP q80 | 39.7 | 59.8 | 0.9852 |
| 980 x 420 | WebP q70 | 31.5 | 47.7 | 0.9795 |
| 980 x 420 | WebP q60 | 28.2 | 43.2 | 0.9766 |
| 980 x 420 | AVIF crf 28 | 25.4 | 39.6 | 0.9813 |
| 980 x 420 | AVIF crf 32 | 20.8 | 32.9 | 0.9758 |
| 980 x 420 | AVIF crf 38 | 14.9 | 24.0 | 0.9634 |
| 640 x 274 | WebP q60 | 16.1 | 24.3 | 0.9703 |
| 640 x 274 | AVIF crf 32 | 12.2 | 19.4 | 0.9677 |
| 640 x 274 | AVIF crf 28 | 14.9 | 23.3 | 0.9756 |

At equal SSIM AVIF is 24-26 % smaller (AVIF crf 32 0.9758 at 20.8 KB against WebP q60 0.9766
at 28.2 KB). **Decision:** AVIF crf 32 for frames, AVIF crf 24 for the poster. A WebP q60 set is
encoded too and used only when the worker cannot decode a 1 x 1 AVIF probe.

**Measured** decode in a worker, `createImageBitmap(blob, { resizeWidth, resizeHeight,
resizeQuality: "high" })`, headless Chromium 1248 on this development PC:

| Frame | AVIF median / p95 | WebP median / p95 | `drawImage` + flush, median / p95 |
|---|---|---|---|
| 640 x 274 | 3.3 / 3.8 ms | 2.1 / 2.5 ms | 0.1 / 0.2 ms |
| 980 x 420 | 5.5 / 6.8 ms | 4.0 / 4.7 ms | 0.2 / 0.3 ms (0.8 / 1.7 ms at 4x CPU) |
| 1600 x 686 (upscaled sample) | 9.3 / 10.4 ms | 9.0 / 10.9 ms | 0.5 / 2.6 ms |

DevTools CPU throttling does not slow worker decoding (the 4x runs matched the 1x runs), so
phone decode times are not measured here; **estimate** 3-5x slower, about 30-45 ms per desktop
frame and 25-35 ms per mobile frame. That is why decoding is windowed and ahead of the scroll.

Bytes per frame at production sizes, **estimate**: a power fit on the measured 640 and 980 px
widths gives 47 KB for 1600 x 900 and 35 KB for 720 x 1280 at AVIF crf 32; the 1600 px upscaled
sample gave 30.5 KB, a lower bound because upscaling removes detail. Budget with the upper
values until the real film is measured.

## Byte budget

| Item | Wide | Desktop | Mobile |
|---|---|---|---|
| Poster (frame 0, via `next/image`) | about 350 KB source, served resized | same | about 150 KB source |
| All 300 frames | 9.95 MB | 7.17 MB | 3.30 MB |
| `manifest.json` with `motion` and `pace` | about 12 KB | same | same |
| **Total, hard limit (all after `load`)** | **10.0 MB** | **7.2 MB** | **3.3 MB** |

Frames are never downloaded before the LCP and never on Save-Data or slow connections (below).
Bytes before interactive are unchanged: the poster only. If a new render exceeds the limit,
raise the crf by 2 before dropping frames. v2 budget was 6.0 / 3.0 MB.

## Loading order

1. HTML: the poster `<img>` (frame 0) with `priority` / `fetchPriority="high"`, the headline as
   HTML text over it. This is the LCP element.
2. After `window` `load` and one `requestIdleCallback` (timeout 2000 ms), and only if the hero is
   in the viewport: create the worker, fetch `manifest.json` (`{ version, desktop: { count,
   width, height }, mobile: {...}, formats: ["avif", "webp"] }`).
3. Fetch frames in passes, nearest to the current frame first inside each pass: every 8th
   (0, 8, 16...), then every 4th, every 2nd, then the rest. At most 6 requests in flight,
   `fetch(url, { priority: "low" })`. The poster stays visible until frame 0 or the nearest
   frame is drawn on the canvas; then the poster fades out over 200 ms.
4. Scrubbing starts after the every-8th pass. Until a frame is decoded, the nearest decoded
   frame is drawn (never a blank canvas).
5. `visibilitychange` to hidden pauses fetching and decoding.

Files live in object storage under a versioned path, served with
`Cache-Control: public, max-age=31536000, immutable`:
`film/<film-id>/v<version>/desktop/0001.avif`. A new film or a re-encode gets a new version;
nothing is ever overwritten in place (browsers keep showing old cached frames otherwise). The
film is uploaded once in the admin and shared by all four locales.

## Decoding in a worker, with a memory window

- The worker keeps every downloaded frame as a compressed `Blob` and decodes on demand with
  `createImageBitmap(blob)` at the tier's native size, then transfers the `ImageBitmap` to the
  main thread. Never decode or resize on the main thread, and never draw an `<img>`.
- Window of decoded bitmaps, with the bias in the scroll direction (3x lead):

| Tier | Ahead | Behind | Bitmap | Window memory |
|---|---|---|---|---|
| Wide | 10 | 3 | 1920 x 1080 x 4 B = 8.3 MB | about 108 MB (measured peak 124 MB) |
| Desktop | 12 | 4 | 1600 x 900 x 4 B = 5.76 MB | about 98 MB |
| Mobile | 12 | 4 | 608 x 1080 x 4 B = 2.6 MB | about 44 MB |
| `deviceMemory` <= 4 | 8 | 3 | mobile tier | about 29 MB |

- There is **no half-size fallback ladder**. A frame that is not decoded yet is replaced by the
  nearest decoded frame (preferring one at or before the position), warped toward the position
  by up to 3 frames. A smaller bitmap is never drawn: v2 switched to 800 x 450 bitmaps on fast
  scrolls and the picture visibly softened and stepped backwards.
- Fetch order: the window around the fractional position first (3x lead in the scroll
  direction), then every 8th, 4th, 2nd and remaining frame. Decode order: floor, floor + 1, ahead.

## Scroll to frame, sub-frame blend

```ts
const progress = clamp((scroll.y - stageTop) / (stageHeight - viewportHeight), 0, 1);
const linear = progress * (frameCount - 1);
const position = paceInverse(linear);
const k = Math.floor(position);
const fraction = position - k;
```

- `pace` (manifest, 300 cumulative values from the measured motion of the master) maps the linear
  position to the frame position, so every pixel of scroll moves the picture by the same amount
  even where the source steps are uneven (measured 4.7 to 14.8 px per step). The shift is capped
  at 0.75 frame so chapters stay aligned with their text.
- Every refresh while the position moves: frame `k` is warped forward by `fraction` of the
  measured step (`manifest.motion`, `[scale, tx, ty]` per step, translation in frame-height
  units) and drawn at alpha 1, then frame `k + 1` is warped backward and drawn at alpha
  `fraction`, both clamped to cover. Measured on the master: interpolating a frame from its
  neighbours gives 32.0 dB with this warp against 26.3 dB for a plain blend and 23.4 dB for
  holding the frame. Without `motion` the player cross-fades plainly.
- Reason: at slow scroll 86 % of refreshes showed no new image and then the picture jumped one
  whole frame (6.7 px). With the blend 0 % of refreshes are blank.
- `scroll.y` comes from the shared loop (`motion-recipes.md`), never from `window.scrollY`.
- Tell the worker the position and velocity at most every 50 ms so the window moves ahead.

## LCP strategy

- The poster is a real `<img>` rendered by `next/image` (`priority`, `sizes="100vw"`,
  `fetchPriority="high"`), art-directed with `getImageProps()` into a `<picture>`: the portrait
  poster below 1024 px, the landscape one above. It is the LCP element and is identical to
  frame 0, so the hand-over to the canvas is invisible.
- The canvas is created by client code after `load`; it is not in the server HTML. No frame
  request competes with the LCP request.
- The headline, lead and CTA are HTML text, server rendered, visible at first paint. The header
  scrim and the text scrim are CSS gradients, not baked into the poster.
- Scrim rule: the gradients are shown only while text is on screen: opacity is `1 - headlineFade`
  (the headline group), and 1 while a chapter on that side is active, with a CSS transition. A
  permanent scrim put at least 25 % navy over every pixel and up to 88 % at the edges, which
  dulled the film.

## Fallbacks

| Condition | Behaviour |
|---|---|
| `prefers-reduced-motion: reduce` | Poster only, section `height: 100svh`, no pin; callouts as a list below |
| `navigator.connection.saveData` or `effectiveType` in `slow-2g`, `2g`, `3g` | Poster only, no frame download; same layout as reduced motion |
| `navigator.deviceMemory` <= 2 | Poster only |
| `navigator.deviceMemory` <= 4 | Mobile tier with the small window, at any viewport width |
| No `Worker`, no `createImageBitmap`, or the AVIF and WebP probes both fail | Poster only |
| JavaScript off | Poster only (server HTML) |

The server renders the pin wrapper at its full height; CSS alone shrinks it to `100svh` under
`@media (prefers-reduced-motion: reduce)` and `@media (scripting: none)`, so those cases never
shift. The server also reads the `Save-Data: on` request header and renders the poster layout
directly. The remaining client-only checks (`effectiveType`, `deviceMemory`, missing APIs) run
before the canvas is created; if they shrink the wrapper, only content below the first viewport
moves, which is not a visible layout shift.

## Text choreography over the film

Progress `p` of the pin, 0 to 1. All copy is admin-editable per locale; nothing is invented.

| p | What happens | Primitive |
|---|---|---|
| 0 | Display headline split in two: word group A top-left, word group B bottom-right (`text-display`, white), lead (`text-lead`, white) and one CTA bottom-left. Visible at first paint, no entrance animation | Server HTML |
| 0 to 0.18 | A drifts `translateX(0 to -8vw)`, B `translateX(0 to 8vw)`, both `opacity 1 to 0` by 0.18; the CTA fades by 0.12 | Scroll-linked, linear |
| 0.22 to 0.70 | Up to three callouts on features of the house (each with `showAt` / `hideAt` set in the admin) | `Callouts` |
| 0.72 to 0.88 | One statement heading (`text-h1`) and a CTA rise in | `LineReveal`, `Reveal` |
| 0.88 to 1 | The statement fades with `--motion-fast`; the navy panel of the next section scrolls up over the canvas while the last frames keep playing under it | `PanelPush` |

Text contrast over the film: white text sits on a scrim layer (`bg-linear-to-t from-navy-deep/70
to-transparent` under the bottom group, `bg-linear-to-b from-navy-deep/60 to-transparent` 160 px
under the header). Check every frame: the relative luminance of the scrimmed frame under each text
box must stay at or below 0.183 (white on it then gives at least 4.5:1). Run it over all frames
with a script before publishing a new film.

## Production commands

```bash
FF=$(python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
"$FF" -i house-desktop.mov -vf "fps=120/DURATION_SECONDS,scale=1600:900:flags=lanczos" frames/%04d.png
for f in frames/*.png; do
  "$FF" -y -loglevel error -i "$f" -c:v libaom-av1 -still-picture 1 -crf 32 -cpu-used 4 -pix_fmt yuv420p "${f%.png}.avif"
  "$FF" -y -loglevel error -i "$f" -c:v libwebp -quality 60 -compression_level 6 "${f%.png}.webp"
done
```

Encoding speed **measured** at 980 x 420: 0.55-0.68 s per AVIF frame, 0.17 s per WebP frame on
this PC. **Estimate** for 1600 x 900: about 2 s per AVIF frame, about 4-5 minutes for 120 frames:
run it as a background job or a CLI script, not inside a request.

## Done when

- [ ] LCP element is the poster `<img>`; no frame request starts before `load`.
- [ ] Scrubbing a 5 s scroll trace through the pin at 4x CPU throttle: no frame over 34 ms,
      `drawImage` under 3 ms.
- [ ] Memory in the DevTools Memory panel stays under the window total for the tier.
- [ ] Reduced motion, Save-Data and `deviceMemory` 2 each show the poster layout.
- [ ] Bytes transferred for the full film are within 10.0 MB wide / 7.2 MB desktop / 3.3 MB mobile.
- [ ] Slow wheel scroll: 0 % of refreshes without a new image, no reversal; fast scroll: no draw from a smaller bitmap.
- [ ] 100 % crops of window frames, door frame and cabinet gaps mid-fraction show no double edges.
- [ ] White text passes 4.5:1 on every frame under the scrim.

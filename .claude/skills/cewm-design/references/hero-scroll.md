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

| Tier | Used when | Frame size | Frames | Pin wrapper | Scroll distance | Scroll per frame |
|---|---|---|---|---|---|---|
| Desktop | viewport >= 1024 CSS px and `navigator.deviceMemory` > 4 (or unknown) | 1600 x 900 | 120 | `400svh` | 300svh, about 2700 px at 900 px tall | 22.5 px |
| Mobile | viewport < 1024 CSS px, or `deviceMemory` <= 4 | 720 x 1280 | 80 | `300svh` | 200svh, about 1690 px at 844 px tall | 21 px |

- About 22 px of scroll per frame keeps a slow scroll smooth and a fast flick (the reference
  peaks at 2400 px/s) within the decode budget, because the lerp below caps the displayed rate.
- Canvas backing store: `width = round(cssWidth * min(devicePixelRatio, 1.5))`, height by the
  stage aspect. DPR is capped at 1.5 for the moving film (the poster uses full DPR). Frames are
  resized in the worker to cover the backing store, so a 1920 px wide screen at DPR 1 shows a
  1600 px frame upscaled 1.2x; this is invisible in motion and the poster is sharp at rest.

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

| Item | Desktop | Mobile |
|---|---|---|
| Poster (frame 0, AVIF crf 24, via `next/image`) | about 90 KB at 1920 w (**estimate**) | about 60 KB at 1080 w (**estimate**) |
| Every 8th frame (first scrub possible) | 15 x 47 KB = 0.7 MB | 10 x 35 KB = 0.35 MB |
| All frames | 120 x 47 KB = 5.6 MB | 80 x 35 KB = 2.8 MB |
| Worker script | 3 KB gzip | 3 KB gzip |
| **Total, hard limit** | **6.0 MB** | **3.0 MB** |

Frames are never downloaded before the LCP and never on Save-Data or slow connections (below).
If the real render exceeds the limit, lower the frame count first (desktop 96, mobile 64), then
raise the crf by 2, never the other way round.

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

- The worker keeps every downloaded frame as a compressed `Blob` (5.6 MB desktop, 2.8 MB mobile)
  and decodes on demand with `createImageBitmap(blob, { resizeWidth, resizeHeight })` straight to
  the canvas cover size, then transfers the `ImageBitmap` to the main thread. Never decode or
  resize on the main thread, and never draw an `<img>`: a decoded `<img>` is discarded by the
  browser and re-decoded on every `drawImage` (measured on an earlier project: 8.6 ms per frame,
  37 ms at 4x).
- Window of decoded bitmaps, with the bias in the scroll direction:

| Tier | Ahead | Behind | Bitmap size | Window memory | Ladder (every 8th, half size) | Total |
|---|---|---|---|---|---|---|
| Desktop | 12 | 4 | 1600 x 900 x 4 B = 5.76 MB | 17 x 5.76 = 98 MB | 15 x 1.44 MB = 22 MB | about 120 MB |
| Mobile | 8 | 3 | 720 x 1280 x 4 B = 3.69 MB | 12 x 3.69 = 44 MB | 10 x 0.92 MB = 9 MB | about 53 MB |
| `deviceMemory` <= 4 | 6 | 2 | mobile tier | 9 x 3.69 = 33 MB | 9 MB | about 42 MB |

  Bitmaps leaving the window are `close()`d on both sides. The half-size ladder is kept for the
  whole session and is what the canvas shows during very fast scrolls.
- On resize (debounced 200 ms): new cover size, the window is closed and re-decoded from the
  current frame outwards; the ladder is re-decoded last.

## Scroll to frame

```ts
const progress = clamp((scroll.y - stageTop) / (stageHeight - viewportHeight), 0, 1);
const target = progress * (frameCount - 1);
current += (target - current) * (1 - Math.exp(-dt / tau));
const index = Math.round(current);
```

- `stageTop`, `stageHeight` and `viewportHeight` are cached in a `ResizeObserver`; `scroll.y`
  comes from the shared loop (`motion-recipes.md`), never from `window.scrollY` inside the tick.
- `tau` = 60 ms with Lenis (fine pointers; Lenis already smooths the wheel) and 100 ms on touch
  (native momentum, frames would otherwise step). About lerp 0.24 and 0.15 per 60 Hz frame.
- Draw only when `index` changes or a better bitmap for `index` arrives:
  `ctx.drawImage(bitmap, dx, dy)` on a `getContext("2d", { alpha: false })` canvas.
- Tell the worker the current index and velocity (`target - current`) at most every 50 ms so the
  window moves ahead of the scroll.

## LCP strategy

- The poster is a real `<img>` rendered by `next/image` (`priority`, `sizes="100vw"`,
  `fetchPriority="high"`), art-directed with `getImageProps()` into a `<picture>`: the portrait
  poster below 1024 px, the landscape one above. It is the LCP element and is identical to
  frame 0, so the hand-over to the canvas is invisible.
- The canvas is created by client code after `load`; it is not in the server HTML. No frame
  request competes with the LCP request.
- The headline, lead and CTA are HTML text, server rendered, visible at first paint. The header
  scrim and the text scrim are CSS gradients, not baked into the poster.

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
- [ ] Bytes transferred for the full film are within 6.0 MB desktop / 3.0 MB mobile.
- [ ] White text passes 4.5:1 on every frame under the scrim.

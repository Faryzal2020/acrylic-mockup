# Acrylic Mockup Configurator

Browser-based tool that turns a transparent PNG into a configurable 3D acrylic
product mockup for marketing use. Everything — image decoding, 3D rendering,
PNG export — runs client-side, so it deploys as a static site with no backend.

See [implementation-plan.md](./implementation-plan.md) for the full plan.

## Status

All five phases of the plan are implemented.

| Phase | Scope | State |
|---|---|---|
| 0 | Acrylic material spike, transmission cost at 1/3/6 layers | Done |
| 1 | Single-layer standee MVP, full UI shell, still export | Done |
| 2 | Multi-layer stacking: add/remove/reorder, per-layer art and placement | Done |
| 3 | Product types (standee / keychain / grip / badge), keyring hole, hardware | Done |
| 4 | Preset JSON, turntable video, saved views, undo/redo, low-power preview | Done |

Deviations from the plan, all deliberate:

- **No `three-bvh-csg`.** The keyring hole is a `THREE.Path` hole on the
  extruded shape. ExtrudeGeometry triangulates it directly, so there is no
  boolean to recompute when the hole moves and no BVH dependency to ship.
- **No `ffmpeg.wasm`.** Turntable video is encoded by the browser through
  `MediaRecorder`. That answers open decision #3 — turntable export is cheap
  enough to keep — at the cost of WebM output rather than MP4.
- **No bundled HDRI.** Lighting is a procedural cubemap baked from drei
  `Lightformer` rects, which answers open decision #1: nothing to bundle, and
  no CDN fetch at runtime.
- **Base silhouette tracing** is not implemented; the base is still
  rectangle/rounded. Panel tracing, which is the part that changes how the
  product reads, is done.

## Running it

```bash
npm install
npm run dev
```

Vite serves under the `/acrylic-mockup/` base path (see below), so open the URL
it prints rather than bare `localhost`.

```bash
npm run build      # typecheck + production build into dist/
npm run typecheck  # types only
npm run lint       # oxlint
```

## Deploying

`.github/workflows/deploy.yml` builds on every push to `main` and publishes
`dist/` via GitHub Pages. Enable it once under **Settings → Pages → Source →
GitHub Actions**.

`vite.config.ts` hardcodes `base: '/acrylic-mockup/'` because Pages project
sites are served from a subpath. If the repo is renamed, change it there. To
build for a root-served host instead:

```bash
VITE_BASE=/ npm run build
```

No secrets or environment variables are needed at runtime — there is no API.

## How it fits together

```
src/
  components/
    scene/     R3F: canvas, layer/base meshes, lighting, camera, export, quality
    ui/        sidebar panels and the greyscale control primitives
  lib/         geometry, camera framing, backdrop, texture decode, PNG export
  store/       configStore (the MockupConfig) + runtimeStore (quality, fps)
  styles/      theme.css design tokens, sceneTheme.ts render colours
  types/       MockupConfig — the whole serializable config, and the preset format
```

UI components read and write `configStore`; scene components are pure consumers
of it. Everything you see is reconstructable from that one object, which is what
will make preset export/import trivial in Phase 4.

## Layers

**Layers** stacks panels back-to-front, each with its own artwork, thickness,
air gap, placement and print position. The frontmost is listed first.

Layers are scaled through one shared millimetres-per-source-pixel factor taken
from the first layer with artwork, so a set of PNGs exported from one canvas
lines up exactly, and a smaller foreground element stays smaller instead of
being blown up to match. `panel.heightMm` sizes that reference layer.

Placement transforms the cut and the print together — on a traced panel they
are the same outline, so moving one without the other would slide the artwork
off its own cut edge.

## Cut shape

**Panel → Cut shape → Trace artwork** walks the artwork's alpha channel and
cuts the panel to that silhouette; **Rectangle** falls back to a rounded panel.

The tracer (`lib/outlineTrace.ts`) dilates the alpha mask by the cut border
before walking it, so the border is a real offset cut line rather than a
drawn-on outline. Then: interior holes are filled and only the largest island
is kept — a standee is one piece of acrylic, not a scatter of chips — and the
staircase is simplified (Douglas-Peucker) and smoothed (Chaikin).

Because the border is a dilation, a wide border rounds off concave detail:
at 9mm the gap under an arm closes up. That is what an actual offset cut does,
not a bug.

Tracing runs on a downsampled alpha mask (320px longest edge) extracted once at
upload, and results are cached per border width, so dragging an unrelated
slider never re-traces.

## Base and mounting

The base is a flat plate cut from the same sheet stock as the panel — circular
by default, 3mm thick — lying on the ground with a slot through it. The standee
does not sink into it; its silhouette rests on the top face and only a mounting
tab passes through the slot.

The tab is painted into the alpha mask *after* the border dilation, so it comes
out at exactly the requested width instead of inheriting the decorative cut
border. That matters because the slot has to match it. It is painted before
hole-filling and island detection, and overlaps up into the silhouette by 6% of
the artwork height so the two merge into one island rather than leaving a
rectangle floating below the character.

Panel height is measured from the silhouette, excluding the tab. The silhouette
bounds are derived analytically — dilating by `b` grows a bounding box by
exactly `b` on every side — rather than from the traced contour, which now
includes the tab and would otherwise make `panel.heightMm` drift.

In a stack, only layers whose silhouette bottom is within 15% of the panel
bottom get a tab, so a body layer mounts and a floating detail layer (a pair of
eyes) does not. The slot is sized to swallow the whole stack's depth.

Rectangular panels get no separate tab — the whole bottom edge slots in, so the
slot simply spans most of the panel width.

## Background and transparent export

**Background → Behind the product** picks Studio (the gradient sweep), Solid
(any colour), or None. None gives a transparent PNG; the viewport shows a
checkerboard so you can see it in the preview.

None cannot be a single render pass, and the reason is worth knowing before
touching this code. three's `_renderBackground` is one flag shared by the main
render *and* the transmission pass, and `renderTransmissionPass` calls
`background.render(scene)` from it (`WebGLRenderer.js:2029`). Null the
background for transparency and the transmission target keeps nothing but its
`setClearColor(0xffffff, 0.5)` clear — so every clear-acrylic pixel comes out
as exactly `255,255,255` at alpha 128, one flat constant with no tonal
variation anywhere on the panel. Environment reflections are unaffected; it is
refraction that is lost, and on a flat panel at 3/4 that is most of what you
see.

So `lib/transparentComposite.ts` renders more than once and combines:

| Pass | Background | Gives |
|---|---|---|
| A | studio sweep | the product as it looks in the studio, alpha 255 |
| B | none | the alpha matte (acrylic ~128, print 255, empty 0) |
| C | studio sweep, scene children hidden | what was behind the product, per pixel |

Export un-premultiplies A against C — `out = (A - C * (1 - a)) / a` — so the
result composites correctly onto a new background. C is *measured* with a third
pass rather than recomputed from the gradient, which keeps it immune to
colour-space and tone-mapping differences between how the texture is built and
how three draws it.

The live preview skips C and just masks A with B's alpha, which is one GPU
canvas composite instead of a multi-million-pixel loop. It runs only on settle,
reusing the existing quality tier, and paints into an overlay canvas while the
WebGL canvas drops to `opacity: 0` — opacity rather than `visibility: hidden`,
because a hidden element stops receiving pointer events and orbiting would die.

Measured on the clear lip of a standee, top to bottom of the panel:

| Down panel | Studio | None (before) | None (now) |
|---|---|---|---|
| 0.10 | `237,237,237` | `255,255,255` | `237,237,237` |
| 0.30 | `240,240,240` | `255,255,255` | `237,237,237` |
| 0.50 | `239,239,239` | `255,255,255` | `229,229,229` |

Alpha stays 128 on the acrylic, so it is still see-through. Where the now
column sits below studio, that is the un-premultiply working: the output is the
straight colour of the glass, not the glass already composited over a lighter
backdrop.

One limit that is physics, not a bug: a clear panel lit by a white studio
genuinely veils a dark background. That white is what the acrylic is carrying.
For compositing onto something dark, Solid with a matching colour will look
better than None.

Turntable capture forces the studio sweep back on if the background is None,
since WebM from MediaRecorder has no alpha channel and would otherwise record
the flat, unshaded acrylic.

## Presets, history and video

- **Presets** save the whole `MockupConfig` as JSON. They cannot carry your
  PNGs — there is no server — so the file records the artwork *filenames* and
  layers come back unassigned for you to re-point at re-uploaded images.
- **Undo/redo** (⌘Z / ⌘⇧Z) snapshots the config by subscribing to the store
  rather than by wrapping each action, so nothing has to remember to record
  itself. Bursts coalesce after 450ms of quiet, so a whole slider drag undoes
  in one step.
- **Turntable** records a full revolution to WebM. The camera angle is driven
  by elapsed time, not frame index: MediaRecorder timestamps frames by wall
  clock, so a scene that cannot hold 30fps would otherwise produce a clip
  several times too long, playing in slow motion. Driving by time drops the
  frame rate instead and keeps the revolution the length you asked for.
  Capture runs at pixel ratio 1 — a 2x canvas costs four times the fill and
  readback per frame, which is exactly what pushes it below target.
- **Low-power preview** (under Turntable) swaps transmission for plain alpha
  blending while you drag, skipping an entire render pass. Off by default;
  stills and turntables are never affected.

## Notes on the render

- Acrylic is `MeshPhysicalMaterial` with transmission. `ExtrudeGeometry` gives
  the panel real thickness and a small bevel so the cut edge catches light;
  its two material groups let the side wall carry its own edge-glow material.
- Artwork is a separate alpha-tested plane, not a texture on the slab. It must
  be alpha-tested rather than `transparent`, because three's transmission pass
  only captures opaque-listed objects — a transparent print would vanish when
  seen through the acrylic in front of it. `alphaToCoverage` restores the
  antialiased cut-out edge via MSAA.
- The studio is a screen-space gradient backdrop plus drei `ContactShadows`.
  There is deliberately no floor mesh: ContactShadows renders the whole scene
  into its depth pass, so a ground plane at y=0 becomes one giant occluder.
- Quality has two tiers (plan §7): dragging drops to device pixel ratio 1 and a
  half-resolution transmission sampler; ~300ms after you stop it returns to full
  resolution. Exports always render the full-quality frame.
# acrylic-mockup

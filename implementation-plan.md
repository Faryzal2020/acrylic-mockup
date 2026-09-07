# Acrylic Mockup Configurator — Project Plan

## 1. Project Summary

A browser-based tool that lets illustrators turn a transparent PNG into a
configurable 3D acrylic product mockup (standee, keychain, phone grip, etc.)
for marketing use — replacing manual Blender work or hand-drawn
thickness/side illustrations.

**This is a mockup/visualization tool, not a production pipeline.** No
commerce, no print-ready file export (bleed, DPI, cut lines), no
fulfillment, no accounts. Output is a still image (and optionally a short
turntable clip) suitable for marketing use.

## 2. Explicit Constraints (from product owner)

- Visual quality target: **"convincing," not photoreal**. Always favor a
  responsive live-preview frame rate over per-pixel physical accuracy.
- **Desktop browser only.** No responsive/mobile layout work. Assume mouse +
  keyboard, a viewport ≥ 1280px wide, and a discrete or decent integrated
  GPU.
- **UI aesthetic:** white/bright background, shaded (greyscale/tonal) accent
  elements only. No colored icons. No gradients anywhere in the UI chrome
  (gradients inside the 3D render/lighting are fine — that's the product,
  not the chrome).
- **Deployment target: GitHub Pages.** This means: static output only, no
  server/backend, no server-side rendering, no API routes, no server-side
  file storage. All image processing and 3D rendering happens client-side
  in the browser.

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React + Vite | Vite produces a clean static build that deploys to GitHub Pages with zero config beyond `base` path. |
| 3D | Three.js (via `@react-three/fiber` + `@react-three/drei`) | R3F keeps the scene graph declarative and in sync with UI state; drei gives free helpers (OrbitControls, environment/HDRI loader, etc.) |
| State | Zustand | Lightweight, no boilerplate, ideal for a single config object driving the whole scene. |
| UI components | Plain React + CSS (or Tailwind, configured to a custom greyscale palette — no default Tailwind color ramps) | Keep it simple; no need for a heavy design-system library. |
| Image processing (outline extraction) | Client-side canvas + `potrace`-style contour tracing (e.g. `imagetracerjs` or a hand-rolled marching-squares pass on the alpha channel) | Must run fully client-side for GitHub Pages. |
| Export | `canvas.toBlob()` for stills; `ccapture.js` or manual frame capture + `ffmpeg.wasm` for turntable video (optional, later phase) | Client-side only. |
| Hosting | GitHub Pages via `gh-pages` npm package or a GitHub Actions workflow | Static build output (`dist/`) pushed to `gh-pages` branch. |

No backend, no database, no auth. Everything lives in the browser session;
config presets can be saved/loaded as downloadable/uploadable JSON files
(since there's no server to persist to).

## 4. Non-Goals (explicitly out of scope)

- Mobile/responsive layout
- Print-file export (bleed, DPI, CMYK, cut-line vector export)
- E-commerce / checkout / pricing
- User accounts, login, saved cloud presets
- Physically exact ray-traced refraction/caustics
- Multi-user collaboration

## 5. Core Data Model

Everything the UI configures should reduce to one serializable JS object —
this object is also what gets exported/imported as a "preset" JSON file
since there's no backend to store presets server-side.

```ts
type MockupConfig = {
  productType: 'standee' | 'keychain' | 'phoneGrip' | 'badge';

  layers: AcrylicLayer[];   // ordered back-to-front along Z

  base: {
    enabled: boolean;
    shape: 'rectangle' | 'rounded' | 'traceFromAlpha';
    height: number;
    color: string;          // hex, used as tint for base material
    imageOnBase: boolean;   // does the illustration extend onto the base
  };

  hardware: {
    // only relevant for keychain / phoneGrip productType
    type: 'none' | 'keyring' | 'popSocket';
    position: { x: number; y: number }; // normalized 0-1 on the panel
  };

  material: {
    finish: 'clear' | 'frosted' | 'tinted';
    tintColor: string;
    ior: number;             // index of refraction, exposed as advanced control
    roughness: number;
    edgeGlow: number;        // 0-1, stylized rim-light intensity
  };

  camera: {
    preset: 'threeQuarter' | 'front' | 'edgeCloseup' | 'custom';
    // custom position/target only used if preset === 'custom'
    position?: [number, number, number];
    target?: [number, number, number];
  };

  lighting: {
    preset: 'studioSoft' | 'studioHard' | 'daylight';
    environmentIntensity: number;
  };
};

type AcrylicLayer = {
  id: string;
  thickness: number;        // mm, drives ExtrudeGeometry depth + material `thickness` prop
  gapBefore: number;         // mm gap from previous layer (0 for first layer)
  imageAssetId: string | null; // reference to an uploaded PNG
  imagePlacement: {
    x: number; y: number;   // normalized position on the panel
    scale: number;
    rotation: number;
  };
  imageMode: 'surfacePrint' | 'sandwiched'; // affects which face gets the texture
};
```

Uploaded PNGs are kept in-memory (as `THREE.Texture` / object URLs) for the
session — no server storage, so nothing persists across a page reload
unless the user explicitly exports a preset + keeps their source PNGs.

## 6. Architecture / Folder Structure

```
/src
  /assets
    /presets            # bundled example presets (JSON) shipped with the app
  /components
    /ui                 # all non-3D UI: panels, sliders, upload widgets
      ConfigPanel.tsx
      LayerList.tsx
      LayerEditor.tsx
      ProductTypeSelector.tsx
      MaterialControls.tsx
      CameraLightingControls.tsx
      ExportControls.tsx
      PresetImportExport.tsx
    /scene              # everything Three.js / R3F
      SceneCanvas.tsx        # <Canvas> root, camera, controls, environment
      AcrylicLayerMesh.tsx   # renders one layer from AcrylicLayer config
      BaseMesh.tsx
      HardwareMesh.tsx       # keyring / popsocket geometry
      LightingRig.tsx
      CameraRig.tsx
  /lib
    outlineTrace.ts     # alpha-channel -> contour path (client-side)
    textureLoader.ts    # PNG -> THREE.Texture helpers
    exportImage.ts      # canvas.toBlob still export
    exportTurntable.ts  # (Phase 4) frame capture -> video
    csg.ts              # boolean subtraction for keychain hole, via three-bvh-csg
  /store
    configStore.ts      # Zustand store holding MockupConfig + actions
  /styles
    theme.css           # greyscale/tonal design tokens (see §8)
  App.tsx
  main.tsx
vite.config.ts           # set `base: '/<repo-name>/'` for GitHub Pages
.github/workflows/deploy.yml
```

**Data flow:** UI components read/write `configStore` (Zustand). The scene
components are pure consumers of the store's `MockupConfig` — they never
hold their own state beyond transient interaction state (e.g. orbit camera
drag). This keeps "what you see" always reconstructable from one object,
which is what makes preset export/import trivial.

## 7. Rendering / Performance Strategy

This is the highest-risk technical area. Plan for it explicitly rather than
discovering it mid-build.

- Use `MeshPhysicalMaterial` with `transmission`, `thickness`,
  `attenuationColor`/`attenuationDistance`, `ior`, `roughness` for the
  acrylic look.
- **Live preview mode (while orbiting/dragging a slider):** drop
  `transmissionSampler` resolution, reduce or disable `envMapIntensity`
  blur passes, cap pixel ratio to 1, and consider temporarily swapping
  `transmission` materials to a cheaper `MeshPhysicalMaterial` with plain
  `opacity`/`transparent` for the duration of the drag.
- **Settled/idle render (user stops interacting for ~300ms):** switch back
  to full transmission quality, raise pixel ratio to `devicePixelRatio`
  (capped at 2), and this is the frame used for "export still."
- Stack depth matters: transmission is a full extra render pass per
  transmissive object per frame. With N layers, test performance at
  realistic N (likely 2–6) early, in Phase 1, not after the whole UI is
  built.
- Use a single shared HDRI environment map (via `RoomEnvironment` from drei,
  or a bundled small `.hdr`) rather than per-object environment maps.
- Only rebuild geometry (`ExtrudeGeometry`, CSG boolean ops) when a
  structural property changes (thickness, shape, hole position) — never
  regenerate geometry every frame or every render tick; only on config
  change events.

## 8. UI Design System Spec

- **Background:** white / near-white (`#FFFFFF` / `#FAFAFA`).
- **Text:** near-black (`#1A1A1A`) for primary, mid-grey (`#6B6B6B`) for
  secondary/labels.
- **Accents / interactive states:** greyscale tonal shading only — e.g.
  active tab or selected control uses a darker grey fill (`#2A2A2A`) with
  white text, hover states use a light grey (`#F0F0F0`). No hue-based
  accent color (no blue "primary button," etc.) — everything is
  value/shade-based, not color-based.
- **Icons:** monochrome/outline only (e.g. use a library like `lucide-react`
  but forcibly set `stroke="currentColor"` / `fill="currentColor"` in the
  grey palette — never let a colored icon set through). No multi-color
  icon sets.
- **No gradients** anywhere in panels, buttons, backgrounds, borders, or
  shadows. Use flat fills and simple `box-shadow` (soft grey, no color) for
  elevation/depth cues instead of gradients.
- **Layout:** standard "3D tool" layout — large canvas viewport
  center/left, a right-hand (or left-hand) config sidebar with collapsible
  sections (Product Type → Layers → Material → Camera/Lighting → Export).
  Desktop-only means it's fine to assume a fixed minimum width and skip any
  hamburger/drawer patterns.
- Define all of the above as CSS custom properties in `theme.css` up front
  (`--color-bg`, `--color-text-primary`, `--color-accent`, etc.) so no
  component hardcodes a hex value.

## 9. GitHub Pages Deployment Plan

1. Vite project with `base: '/<repo-name>/'` set in `vite.config.ts` (required
   for correct asset paths on Pages' subpath hosting).
2. All processing (outline tracing, texture loading, rendering, export)
   must be client-side — confirm no code path assumes a server, `fetch`
   to a same-origin API, or filesystem write.
3. Add `.github/workflows/deploy.yml`: on push to `main`, run
   `npm ci && npm run build`, then deploy `dist/` to the `gh-pages` branch
   (via `peaceiris/actions-gh-pages` or the official `actions/deploy-pages`
   flow).
4. Large bundled assets (HDRI environment maps, example preset PNGs) should
   be kept small (compressed `.hdr`/`.exr` or a baked `.jpg` environment)
   since Pages has repo size practicalities and this affects initial load
   time.
5. No environment variables / secrets needed since there's no backend —
   confirm nothing in the app expects an API key at runtime.

## 10. Phased Build Plan

### Phase 0 — Technical Spike (before any UI work)
**Goal: de-risk the one feature that justifies the whole project.**
- Bare Three.js/R3F scene, single flat panel, `MeshPhysicalMaterial` with
  transmission/thickness/ior tuned until it visually reads as "acrylic."
- Test performance with 1, 3, and 6 stacked transmissive layers at a
  realistic viewport size. Record FPS.
- **Exit criteria:** acrylic edge/material looks convincing, and a 6-layer
  stack runs acceptably (target ≥ 30fps while idle, ≥ then acceptable
  during interaction with the quality-drop strategy from §7). If this
  fails, revisit material strategy before building anything else.

### Phase 1 — Single-Layer Standee MVP
- PNG upload → texture.
- Single acrylic panel (`ExtrudeGeometry` for real thickness) with the
  tuned material from Phase 0.
- Fixed rectangular base.
- Config sidebar: thickness slider, material finish (clear/frosted/tinted),
  one camera preset.
- Still image export.
- Full UI shell built to the design spec in §8 (even though only a few
  controls exist yet — establishes the pattern for later phases).
- **Exit criteria:** a user can upload a PNG, adjust thickness/material, and
  export a convincing single-panel standee mockup image.

### Phase 2 — Multi-Layer Stacking
- Layer list UI (add/remove/reorder layers).
- Per-layer thickness, gap, image assignment, placement (position/scale/
  rotation on the panel), and `imageMode` (surface vs sandwiched).
- Verify sandwiched-image-through-transmissive-layer effect actually reads
  correctly; this is the main visual risk of this phase.
- **Exit criteria:** illustrator can build a 3+ layer standee with
  different art per layer and see correct depth/transmission between them.

### Phase 3 — Product Type Presets
- `productType` switch: standee / keychain / phoneGrip / badge.
- Keychain: hole via CSG boolean subtraction (`three-bvh-csg`) + ring/loop
  hardware mesh.
- Phone grip: pop-socket mount mesh + placement.
- Custom base shape: alpha-channel contour tracing → `Shape` →
  `ExtrudeGeometry`, toggle between fixed rectangle/rounded base and
  traced-silhouette base.
- **Exit criteria:** switching product type reconfigures the scene
  (hardware, base shape) correctly while preserving layer/material config
  where applicable.

### Phase 4 — Polish & Power-User Features
- Additional camera presets + free custom orbit-to-preset "save this view."
- Preset export/import as downloadable JSON (since no backend persistence
  exists).
- Turntable video export (frame capture loop + client-side video encode).
- Environment/lighting preset refinement (studio soft/hard/daylight).
- Undo/redo on the config store (Zustand makes this straightforward via a
  simple history middleware).
- Performance pass: confirm large/many-layer configs still hit interactive
  frame rates; add a "preview quality" toggle if needed for lower-end GPUs.

## 11. Acceptance Testing Notes (per phase)

For each phase, verify on a mid-range discrete GPU laptop (not just a
high-end dev machine) since the tool targets general illustrator desktops:
- Idle FPS with the phase's max realistic layer count.
- Drag/orbit FPS during interaction.
- Export still image visually matches the live preview at full quality.
- UI: no colored icons, no gradients, greyscale accents only — spot check
  every new component against `theme.css` tokens rather than hardcoded
  colors.

## 12. Open Decisions for the Coding Agent to Flag Back

These are reasonable to default on but should be confirmed once visible in
implementation rather than assumed silently:
- Exact HDRI/environment asset to bundle (affects both look and bundle
  size).
- Whether "sandwiched" image mode needs a visible internal plane geometry
  or can be faked via material layering — resolve during Phase 2 spike.
- Whether turntable export (Phase 4) is actually needed for v1 or can be
  dropped if client-side video encoding proves too heavy/slow.

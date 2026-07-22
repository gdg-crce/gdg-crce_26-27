# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical: Read Context Files First

Before working on any feature, read all three files in `context/`:
- `context/approch.md` — 3D model pipeline (GLB → compress → gltfjsx → component)
- `context/theme.md` — full design philosophy, era color palettes, and emotional direction
- `context/loader.md` — preloader concept and animation intent

## Next.js Version Warning

This project uses **Next.js 16.2.10** — a version with breaking API changes. Check `node_modules/next/dist/docs/` before writing any Next.js-specific code. Do not assume APIs match your training data.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

No test suite is configured.

## Architecture Overview

This is a **single-page cinematic experience** for GDG CRCE, structured as a linear four-act sequence:

```
Preloader → HeroVideoSection → AboutSection → EventsAndCouncilSection
```

The page (`src/app/page.tsx`) manages two state flags: `loading` and `videoStarted`. The Preloader mounts on top of the main content, calls `onStartTransition` to wake the hero video early (zero-gap handoff), then calls `onComplete` to unmount itself.

> **`src/components/sections/events/EventsSection.tsx` is dead code.** Nothing imports it. Act 3 is `src/components/sections/EventsAndCouncilSection.tsx`, which renders `WallScene` directly. Edits made to `EventsSection.tsx` have no effect on the site — verify with `grep -rn EventsSection src/` before touching it. Delete it when convenient.

### Act 1 — Preloader (`src/components/sections/Preloader.tsx`)

A fullscreen overlay with a **GSAP timeline** (not scroll-driven) that auto-plays three phases:
1. FilmTape rewinds from 2020s → 70s (progress 0 → 0.60)
2. FilmTape exits, VHSTape slides in from right (progress 0.60 → 0.80)
3. Camera zooms through center of VHS logo into the hero video (progress 0.80 → 1.0)

All visual math is computed in a single `useMemo` block (`visual`) from a single `progress` scalar (0–1). Never drive animations from multiple progress values; derive everything from this one number.

**The preloader has no audio.** Previous versions of this file documented a `usePreloaderAudio` hook running a procedural Web Audio engine with mp3 fallbacks. None of it exists — there is no `src/hooks/` directory, no Web Audio code anywhere in `src/`, and no `public/audio/`. Treat it as an unbuilt idea, not as something to look for. `context/loader.md` does not mention audio either.

Note that the preloader **does** wait on a user gesture before the hero video can play (browser autoplay policy), which is worth knowing when driving the page programmatically.

### Act 2 — Hero Video (`src/components/sections/hero-video/HeroVideoSection.tsx`)

Full-viewport `<video>` playing `public/videos/intro.mp4`. Scroll is locked (`overflow: hidden`) for the first 10 seconds of playback, then auto-unlocks. The scroll lock is enforced by a `scroll` event listener that enforces `window.scrollTo(0, 0)` — do not fight this pattern.

### Act 3 — Events Wall + Council (`src/components/sections/EventsAndCouncilSection.tsx`)

A **GSAP ScrollTrigger-pinned** section (`end: '+=11000'`, unified across the wall walk and the Windows XP council takeover) housing an R3F `<Canvas>`. The `progressRef` (a mutable ref, not state) is passed directly into Three.js `useFrame` callbacks for zero-React-overhead camera movement. Never convert this to React state.

The alleyway wall starts fullscreen, then shrinks into a Windows Media Player window as `scrollProgress` crosses ~0.32 and minimises past ~0.50.

The 3D wall scene (`src/components/three/WallScene.tsx`) contains:
- `InteractiveCameraRig` — walks camera along X axis (−24 → 23) and adds mouse look + walking stride
- `WeatheredUrbanStreetWall` — flat plane, photogrammetry-scan material (see **Wall Material** below)
- `AlleyEnvironment` — procedural equirect env map. **This is the key light**, not just ambient (see **Lighting**)
- `EventPoster3D` — wheat-pasted posters, one per event in `eventData.ts`
- `GraffitiTag` — aerosol graffiti generated on Canvas at runtime
- All street props in `src/components/three/AlleyProps3D.tsx`

Event data (positions, poster images, titles) lives in `src/components/sections/events/eventData.ts`. Poster images are in `public/elements/poster-N.png`.

## Wall Material

**The wall base is a photogrammetry scan, not procedural. Do not rebuild a procedural generator for it.**

`src/components/three/wallMaterial.ts` used to synthesise the wall in Canvas 2D — fBm paint strata, Voronoi flake fracture, a rectilinear "history" layer. It was ~1000 lines and it did not work, at any tuning. Canvas 2D cannot reach photoreal aged concrete because real surfaces carry **correlated structure at every scale simultaneously** (mineral grain, aggregate, micro-pitting, stain following porosity, a chip exposing a substrate with its own grain). Approximating each scale with a flat fill composes into flat colour fields with noisy edges — which is what it produced, however hard the thresholds were tuned. The art direction for this wall was set from photographs; use photographs.

Base material: **ambientCG `PaintedPlaster016`** (CC0, height-field photogrammetry — white limewash failing off **brick masonry**). The brick substrate is the point: it gives the reference's whole layer stack (brick → plaster → limewash → weathering) for free, in one asset. Files in `public/textures/wall/`:

| File | Contents | Size |
|------|----------|------|
| `plaster_color.jpg` | albedo — warm ivory limewash, pale olive plaster, muted reddish-brown brick | 113KB |
| `plaster_normal.jpg` | OpenGL-convention normal (carries every chip edge and the popcorn grain) | 443KB |
| `plaster_ao_rough.jpg` | **AO in R, roughness in G, CAVITY in B** — three reads `aoMap.r` and `roughnessMap.g`, so one texture serves both slots; the shader reads `.b` off the same sampler for cavity. Three maps, one request. | 263KB |

Plus two generated at runtime, both tiny and both essential:
- **cavity** (baked, in B) — `blur(height) - height` off the scan's Displacement map, which we otherwise never load. It is the most informative map in the set: it holds the *step* from limewash down to brick, every mortar joint, every pit. Dirt is not sprinkled on a wall, it is washed down and left wherever the surface is too low to drain — so cavity **is** the dirt mask, already correlated to the geometry, for free. This is where the wall's depth comes from: the albedo is deliberately flattened (see the camo rule), so depth is carried by shading, which is also how the real surface works.
- **`buildDetailNormal()`** — 256px aggregate grain, tiled ~60× (a 1.1m period). This resolves the fight between feature scale and sharpness: the scan carries the macro story at 10 repeats, this carries the micro tooth where no shape is recognisable, only grain. **Normals only** — tiling an albedo this hard shows a pattern instantly, but tiling a normal reads as surface tooth, which is what plaster aggregate physically is. Wraps on both axes (a seam at 1.1m would be worse than the softness it fixes).

Re-bake with `node scripts/bake-wall-texture.mjs <path-to-unzipped-scan>` (run from the project root so `sharp` resolves — it ships with Next). The raw 2K set is 19.4MB; the bake target is **under ~900KB total**. Grading knobs are at the top of that script.

### Two bake rules, both learned by breaking them

**Never use sharp's `.tint()` here.** It does not bias colour — it works in LAB and **replaces the image's chroma outright**. A `.tint({r:243,g:246,b:252})` meant to "cool the wall slightly" forced brick red, pale olive and warm ivory to one identical faint blue and returned a near-monochrome scan. Combined with `saturation: 0.42` it deleted the three things this asset was chosen for. The scan needs almost nothing: `saturation 0.88`, no tint.

**Grade for camouflage, not for warmth.** The scan is ~50% exposed brick, and rendered at high contrast that 50/50 reads as *camouflage* — a busy dark-light mottle. The reference is broad pale plaster with brick "mostly hidden". You cannot change how much brick the scan contains, but the camo read is driven by how far the brick sits from the plaster in **value**, so the bake compresses the range and lifts the floor (`linear(0.82, 28)`). The brick then sits under the plaster as an undertone instead of punching through.

### Feature scale beats sharpness

`SCAN_REPEAT_X/Y = 10 / 1.5` (was 16 / 2.4). At 16 a tile covered 4.25m and the plaster islands landed at ~0.3m — camouflage again, at the wrong scale. 10 makes every feature 1.6× larger at the cost of texel density (~136 px/m against ~240 px/m to match screen resolution at this camera distance). The albedo goes slightly soft; the normal map still carries every chip at full strength, and under flat overcast a soft albedo is what a real wall photographs like. **Do not "fix" the softness by raising the repeat** — you will get the camo back.

Procedural layers that still ride **on top** of the scan and must not be removed:
- `buildMacroMap()` — a non-tiling 1024×256 layer stretched 1:1 across all 68m, injected via `applyMacroLayer()` (`onBeforeCompile` patching `map_fragment` + `roughnessmap_fragment`). **A scan tiles too**; without this the wall visibly repeats. Its job is to **break the period, not to repaint the surface** — it multiplies albedo by `0.88 + r*0.24`, centred on 1.0. It once ran `0.46 + r*1.05` (a ±50% swing) and mixed toward `vec3(0.22,0.24,0.29)`, crushing whole stretches to 22% brightness in a blue-grey. That, not the albedo, was the real source of the wall's cold, dark, blotchy read.
- `RUNOFF_SOURCES` — runoff streaks are authored **from the real pipes/sills/platform in the scene**, not scattered. A stain must have a cause.
- `buildGhostMap()` — poster ghosts. A ghost is a **pale** rectangle with a **dirty outline**, not a stain: a pasted sheet shelters the wall under it for years, so stripping it exposes a patch cleaner than its surroundings, with grime only at the perimeter where paste squeezed out. Its mask lives in R/G as **coverage**; do not read `max(rgb)` (that samples the canvas' colour, and applied a 12%-alpha tint at 78%).
- `buildAlleyEnvironment()` — procedural equirect PMREM, no network fetch. Without an env map every metal in the scene (manholes, pipes, puddles) reflects a void and renders as a flat dark blob.

## Lighting — overcast daylight

The scene is lit by an **even cloud deck**: soft, indirect, neutral white balance, low contrast, no sun. The whole rig is three things:

| | value | role |
|---|---|---|
| `AlleyEnvironment` | `environmentIntensity = 1.7` | **the key light** — master exposure dial |
| `ambientLight` | `0.46 / #DFE2E2` | lifts cavities the dome cannot reach |
| `directionalLight` | `0.6 / #E6E9E9`, high at `[8,22,10]` | contact shadows only — **not a sun** |
| `toneMappingExposure` | `1.15` | global; raising it clips the pavement first |
| wall `envMapIntensity` | `1.75` | wall-only lift — see below |
| wall `aoMapIntensity` | `0.7` | at 1.0 the dome-lit crevices crushed to 10/255 |

**An overcast sky is a huge light, not a dim one.** It is easy to build only the "soft" half of soft-and-strong and land on a scene that is technically flat but murky. Calibration point: bare plaster measures **~[143,140,131]**, and nothing in frame clips.

**Do not add lights to brighten the wall — turn `environmentIntensity`.** Under overcast the dome is the source; discrete lights are how the scene drifted back to golden hour twice. To brighten *only the wall*, use its `envMapIntensity` (past 1.0 it is an art dial, but it is the right one — the pavement and posters already peak near 230 and would clip first).

**Depth costs light, and you pay for it here.** Every texel the normal map tilts away from the bright zenith turns toward the dark ground half of the dome, and the cavity layer only ever subtracts — together `normalScale 1.6` + cavity measured a drop from 144 to 110. That is buying texture by silently spending the exposure. Pay it back on the wall's `envMapIntensity`, don't back off the relief.

**The obvious trap is thinking "soft even light" means "flat grey".** Flat light would erase the plaster grain the material exists to show. Real overcast is ~3× brighter at the zenith than the horizon, and the sky dome's top-to-bottom ramp is what shades every upward-facing chip differently from every downward-facing one. That ramp is why the scene can have no torch and still read as tactile — keep it.

Removed, and why they must stay removed:
- **A 2.0-intensity `#FFD060` "golden morning sun"** at y=5 raking long shadows, plus five `#FFD890` sodium lamps at 32–38, a 75 spotlight, and a warm `#C8BFA8` fog. That rig was every item on the reference's avoid list simultaneously: golden orange light, strong shadows, an HDRI sunset look, dramatic highlights.
- **`HandheldFlashlight`** — a cursor-tracked torch pool. The opposite of "naturally photographed", and the brightest thing in a frame meant to be evenly lit.
- **A caged lamp fixture's `#FF9A40` pointLight at intensity 25** (`AlleyProps3D`) — a street lamp burning at midday, washing that whole stretch of wall amber. The fixture stays as a prop; the light is off and the bulb is cold glass.
- Any warm colour on the **wall itself**. Saturated colour is reserved for graffiti and posters. The neon sign's `pointLight` is `intensity 2` — at 14 it pooled magenta across the plaster.

## Wall Surface Rules

Learned the hard way; violating these is what made the scene read as a clean 3D render.

- **The wall mesh is flat.** No `displacementMap`. It previously ran `displacementScale={0.3}` over 42cm quads, which produced 8cm-proud stucco and 9cm "cracks" smeared into smooth valleys — lumpy terrain resolving no real feature, for 6,400 verts. At 4m a 2cm lip subtends 0.3°; all relief belongs in the normal map.
- **Decal z-ladder.** With displacement gone, nothing needs to hover. Stack in the order the wall acquired it:
  `stains 0.004 · grime 0.005 · old paper 0.006–0.008 · graffiti 0.010 · posters 0.012 · stickers 0.016`
- **Only decals *above* 0.012 must dodge the posters.** Anything below the posters in the ladder may share their X — graffiti at 0.007 disappearing behind a sheet reads as "tagged first, pasted over later", which is history, not a bug. Stickers at 0.016 are *in front*, so a shared X punches through a poster's face. Poster spans are computable from `eventData.ts` (`3.4 × scale` wide); the clear gaps are roughly **−19.8, −9.0, 1.75, 13.05**.
- **Flat decals never `castShadow`.** A stain, a streak, a poster or a tag has no thickness. A `castShadow` quad floating off the wall is what produced the black drop-shadow halos. Solid props (railings, bollards, cans) keep theirs.
- **No decal may have a hard edge on ANY axis.** The rule used to say "no opaque backing rectangles" and that was too narrow — the worst offender was a *gradient*. `grimeTex` faded top-to-bottom and read as correct in code, but its left, right and top edges were hard, so a 1.3×6.8m runoff quad rendered as a dark rectangle painted on the wall. Build masks so alpha falls to zero on every side; per-pixel is fine, these canvases are tiny. Water runs in fingers, not rectangles.
- **Nothing on this wall is brighter, blacker, or crisper than the plaster.** Stickers at `#111111`/`#FFFFFF`, a `0.94`-alpha near-white poster remnant with a `0.98` stroke — each read as a UI chip pasted over a photograph. Anything outdoors for years is bleached, translucent, has lost its corners, and has illegible print. If you can read it, it went up last week.
- **The wall must read before the posters — but the posters carry the colour.** The wall is the muted one and the main story; the posters are the newest thing on it, and the only saturated element. `applyPosterFade` at 0.32–0.58. It was once 0.62–0.92, which was over-correction for a grey wall under a golden spot — both causes are gone.

## Debugging the 3D Scene

The scene only draws inside `requestAnimationFrame`, **which never fires while the tab is hidden**. An automated browser pane that isn't visible renders zero frames — screenshots time out. Check `document.visibilityState` first; confirm with a one-off `requestAnimationFrame` callback that never fires.

**Everything rAF-driven is frozen, and the knock-on effects are not obvious:**

- **`useFrame` never runs, so what you see is the JSX default, not the settled value.** A light whose frame loop drives it to `intensity = 2` but declares `intensity={14}` will render at 14 and look like a bug that isn't there. (It *is* still a real bug — that's the first frame in a live browser too. Keep declared values and their frame-loop targets in agreement.)
- **GSAP never advances**, so the preloader sits at progress 0 and the scroll lock never releases.
- **The XP window is GSAP-sized, so it measures 0 wide** — and R3F does not mount `<Canvas>` children until it has a non-zero measurement. `window.__r3f` stays `undefined` and it looks like the scene failed to load.

Working recipe: force the `.xp-events-transition-wrapper / -window / -body` chain to a real width/height, dispatch `resize`, wait, then drive `gl.render(scene, camera)` and `toDataURL()` **in the same task** (no `preserveDrawingBuffer`, so the buffer dies at composite). Push the data URL to `POST /api/devshot` to get a file you can actually open. You do not need the page scroll at all — set `camera.position` directly; scroll only feeds `progressRef`, which only moves the camera.

**Measure, don't eyeball.** Sample mean/min/max/stdev from the rendered buffer. Bright slab highlights made the pavement read as blown-out white when it was actually mid-grey `[100,103,105]` — and the same measurement showed the *wall* was darker than the pavement, which was the real defect and was invisible by eye. `stdev` is a decent proxy for surface depth; `min` catches black crush that "looks fine" in a thumbnail.

**Assert the live state before trusting a measurement.** Read `scene.environmentIntensity`, `gl.toneMappingExposure`, the light intensities and `material.envMapIntensity` off the running scene and check them against the source, and confirm `texture.image.complete` — the wall's textures load via `loader.load()` with no Suspense, so it renders untextured for a beat. An editor revert once silently reset `environmentIntensity` while tuning, and several measurements were taken against a baseline that had moved, which made raising a brightness dial appear to darken the scene. Also beware filters like `width > 60` when hunting the wall mesh: the 72m asphalt road matches before the 68m wall does.

`WallScene.tsx` and `wallMaterial.ts` expose `window.__r3f` and `window.__wallTex` behind `process.env.NODE_ENV !== 'production'`. `src/app/api/devshot/route.ts` is dev-gated too (folders prefixed `_` are private in the App Router and will 404 — do not rename it back). **Remove all three before shipping.**

## 3D Model Pipeline

When given a raw `.glb` file:
1. Compress with `gltf-transform` (Draco + Meshopt): `npx gltf-pack -i input.glb -o models/gbl/output-transformed.glb`
2. Generate React component with `gltfjsx`: `npx gltfjsx models/gbl/output-transformed.glb -o models/reactComponent/Output.tsx`
3. Store compressed `.glb` in `models/gbl/` and the final component in `models/reactComponent/`
4. For prod access, copy `.glb` to `public/models/`

All 3D components are dynamically imported with `ssr: false`:
```ts
const MyModel = dynamic(() => import('../../../models/reactComponent/MyModel'), { ssr: false });
```

## Era System

The site's visual identity shifts across four eras. The system is defined in `src/lib/eraTransitions.ts`.

| Era | CSS variables | Fonts |
|-----|--------------|-------|
| 1970s | `--bg #1A1512`, `--primary #E8412A`, `--secondary #E0A526` | `--font-70s-display` (Fraunces), `--font-70s-body` (Plus Jakarta Sans) |
| 1980s | `--bg #12111A`, `--primary #FF2E7E`, `--secondary #5A4FFF` | `--font-88s-display` (Righteous), `--font-88s-body` (Space Grotesk) |
| 1990s | `--bg #0D1420`, `--primary #028A8A`, `--secondary #7B2FBF` | `--font-90s-display` (Special Elite), `--font-90s-body` (Share Tech Mono) |
| 2000s | `--bg #141C2E`, `--primary #00D4E8`, `--secondary #B4E600` | `--font-00s-display` (Orbitron), `--font-00s-body` (Outfit) |

Era fonts are exported from `src/lib/fonts.ts` as CSS variable names (e.g. `--font-70s-display`) and applied to `<html>` via className variables in `layout.tsx`. Use `eraFonts` map from `fonts.ts` to apply fonts programmatically.

## Performance Rules

Target: **60fps on a mid-range laptop**.

- All R3F canvas components use `dpr={[1, 1.5]}` and `powerPreference: 'high-performance'`
- Remaining procedural textures (graffiti, sidewalk, macro layer, poster paper) are generated once in `useMemo` or module-level caches — never regenerate on re-render
- Camera and light updates happen inside `useFrame` callbacks, never through React state
- All 3D and heavy components use `next/dynamic` with `ssr: false`
- The `progressRef` pattern (mutable ref passed into R3F) is intentional — avoids React re-renders on every scroll tick
- **Canvas texture synthesis blocks the main thread.** Every `getImageData`/`putImageData` pass over a 2048×1024 buffer costs real milliseconds, and the wall builds while the preloader is animating. Prefer a baked image file over generating pixels at runtime; prefer half-res for low-frequency maps (roughness, AO). This is a large part of why the wall is a scan.
- Textures pack multiple channels where the shader allows it (AO in R + roughness in G) — one request, one upload, half the VRAM

## Public Assets Layout
### Act 4 — Contact Us (`src/components/sections/contact/ContactSection.tsx`)

The final act of the single-page cinematic experience, integrated directly into the global Windows XP desktop interface.

- **Windows XP Desktop Integration:** The "Contact Us" tab already exists beside the "Student Council 2026-27 Player" tab on the bottom Windows XP taskbar. Do NOT re-create or duplicate the tab button.
- **Synchronized Scroll Handoff:** As the user scrolls into Act 4, the existing active Student Council player window minimizes smoothly down into its taskbar button, while the existing Contact Us tab opens and maximizes smoothly right out from its location on the taskbar. The opened window retains identical border dimensions and frame styling as the Council tab window.
- **Local Asset Directory (`public/Contact_us/`):**
  * Background Image: `public/Contact_us/bgi.jpg`
  * Left Hand Raster Asset: `public/Contact_us/left_hand.jpeg`
  * Right Hand Raster Asset: `public/Contact_us/right_hand.jpeg`
  * Hand Convergence Reference: `public/Contact_us/hands_meeting.jpg`
  * Typography Reference: `public/Contact_us/font.jpg` (or `--font-00s-display`)
  * GDG logo asset: `public/Contact_us/dowload.png`
- **Interactive Layer & Performance:** Hand positional translations are driven via GSAP ScrollTrigger using a mutable `progressRef` (never React `useState`) to preserve the 60fps budget[cite: 2]. The hands scale aggressively to fill major screen area and minimize empty void space.
- **Layout & Symmetry Matrix:**
  * Top Header: **CONTACT US** (All Caps)[cite: 2]
  * Central Symmetry Point: GDG logo container where hand fingertips converge[cite: 2].
  * Google Maps Integration: Google Maps embed for Fr. Conceicao Rodrigues College of Engineering (Bandra, Mumbai) fades in and zooms out originating from the central GDG logo.
  * Interactive Platform Nodes: Placed cleanly *below* the GDG logo without overlapping:
    - GitHub: `https://github.com/CRCE-GDSC`[cite: 2]
    - LinkedIn: `https://www.linkedin.com/company/gdsc-crce/`[cite: 2]
    - Instagram: `https://www.instagram.com/gdg_crce/`[cite: 2]
    - Email Anchor: `mailto:crcegdsc@gmail.com`[cite: 2]
  * Bottom Right Footer Quote: **What Continues Becomes Greater** (Title Case)[cite: 2]

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

This is a **single-page cinematic experience** for GDG CRCE, structured as a linear three-act sequence:

```
Preloader → HeroVideoSection → EventsSection
```

The page (`src/app/page.tsx`) manages two state flags: `loading` and `videoStarted`. The Preloader mounts on top of the main content, calls `onStartTransition` to wake the hero video early (zero-gap handoff), then calls `onComplete` to unmount itself.

### Act 1 — Preloader (`src/components/sections/Preloader.tsx`)

A fullscreen overlay with a **GSAP timeline** (not scroll-driven) that auto-plays three phases:
1. FilmTape rewinds from 2020s → 70s (progress 0 → 0.60)
2. FilmTape exits, VHSTape slides in from right (progress 0.60 → 0.80)
3. Camera zooms through center of VHS logo into the hero video (progress 0.80 → 1.0)

All visual math is computed in a single `useMemo` block (`visual`) from a single `progress` scalar (0–1). Never drive animations from multiple progress values; derive everything from this one number.

The `usePreloaderAudio` hook (`src/hooks/usePreloaderAudio.ts`) runs a **procedural Web Audio API engine** — pink noise hum + mechanical whir. It falls back to files at `public/audio/tape-hum.mp3`, `public/audio/tape-rewind.mp3`, `public/audio/tape-insert.mp3` if present. Audio initializes lazily on first user interaction.

### Act 2 — Hero Video (`src/components/sections/hero-video/HeroVideoSection.tsx`)

Full-viewport `<video>` playing `public/videos/intro.mp4`. Scroll is locked (`overflow: hidden`) for the first 10 seconds of playback, then auto-unlocks. The scroll lock is enforced by a `scroll` event listener that enforces `window.scrollTo(0, 0)` — do not fight this pattern.

### Act 3 — Events Wall (`src/components/sections/events/`)

A **GSAP ScrollTrigger-pinned** section (3500px scroll travel) housing an R3F `<Canvas>`. The `progressRef` (a mutable ref, not state) is passed directly into Three.js `useFrame` callbacks for zero-React-overhead camera movement. Never convert this to React state.

The 3D wall scene (`src/components/three/WallScene.tsx`) contains:
- `InteractiveCameraRig` — walks camera along X axis (−24 → 23) and adds mouse look + walking stride
- `HandheldFlashlight` — PointLight tracking cursor position for an interactive torch effect
- `OldBrokenBrickWall` — procedural brick + plaster texture generated on Canvas at runtime
- `EventPoster3D` — wheat-paste poster planes, one per event in `eventData.ts`
- `GraffitiTag` — spray-paint graffiti generated on Canvas at runtime
- All street props in `src/components/three/AlleyProps3D.tsx`

Event data (positions, poster images, titles) lives in `src/components/sections/events/eventData.ts`. Poster images are in `public/elements/poster-N.png`.

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
- Procedural textures (brick, graffiti, sidewalk) are generated once in `useMemo` — never regenerate on re-render
- Camera and light updates happen inside `useFrame` callbacks, never through React state
- All 3D and heavy components use `next/dynamic` with `ssr: false`
- The `progressRef` pattern (mutable ref passed into R3F) is intentional — avoids React re-renders on every scroll tick

## Public Assets Layout

```
public/
  audio/        # tape-hum.mp3, tape-rewind.mp3, tape-insert.mp3 (optional; procedural fallback exists)
  elements/     # Era props (70s-vinyl-record.png, 80s-cassette.png, etc.) + poster-N.png
  models/       # Compressed .glb files served at runtime
  videos/       # intro.mp4 (pre-buffered in preloader before main sequence starts)
  logo.png      # GDG logo used as VHS play button
```
### Act 4 — Contact Us (`src/components/sections/contact/ContactSection.tsx`)

The final act of the single-page cinematic experience. The layout under the animation layer is entirely static—all logos, social links, and text are immediately present with no fade-ins or scroll-triggered visibility states[cite: 2]. 

- **Era Mapping:** Strictly locked to the **2000s Era** layout metrics[cite: 2]. Header text ("CONTACT US") and footer branding ("What continues, becomes greater") must use `--font-00s-display` (Orbitron) with a distinctive cyan arcade/cyberpunk neon glow text-shadow effect[cite: 2].
- **Interactive Layer:** Contains a high-performance animation layer featuring two procedurally rendered hands (built via layered vector SVGs or Canvas elements mimicking the textured Pinterest reference)[cite: 2].
- **Scroll Tracking:** The hands' movement (gliding from the horizontal screen margins to meet at the dead-center GDG logo) must be driven strictly via a GSAP ScrollTrigger mutable `progressRef` mapping[cite: 2]. Never hook this animation to React state variables, as it will violate the 60fps performance rule[cite: 2].
- **Hardcoded Contact Data Matrix:**
  * GitHub Container Target: `https://github.com/CRCE-GDSC`
  * LinkedIn Container Target: `https://www.linkedin.com/company/gdsc-crce/`
  * Instagram Container Target: `https://www.instagram.com/gdg_crce/`
  * Email Contact Trigger: `mailto:crcegdsc@gmail.com`
  * Physical Location Label (Fallback text if needed): "Fr. Conceicao Rodrigues College of Engineering, Bandstand, Bandra (W) Mumbai - 400050"
- **Layout Grid:** Features the GDG logo container as the central focus point where the fingertips meet, flanked by the clickable social nodes listed above[cite: 2]. The official email sits pinned to the bottom-left viewport, and the quote text is pinned to the bottom-right[cite: 2].
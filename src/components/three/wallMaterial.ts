'use client';

import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════════
   Old concrete wall — data-driven material generator

   Three rules govern this file, in order of how much they matter.

   1. THE WALL IS A PLACE, NOT A TEXTURE.
      Weather is organic and noise can describe it. But a wall that dozens of
      people have used for twenty years has also been patched, painted over,
      drilled, taped, postered and scraped — and every one of those marks is
      RECTILINEAR, because people make straight edges. Straight edges among
      organic decay are what say "a person did this." A wall built only from
      noise has no people in it, and no amount of better noise will ever fix
      that. See THE HISTORY LAYER.

   2. ONE GEOMETRIC TRUTH DRIVES EVERY CHANNEL.
      Cracks, paint strata, repairs and ghosts are generated once as data,
      then rasterised into albedo, height, roughness and AO in a single fused
      pass. A crack therefore darkens, recesses, roughens and occludes at
      exactly the same texels. Decorrelated channels are the loudest CG tell
      there is — light raking over relief the colour never acknowledges.

   3. WEATHERING IS NOT UNIFORM RANDOM.
      Dirt is placed by physics: capillary rise from the ground, gravity
      runoff from real features, and cavity accumulation derived from the
      height field itself.

   PALETTE: cool grey concrete, dirty white, neutral cement, faded beige.
   Warmth is an accent that has to be earned — rust from a bolt hole, the
   beige of old wheat paste — never the temperature of the wall itself.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Seeded RNG so the wall is identical across reloads ── */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Tileable value-noise fBm ──────────────────────────────────────────────
   Coherent multi-octave noise. The previous wall had none — only per-pixel
   Math.random() (white noise) and hand-placed ellipses, which is why every
   feature read as either "static" or "blob". fBm is what gives natural
   coastline-shaped peel edges and organic large-scale drift.
   Lattices wrap, so the field is seamless when the texture tiles.
   ────────────────────────────────────────────────────────────────────────── */

type Field = { w: number; h: number; d: Float32Array };

type Lattice = { w: number; h: number; d: Float32Array };

function makeLattice(w: number, h: number, rnd: () => number): Lattice {
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = rnd();
  return { w, h, d };
}

function sampleLattice(L: Lattice, x: number, y: number): number {
  const fx = x * L.w;
  const fy = y * L.h;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const j0 = ((x0 % L.w) + L.w) % L.w;
  const j1 = (j0 + 1) % L.w;
  const i0 = ((y0 % L.h) + L.h) % L.h;
  const i1 = (i0 + 1) % L.h;
  const v00 = L.d[i0 * L.w + j0];
  const v10 = L.d[i0 * L.w + j1];
  const v01 = L.d[i1 * L.w + j0];
  const v11 = L.d[i1 * L.w + j1];
  return (v00 * (1 - sx) + v10 * sx) * (1 - sy) + (v01 * (1 - sx) + v11 * sx) * sy;
}

/** Build an fBm field at `w`x`h`. Cheap enough to run at mask resolution and
 *  bilinear-upsample in the main loop. */
function fbmField(
  w: number,
  h: number,
  seed: number,
  octaves: number,
  baseX: number,
  baseY: number
): Field {
  const rnd = mulberry32(seed);
  const lattices: Lattice[] = [];
  for (let o = 0; o < octaves; o++) {
    lattices.push(makeLattice(baseX << o, baseY << o, rnd));
  }
  const d = new Float32Array(w * h);
  let min = Infinity;
  let max = -Infinity;
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      let sum = 0;
      let amp = 1;
      let norm = 0;
      for (let o = 0; o < octaves; o++) {
        sum += sampleLattice(lattices[o], u, v) * amp;
        norm += amp;
        amp *= 0.5;
      }
      const val = sum / norm;
      d[y * w + x] = val;
      if (val < min) min = val;
      if (val > max) max = val;
    }
  }
  // Normalise to a full 0..1 range so thresholds are predictable
  const span = max - min || 1;
  for (let i = 0; i < d.length; i++) d[i] = (d[i] - min) / span;
  return { w, h, d };
}

/** Bilinear sample of a Field. u wraps (texture tiles horizontally), v clamps
 *  (gravity gives the vertical axis a privileged direction — it must not tile). */
function sampleField(f: Field, u: number, v: number): number {
  const fx = u * f.w - 0.5;
  const fy = Math.min(Math.max(v, 0), 0.9999) * f.h - 0.5;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const j0 = ((x0 % f.w) + f.w) % f.w;
  const j1 = (j0 + 1) % f.w;
  const i0 = Math.min(Math.max(y0, 0), f.h - 1);
  const i1 = Math.min(i0 + 1, f.h - 1);
  const v00 = f.d[i0 * f.w + j0];
  const v10 = f.d[i0 * f.w + j1];
  const v01 = f.d[i1 * f.w + j0];
  const v11 = f.d[i1 * f.w + j1];
  return (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}

/* ── Height → tangent-space normal map ── */
export function heightToNormalCanvas(
  source: HTMLCanvasElement,
  size: number,
  strength: number
): HTMLCanvasElement {
  const hCanvas = document.createElement('canvas');
  hCanvas.width = size;
  hCanvas.height = Math.round((size * source.height) / source.width);
  const hCtx = hCanvas.getContext('2d')!;
  hCtx.drawImage(source, 0, 0, hCanvas.width, hCanvas.height);

  const w = hCanvas.width;
  const h = hCanvas.height;
  const hd = hCtx.getImageData(0, 0, w, h).data;
  const getH = (x: number, y: number) => {
    const xi = (x + w) % w;
    const yi = Math.min(Math.max(y, 0), h - 1);
    return hd[(yi * w + xi) * 4] / 255;
  };

  const nCanvas = document.createElement('canvas');
  nCanvas.width = w;
  nCanvas.height = h;
  const nCtx = nCanvas.getContext('2d')!;
  const out = nCtx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = (getH(x + 1, y) - getH(x - 1, y)) * strength;
      const gy = (getH(x, y + 1) - getH(x, y - 1)) * strength;
      const len = Math.sqrt(gx * gx + gy * gy + 1);
      const idx = (y * w + x) * 4;
      out.data[idx] = (-gx / len) * 0.5 * 255 + 127.5;
      out.data[idx + 1] = (-gy / len) * 0.5 * 255 + 127.5;
      out.data[idx + 2] = (1 / len) * 0.5 * 255 + 127.5;
      out.data[idx + 3] = 255;
    }
  }
  nCtx.putImageData(out, 0, 0);
  return nCanvas;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Wall geometry constants — shared with WallScene so decals, runoff features
   and the macro layer all agree on where things physically are.
   ═══════════════════════════════════════════════════════════════════════════ */

export const WALL = {
  width: 68,
  height: 9.6,
  /** Mesh centre Y. Wall spans y = -1.0 → 8.6; ground sits at y ≈ 0. */
  centerY: 3.8,
  get bottomY() {
    return this.centerY - this.height / 2;
  },
  /** Horizontal tiling of the detail texture. The macro layer (1:1, never
   *  tiles) is what stops this reading as a 17m loop. */
  repeatX: 4,
} as const;

/** World X of features that physically shed water onto the wall. Runoff is
 *  authored FROM these, not scattered — the stain exists because that pipe
 *  leaks, which is the whole point of environmental storytelling. */
export const RUNOFF_SOURCES = {
  /** Vertical drain pipes (AlleyIndustrialDetails) */
  pipes: [-24, -13, -2, 9, 21],
  /** Barred vent window sills (AlleyIndustrialDetails) */
  sills: [-18, 2, 14],
  /** Fire-escape utility platform (RightSideAlleyDetail) */
  platform: 15.5,
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   Detail texture set — tiled 4x horizontally.

   Carries what the wall is made of (concrete, paint strata, cracks, damp) AND
   what has been done to it (paste ghosts, repairs, buffed rectangles, tape,
   bolt holes). Everything here is horizontally tileable and height-correct.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════
   Base material — photogrammetry scan.

   This replaces ~700 lines of procedural canvas synthesis, and the reason is
   worth recording so nobody rebuilds it.

   Canvas 2D cannot reach photoreal aged concrete, and not because of a bad
   parameter. Real surfaces carry correlated structure at EVERY scale at once:
   mineral grain, aggregate, micro-pitting, stain following porosity, a chip
   exposing a substrate that has grain of its own. Each of those is a physical
   process. Approximating each with a flat fill and hoping they compose gives
   you flat colour fields with noisy edges — which is exactly what the generator
   produced, however hard its thresholds were tuned. The reference photographs
   we were chasing are photographs. That was always the answer.

   ambientCG PaintedPlaster016 — CC0, height-field photogrammetry, white
   limewash failing off masonry. Baked from a 19.4MB raw 2K set down to 818KB:
   1024px, AO packed into R and roughness into G of one image (three reads
   aoMap.r and roughnessMap.g), albedo regraded cool at bake time so it costs
   nothing at runtime.

   What still layers on top, and why the scan does not make it redundant:
     • macroMap  — a scan tiles too. Without it this repeats every 4.25m.
     • runoff    — anchored to the real pipes and sills in the scene.
     • ghosts    — poster history belongs to THIS wall, not to a stock scan.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface WallTextureSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  /** AO in .r and roughness in .g of one packed image — same texture object */
  roughnessMap: THREE.Texture;
  aoMap: THREE.Texture;
  macroMap: THREE.CanvasTexture;
}

let cached: WallTextureSet | null = null;

/** Repeats across the 68m wall. The scan covers roughly 2m, but tiling it 34x
 *  would be absurd even with macro breakup; 16 keeps texel density high
 *  (~240 px/m, double the old procedural tile) while leaving the macro layer a
 *  fighting chance of hiding the period. */
const SCAN_REPEAT_X = 16;
const SCAN_REPEAT_Y = 2.4;

export function buildWallTextures(loader: THREE.TextureLoader): WallTextureSet {
  if (cached) return cached;

  const setup = (t: THREE.Texture, srgb: boolean) => {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(SCAN_REPEAT_X, SCAN_REPEAT_Y);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  const map = setup(loader.load('/textures/wall/plaster_color.jpg'), true);
  const normalMap = setup(loader.load('/textures/wall/plaster_normal.jpg'), false);
  // One image, two slots: three samples aoMap.r and roughnessMap.g, so the same
  // texture serves both and costs one request instead of two.
  const aoRough = setup(loader.load('/textures/wall/plaster_ao_rough.jpg'), false);

  cached = {
    map,
    normalMap,
    roughnessMap: aoRough,
    aoMap: aoRough,
    macroMap: buildMacroMap(),
  };

  if (process.env.NODE_ENV !== 'production') {
    (window as unknown as { __wallTex?: WallTextureSet }).__wallTex = cached;
  }

  return cached;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Macro layer — 1:1 across all 68m, never tiles.

   Two jobs:
   1. Kill periodicity. The detail texture repeats every 17m; a non-repeating
      modulation on top means no two tiles ever read the same. This is the
      cheap answer — a 4096px texture would cost ~96MB across three maps.
   2. Carry world-anchored story. Runoff belongs here, not in the tiled detail,
      because a stain must sit under the pipe that actually causes it.

   R = tonal drift · G = grime/soot · B = damp/wet sheen
   ═══════════════════════════════════════════════════════════════════════════ */

function buildMacroMap(): THREE.CanvasTexture {
  const W = 1024;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  const drift = fbmField(256, 64, 909, 5, 3, 2);
  const soot = fbmField(256, 64, 808, 4, 2, 1);

  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const v = y / H;
    const worldY = WALL.centerY + WALL.height / 2 - v * WALL.height;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const i = (y * W + x) * 4;

      // Large-scale tonal drift: some stretches of wall are simply lighter
      const dr = sampleField(drift, u, v);

      // Broad soot fields, heavier low and in sheltered stretches
      let gr = sampleField(soot, u, v) * 0.5;
      gr += (1 - smoothstep(0.0, 3.0, worldY)) * 0.28;

      // Wind-driven rain washes the upper wall clean
      gr *= 1 - smoothstep(5.0, 8.4, worldY) * 0.7;

      img.data[i] = dr * 255;
      img.data[i + 1] = Math.min(1, gr) * 255;
      img.data[i + 2] = (1 - smoothstep(0.0, 1.1, worldY)) * 190;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  /* ── Gravity runoff, authored from real scene features ────────────────
     The old wall scattered 28 rust streaks at Math.random() heights and put
     10 evenly-spaced grime quads at y=4.4 — unrelated to the pipes standing
     right there. Nothing said "this stain has a cause". These do.          */
  const toU = (worldX: number) => ((worldX + WALL.width / 2) / WALL.width) * W;
  const toV = (worldY: number) => ((WALL.centerY + WALL.height / 2 - worldY) / WALL.height) * H;

  const rnd = mulberry32(0x51ee);

  // Streaks are accumulated in their own greyscale canvas, then added into the
  // macro texture's green (grime) channel — canvas has no per-channel additive
  // blend, so compositing separately is the only clean way to do this.
  const gCanvas = document.createElement('canvas');
  gCanvas.width = W;
  gCanvas.height = H;
  const gc = gCanvas.getContext('2d')!;
  gc.fillStyle = '#000';
  gc.fillRect(0, 0, W, H);
  gc.globalCompositeOperation = 'lighter';

  const gStreak = (worldX: number, fromY: number, toY: number, width: number, strength: number) => {
    const x0 = toU(worldX);
    const y0 = toV(fromY);
    const y1 = toV(toY);
    const fingers = 3 + Math.floor(rnd() * 4);
    for (let f = 0; f < fingers; f++) {
      const off = (rnd() - 0.5) * width * 2.6;
      const wf = width * (0.3 + rnd() * 0.8);
      const s = strength * (0.45 + rnd() * 0.75);
      const g = gc.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, `rgba(255,255,255,${s})`);
      g.addColorStop(0.6, `rgba(255,255,255,${s * 0.5})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      gc.fillStyle = g;
      gc.fillRect(x0 + off - wf / 2, y0, wf, y1 - y0);
    }
  };

  // Pipes leak from top to ground — the longest, strongest stains
  for (const px of RUNOFF_SOURCES.pipes) gStreak(px + 0.3, 7.7, -0.8, 10, 0.5);
  // Window sills shed a shorter, wider fan
  for (const sx of RUNOFF_SOURCES.sills) gStreak(sx, 5.4, 1.2, 26, 0.32);
  // The platform drips along its whole span
  for (let i = -2; i <= 2; i++) {
    gStreak(RUNOFF_SOURCES.platform + i * 0.9, 4.9, 0.4, 7, 0.28);
  }

  const gData = gc.getImageData(0, 0, W, H).data;
  const base = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < W * H; i++) {
    const j = i * 4;
    base.data[j + 1] = Math.min(255, base.data[j + 1] + gData[j] * 0.85);
  }
  ctx.putImageData(base, 0, 0);

  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  return t;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Macro-layer shader injection.

   MeshStandardMaterial has no detail/macro slot, so patch it. Two extra
   fetches from a tiny (1024x256) texture — near-perfect cache hit rate, far
   cheaper than the memory a non-tiling 4K texture set would cost.
   ═══════════════════════════════════════════════════════════════════════════ */

export function applyMacroLayer(material: THREE.MeshStandardMaterial, macroMap: THREE.Texture) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMacroMap = { value: macroMap };
    shader.uniforms.uMapRepeat = { value: new THREE.Vector2(SCAN_REPEAT_X, SCAN_REPEAT_Y) };

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform sampler2D uMacroMap;
         uniform vec2 uMapRepeat;`
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
         // vMapUv is uv * repeat, un-wrapped — divide it back out to recover
         // the 0..1 wall-space UV the macro layer lives in.
         vec3 macroS = texture2D( uMacroMap, vMapUv / uMapRepeat ).rgb;
         diffuseColor.rgb *= 0.46 + macroS.r * 1.05;
         diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3(0.22, 0.24, 0.29), macroS.g * 1.35 );`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         vec3 macroR = texture2D( uMacroMap, vMapUv / uMapRepeat ).rgb;
         roughnessFactor = clamp( roughnessFactor + macroR.g * 0.10 - macroR.b * 0.30, 0.05, 1.0 );`
      );
  };
  // Distinct key so this variant doesn't collide with stock standard materials
  material.customProgramCacheKey = () => 'weathered-wall-macro';
}

/* ═══════════════════════════════════════════════════════════════════════════
   Alley environment map.

   The scene had NO environment, so every metal (manholes 0.88, pipes 0.75,
   puddles 0.88) reflected a void and rendered as a flat dark blob, and a flat
   warm ambientLight filled every crevice from every direction — which is
   precisely what "evenly lit render" means.

   A tiny procedural equirect (cool night sky above, sodium bounce below) gives
   directional ambient: brighter from above, warmer from below. That gradient
   alone does more for material read than any amount of ambientLight, and it
   costs one 256x128 PMREM built once. No network fetch.
   ═══════════════════════════════════════════════════════════════════════════ */

export function buildAlleyEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0.0, '#39404A'); // zenith — overcast sky, neutral cool
  g.addColorStop(0.42, '#454B53');
  g.addColorStop(0.5, '#4A4E52'); // horizon — flat, neutral
  g.addColorStop(0.62, '#3A3833'); // ground bounce, barely warm
  g.addColorStop(1.0, '#222326'); // nadir — wet tarmac
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);

  // Warm lamp smudges near the horizon so metals catch something with shape
  for (let i = 0; i < 5; i++) {
    const x = 20 + i * 48;
    const rg = ctx.createRadialGradient(x, 62, 2, x, 62, 26);
    rg.addColorStop(0, 'rgba(255, 214, 170, 0.32)');
    rg.addColorStop(1, 'rgba(255, 214, 170, 0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - 26, 36, 52, 52);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromEquirectangular(tex);
  tex.dispose();
  pmrem.dispose();
  return rt.texture;
}

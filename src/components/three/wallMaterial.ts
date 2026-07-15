'use client';

import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════════
   Procedural Weathered Masonry — data-driven material generator

   Design rule that governs this whole file: ONE GEOMETRIC TRUTH DRIVES EVERY
   CHANNEL. Cracks, paint strata and brick are generated once as data/fields,
   then rasterised into albedo, height, roughness and AO in a single fused
   pass. A crack therefore darkens, recesses, roughens and occludes at exactly
   the same texels. Decorrelated channels are the loudest "CG" tell there is —
   light rakes over relief the colour doesn't acknowledge.

   Second rule: WEATHERING IS NOT UNIFORM RANDOM. Dirt is placed by physics —
   capillary rise from the ground, gravity runoff from real features, and
   cavity accumulation derived from the height field itself.
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

/** Cheap per-pixel hash noise — used to roughen mask coastlines at texel scale
 *  so bilinear-upsampled fBm edges never look soft or blobby. */
function hash2(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
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

/** Approximate blur by bilinear downsample→upsample. Faster and better
 *  supported than ctx.filter, and the octave is exactly the cavity scale we
 *  want (~8 texels ≈ 7cm, wide enough to bridge a crack). */
function blurViaResample(src: HTMLCanvasElement, divisor: number): HTMLCanvasElement {
  const small = document.createElement('canvas');
  small.width = Math.max(1, Math.round(src.width / divisor));
  small.height = Math.max(1, Math.round(src.height / divisor));
  const sc = small.getContext('2d')!;
  sc.imageSmoothingEnabled = true;
  sc.drawImage(src, 0, 0, small.width, small.height);

  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const oc = out.getContext('2d')!;
  oc.imageSmoothingEnabled = true;
  oc.drawImage(small, 0, 0, out.width, out.height);
  return out;
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
   Detail texture set — the material truth, tiled 4x horizontally.
   Carries what the wall IS MADE OF (brick, paint strata, cracks, cavity dirt,
   rising damp). Everything here is horizontally tileable and height-correct.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface WallTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
  macroMap: THREE.CanvasTexture;
}

let cached: WallTextureSet | null = null;

export function buildWallTextures(): WallTextureSet {
  if (cached) return cached;

  const W = 2048;
  const H = 1024;
  const rnd = mulberry32(0x5ec7);

  /* ── Fields ────────────────────────────────────────────────────────────
     Three paint strata, each thresholded from its own fBm. Layering them
     with descending coverage produces exposed cross-sections — the "layered
     paint / exposed plaster / chipped concrete" strata the reference shows,
     instead of one blobby stucco pass.                                     */
  const MW = 512;
  const MH = 256;
  const fRender = fbmField(MW, MH, 101, 5, 3, 2); // grey cement render coat
  const fPaint = fbmField(MW, MH, 202, 5, 4, 2); // institutional paint layer
  const fLime = fbmField(MW, MH, 303, 6, 5, 3); // bone limewash topcoat
  const fDamp = fbmField(MW, MH, 505, 4, 6, 1); // wobbles the damp tide line

  /* ── Cracks as DATA (not drawn twice with different randoms) ───────────
     Rasterised once into a mask, then consumed by albedo + height + rough +
     AO. This is the fix for the single worst defect in the old wall: albedo
     cracks and normal-map cracks were in completely different places.      */
  type Crack = { pts: [number, number][]; width: number };
  const cracks: Crack[] = [];

  const growCrack = (sx: number, sy: number, ey: number, width: number): Crack => {
    const pts: [number, number][] = [];
    const steps = 44;
    const stepY = (ey - sy) / steps;
    let x = sx;
    let y = sy;
    // Bias keeps a crack propagating in one direction rather than jittering —
    // real fracture follows stress, it doesn't random-walk.
    let bias = (rnd() - 0.5) * 6;
    for (let i = 0; i <= steps; i++) {
      pts.push([x, y]);
      bias += (rnd() - 0.5) * 3.2;
      bias = Math.max(-9, Math.min(9, bias));
      x += bias;
      y += stepY;
    }
    return { pts, width };
  };

  // Main structural cracks, irregularly spaced (evenly spaced = lattice = CG)
  let cx = 60 + rnd() * 90;
  while (cx < W) {
    cracks.push(growCrack(cx, -20 + rnd() * 60, H + 20, 3 + rnd() * 3.5));
    // Branch
    if (rnd() > 0.45) {
      const parent = cracks[cracks.length - 1];
      const at = parent.pts[Math.floor(parent.pts.length * (0.25 + rnd() * 0.5))];
      const br = growCrack(at[0], at[1], at[1] + 120 + rnd() * 260, 1.4 + rnd() * 1.6);
      cracks.push(br);
    }
    cx += 130 + rnd() * 260;
  }

  const crackCanvas = document.createElement('canvas');
  crackCanvas.width = W;
  crackCanvas.height = H;
  const crCtx = crackCanvas.getContext('2d')!;
  crCtx.fillStyle = '#000';
  crCtx.fillRect(0, 0, W, H);
  crCtx.strokeStyle = '#fff';
  crCtx.lineCap = 'round';
  crCtx.lineJoin = 'round';
  // Draw each crack three times (-W, 0, +W) from the SAME point data so the
  // texture wraps seamlessly. Wrapping requires precomputed geometry — this is
  // why cracks are data, not inline Math.random() draws.
  for (const dx of [-W, 0, W]) {
    crCtx.save();
    crCtx.translate(dx, 0);
    for (const c of cracks) {
      crCtx.lineWidth = c.width;
      crCtx.beginPath();
      crCtx.moveTo(c.pts[0][0], c.pts[0][1]);
      for (let i = 1; i < c.pts.length; i++) crCtx.lineTo(c.pts[i][0], c.pts[i][1]);
      crCtx.stroke();
    }
    crCtx.restore();
  }
  const crackRaw = crCtx.getImageData(0, 0, W, H).data;
  const crackMask = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) crackMask[i] = crackRaw[i * 4] / 255;

  /* ── Brick substrate (data, not a modulo lattice) ─────────────────────
     The old brick picked its tone with (r*11 + c*7) % 5 — a modulo, which
     produces visible repeating diagonal stripes — in a saturated toy red.
     Replaced outright: hashed per-brick tone, jittered courses, desaturated
     aged clay, mortar residue. Under plaster, brick is dark and dirty.     */
  const brickTones: [number, number, number][] = [
    [0x6a, 0x4a, 0x3e],
    [0x5c, 0x3e, 0x34],
    [0x73, 0x53, 0x3f],
    [0x52, 0x3a, 0x31],
    [0x65, 0x44, 0x39],
    [0x7a, 0x5a, 0x46],
  ];
  const BRICK_W = 96;
  const BRICK_H = 34;
  const MORTAR = 7;

  const albedo = new Uint8ClampedArray(W * H * 4);
  const height = new Uint8ClampedArray(W * H * 4);
  const rough = new Uint8ClampedArray(W * H * 4);

  /* ── The fused pass ───────────────────────────────────────────────────
     Albedo, height and roughness written together from the same fields, so
     they can never disagree. */
  for (let y = 0; y < H; y++) {
    const v = y / H;
    // Canvas row 0 = wall top (CanvasTexture flipY). Recover world height:
    const worldY = WALL.centerY + WALL.height / 2 - v * WALL.height;

    for (let x = 0; x < W; x++) {
      const u = x / W;
      const idx = (y * W + x) * 4;
      const px = hash2(x, y);

      /* Brick course — jittered so no two courses align perfectly */
      const rowIdx = Math.floor(y / (BRICK_H + MORTAR));
      const rowJit = (hash2(rowIdx, 7717) - 0.5) * 5;
      const stagger = (rowIdx % 2) * ((BRICK_W + MORTAR) / 2);
      const bxRaw = x + stagger + rowJit;
      const colIdx = Math.floor(bxRaw / (BRICK_W + MORTAR));
      const inX = bxRaw - colIdx * (BRICK_W + MORTAR);
      const inY = y - rowIdx * (BRICK_H + MORTAR);
      // Mortar joints wobble — real bricklaying is not CAD
      const jw = (hash2(colIdx, rowIdx * 31) - 0.5) * 3;
      const isMortar =
        inX < MORTAR + jw || inX > BRICK_W + jw || inY < MORTAR + jw || inY > BRICK_H + jw;

      const tone = brickTones[Math.floor(hash2(colIdx, rowIdx) * brickTones.length) % brickTones.length];
      const bJit = (hash2(colIdx * 13, rowIdx * 17) - 0.5) * 22;

      let r: number, g: number, b: number;
      let hgt: number; // 0..1 relief
      let rgh: number; // 0..1 roughness

      if (isMortar) {
        const m = 0x4a + (px - 0.5) * 26;
        r = m;
        g = m - 8;
        b = m - 16;
        hgt = 0.42; // mortar sits back from the brick face
        rgh = 0.97;
      } else {
        r = tone[0] + bJit + (px - 0.5) * 16;
        g = tone[1] + bJit * 0.8 + (px - 0.5) * 16;
        b = tone[2] + bJit * 0.7 + (px - 0.5) * 16;
        hgt = 0.5 + (px - 0.5) * 0.02;
        rgh = 0.95;
      }

      /* ── Paint strata ──────────────────────────────────────────────
         Each layer thresholds its own fBm. The pixel-scale hash jitter on the
         threshold keeps the coastline crisp after bilinear upsampling. */
      const jitter = (px - 0.5) * 0.045;

      // Layer 1: grey cement render over the brick
      const renderF = sampleField(fRender, u, v) + jitter;
      const renderIn = smoothstep(0.34, 0.37, renderF);
      if (renderIn > 0) {
        const c = 0x6e + (px - 0.5) * 20;
        r = lerp(r, c, renderIn);
        g = lerp(g, c - 5, renderIn);
        b = lerp(b, c - 14, renderIn);
        hgt = lerp(hgt, 0.62, renderIn);
        rgh = lerp(rgh, 0.9, renderIn);
      }

      // Layer 2: old institutional paint
      const paintF = sampleField(fPaint, u, v) + jitter;
      const paintIn = smoothstep(0.46, 0.485, paintF) * renderIn;
      if (paintIn > 0) {
        // Exposed cross-section of the film reads brighter than its face
        const lip = smoothstep(0.46, 0.472, paintF) * (1 - smoothstep(0.478, 0.5, paintF));
        const c = 0x4e + lip * 40 + (px - 0.5) * 14;
        r = lerp(r, c, paintIn);
        g = lerp(g, c + 12 + lip * 20, paintIn);
        b = lerp(b, c + 2 + lip * 20, paintIn);
        hgt = lerp(hgt, 0.7, paintIn);
        // Old oil paint keeps a faint sheen — this is what makes paint read as
        // paint rather than as tinted plaster. Uniform roughness cannot say it.
        rgh = lerp(rgh, 0.6, paintIn);
      }

      // Layer 3: bone limewash topcoat, the newest and most-peeled
      const limeF = sampleField(fLime, u, v) + jitter;
      const limeIn = smoothstep(0.53, 0.552, limeF);
      if (limeIn > 0) {
        const lip = smoothstep(0.53, 0.542, limeF) * (1 - smoothstep(0.548, 0.575, limeF));
        const c = 0xb9 + lip * 30 + (px - 0.5) * 18;
        r = lerp(r, c, limeIn);
        g = lerp(g, c - 7, limeIn);
        b = lerp(b, c - 21, limeIn);
        hgt = lerp(hgt, 0.8, limeIn);
        rgh = lerp(rgh, 0.86, limeIn);
      }

      /* ── Cracks cut every channel at once ────────────────────────── */
      const ck = crackMask[y * W + x];
      if (ck > 0.02) {
        const k = Math.min(1, ck * 1.35);
        // Fracture reveals the dark, dirty substrate
        r = lerp(r, 0x2a, k);
        g = lerp(g, 0x20, k);
        b = lerp(b, 0x1a, k);
        hgt = lerp(hgt, 0.08, k);
        rgh = lerp(rgh, 0.99, k);
      }

      /* ── Rising damp ─────────────────────────────────────────────────
         Capillary rise from the ground, NOT a linear gradient. The old wall
         used a straight createLinearGradient — real damp has a ragged tide
         line because masonry porosity varies. fBm wobbles the boundary.    */
      const dampWob = (sampleField(fDamp, u, 0.5) - 0.5) * 0.55;
      const dampTop = 1.45 + dampWob;
      const damp = 1 - smoothstep(0.0, dampTop, worldY);
      if (damp > 0) {
        const d = damp * 0.85;
        r = lerp(r, r * 0.42, d);
        g = lerp(g, g * 0.4, d);
        b = lerp(b, b * 0.38, d);
        // Wet masonry is markedly smoother than dry — a moving light will now
        // read the damp line without any colour cue at all.
        rgh = lerp(rgh, 0.5, d * 0.8);
      }

      albedo[idx] = r;
      albedo[idx + 1] = g;
      albedo[idx + 2] = b;
      albedo[idx + 3] = 255;

      const hv = hgt * 255;
      height[idx] = hv;
      height[idx + 1] = hv;
      height[idx + 2] = hv;
      height[idx + 3] = 255;

      const rv = rgh * 255;
      rough[idx] = rv;
      rough[idx + 1] = rv;
      rough[idx + 2] = rv;
      rough[idx + 3] = 255;
    }
  }

  /* ── Micro surface detail ────────────────────────────────────────────
     Aggregate grain into the HEIGHT map (not just albedo, as before). At
     120px/m a 2px feature ≈ 1.6cm — coarse aggregate scale. This is what the
     flashlight picks up at grazing angles. */
  for (let i = 0; i < W * H; i++) {
    const n = (hash2(i % W, (i / W) | 0) - 0.5) * 26;
    const j = i * 4;
    height[j] += n;
    height[j + 1] += n;
    height[j + 2] += n;
    // Albedo grain, correlated with the same hash so grain and relief agree
    albedo[j] += n * 0.55;
    albedo[j + 1] += n * 0.55;
    albedo[j + 2] += n * 0.55;
  }

  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = W;
  heightCanvas.height = H;
  heightCanvas.getContext('2d')!.putImageData(new ImageData(height, W, H), 0, 0);

  /* ── Cavity-driven dirt ──────────────────────────────────────────────
     The highest-value trick in the file. cavity = blur(h) - h. Positive in
     recesses (mortar joints, crack throats, peel undercuts), negative on
     proud edges. Dirt accumulates in cavities; wear brightens proud edges.
     Because the cavity is derived FROM the height field, grime lands exactly
     where the geometry says it should — which is the difference between a
     material that has aged and a texture with dirt painted on it.          */
  const blurCanvas = blurViaResample(heightCanvas, 8);
  const blurData = blurCanvas.getContext('2d')!.getImageData(0, 0, W, H).data;

  const ao = new Uint8ClampedArray(W * H * 4);

  for (let i = 0; i < W * H; i++) {
    const j = i * 4;
    const cav = (blurData[j] - height[j]) / 255;

    const dirt = Math.min(0.78, Math.max(0, cav) * 2.9);
    const wear = Math.min(0.35, Math.max(0, -cav) * 1.7);

    // Cavity soot darkens albedo toward a cool-black grime
    albedo[j] = lerp(albedo[j], 0x24, dirt);
    albedo[j + 1] = lerp(albedo[j + 1], 0x1f, dirt);
    albedo[j + 2] = lerp(albedo[j + 2], 0x1a, dirt);
    // Edge wear: exposed, polished-by-contact highlights on proud edges
    albedo[j] = lerp(albedo[j], albedo[j] * 1.28 + 14, wear);
    albedo[j + 1] = lerp(albedo[j + 1], albedo[j + 1] * 1.28 + 14, wear);
    albedo[j + 2] = lerp(albedo[j + 2], albedo[j + 2] * 1.26 + 12, wear);

    // Soot is matte; worn edges are burnished
    rough[j] = lerp(rough[j], 250, dirt * 0.7);
    rough[j] = lerp(rough[j], 150, wear);
    rough[j + 1] = rough[j];
    rough[j + 2] = rough[j];

    // AO from the same cavity — only attenuates ambient/env, as it should
    const occ = 255 * (1 - Math.min(0.72, Math.max(0, cav) * 2.2));
    ao[j] = occ;
    ao[j + 1] = occ;
    ao[j + 2] = occ;
    ao[j + 3] = 255;
  }

  /* ── Pack into textures ── */
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = W;
  albedoCanvas.height = H;
  albedoCanvas.getContext('2d')!.putImageData(new ImageData(albedo, W, H), 0, 0);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = W;
  roughCanvas.height = H;
  roughCanvas.getContext('2d')!.putImageData(new ImageData(rough, W, H), 0, 0);

  const aoCanvas = document.createElement('canvas');
  aoCanvas.width = W;
  aoCanvas.height = H;
  aoCanvas.getContext('2d')!.putImageData(new ImageData(ao, W, H), 0, 0);

  const normalCanvas = heightToNormalCanvas(heightCanvas, W, 3.4);

  // Roughness and AO are low-frequency — half res is free quality.
  const halve = (src: HTMLCanvasElement) => {
    const c = document.createElement('canvas');
    c.width = src.width / 2;
    c.height = src.height / 2;
    const cx2 = c.getContext('2d')!;
    cx2.imageSmoothingEnabled = true;
    cx2.drawImage(src, 0, 0, c.width, c.height);
    return c;
  };

  const finish = (
    c: HTMLCanvasElement,
    srgb: boolean
  ): THREE.CanvasTexture => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    // Vertical must NOT tile: gravity gives v a privileged direction, so the
    // damp base and washed top are baked in at fixed heights.
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.repeat.set(WALL.repeatX, 1);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  const map = finish(albedoCanvas, true);
  const normalMap = finish(normalCanvas, false);
  const roughnessMap = finish(halve(roughCanvas), false);
  const aoMap = finish(halve(aoCanvas), false);
  const macroMap = buildMacroMap();

  cached = { map, normalMap, roughnessMap, aoMap, macroMap };
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
    shader.uniforms.uMapRepeat = { value: new THREE.Vector2(WALL.repeatX, 1) };

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
         diffuseColor.rgb *= 0.62 + macroS.r * 0.72;
         diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3(0.30, 0.27, 0.24), macroS.g );`
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
  g.addColorStop(0.0, '#0D1119'); // zenith — cold, near-black night sky
  g.addColorStop(0.42, '#161C28');
  g.addColorStop(0.5, '#2E2822'); // horizon — city glow
  g.addColorStop(0.62, '#3A2A18'); // sodium bounce off the street
  g.addColorStop(1.0, '#100E0C'); // nadir — dark tarmac
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);

  // Warm lamp smudges near the horizon so metals catch something with shape
  for (let i = 0; i < 5; i++) {
    const x = 20 + i * 48;
    const rg = ctx.createRadialGradient(x, 62, 2, x, 62, 26);
    rg.addColorStop(0, 'rgba(255, 176, 92, 0.85)');
    rg.addColorStop(1, 'rgba(255, 176, 92, 0)');
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

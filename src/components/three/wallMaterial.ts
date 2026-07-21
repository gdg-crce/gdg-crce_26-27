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

   PALETTE: warm ivory, dirty white, aged beige, light cement grey. Secondary:
   pale olive, warm charcoal, dust brown, brick red, oxidised brown. The wall
   stays MUTED — saturated colour belongs to the graffiti and the posters, and
   nowhere else.

   This used to read "cool grey concrete… warmth is never the temperature of the
   wall itself", and the albedo was graded blue to enforce it. That was a
   compensation, not a palette: the rig at the time was a 2.0-intensity golden
   sun plus five sodium lamps, and the wall was being cooled to survive it. Both
   are gone. The light is neutral overcast now, so the scan's own warm ivory and
   muted brick are exactly right and need no correction.

   The rule that survives: if the wall ever reads too warm, fix the LIGHT.
   Grading the albedo against the lighting is what produced a monochrome wall
   from a scan chosen for its colour.
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

   Source: ambientCG PaintedPlaster016 — CC0, height-field photogrammetry,
   white limewash failing off masonry.
   https://ambientcg.com/view?id=PaintedPlaster016

   Baked from a 19.4MB raw 2K set down to 818KB: 1024px, AO packed into R and
   roughness into G of one image (three reads aoMap.r and roughnessMap.g),
   albedo regraded cool at bake time so it costs nothing at runtime.
   Reproduce with:  node scripts/bake-wall-texture.mjs <unzipped-scan-folder>

   What still layers on top, and why the scan does not make it redundant:
     • macroMap  — a scan tiles too. Without it this repeats every 4.25m.
     • runoff    — anchored to the real pipes and sills in the scene.
     • ghosts    — poster history belongs to THIS wall, not to a stock scan.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface WallTextureSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  /** AO in .r, roughness in .g, CAVITY in .b — one packed image, same object */
  roughnessMap: THREE.Texture;
  aoMap: THREE.Texture;
  macroMap: THREE.CanvasTexture;
  /** Poster ghost history — R=sheltered patch, G=paste squeeze-out perimeter */
  ghostMap: THREE.CanvasTexture;
  /** High-frequency aggregate grain, tiled far finer than the scan */
  detailNormal: THREE.CanvasTexture;
  /** Fracture system — RG = normal XY, B = crack mask. One field, every channel. */
  crackMap: THREE.CanvasTexture;
}

let cached: WallTextureSet | null = null;

/** Repeats across the 68m wall.
 *
 *  Dropped from 16/2.4 to 10/1.5, which makes every feature 1.6x larger.
 *
 *  This is a scale argument, not a sharpness one. At 16 repeats a tile covered
 *  4.25m, so the scan's plaster islands landed at roughly 0.3m on the wall —
 *  and a wall covered in 0.3m light-dark patches does not read as plaster over
 *  brick, it reads as camouflage. The reference's plaster fields are nearer a
 *  metre. Bigger tiles cost texel density (~136 px/m here, against ~240 px/m
 *  needed to match screen resolution at this camera distance) so the albedo
 *  goes slightly soft — but the normal map still carries every chip edge at
 *  full strength, and under flat overcast a slightly soft albedo is what a real
 *  wall photographs like anyway. Feature scale is worth more than crispness.
 *
 *  Fewer repeats also means a longer period, so the macro layer has LESS work
 *  to do hiding it, not more. */
const SCAN_REPEAT_X = 10;
const SCAN_REPEAT_Y = 1.5;

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
    ghostMap: buildGhostMap(),
    detailNormal: buildDetailNormal(),
    crackMap: buildCrackMap(),
  };

  if (process.env.NODE_ENV !== 'production') {
    (window as unknown as { __wallTex?: WallTextureSet }).__wallTex = cached;
  }

  return cached;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Crack system.

   ONE HEIGHT FIELD DRIVES EVERY CHANNEL. This is the whole design, and it is
   not optional: cracks are generated once as geometry, then albedo, normal,
   roughness and cavity are all READ OUT of that same field. A crack therefore
   darkens, recesses, roughens and collects dirt at exactly the same texels.
   Painting cracks into the albedo and separately into a normal map is the
   loudest CG tell available — light rakes over relief the colour never
   acknowledges, and the eye catches it instantly.

   RESOLUTION. A hairline crack is ~3mm. The macro layer runs 15 px/m, where
   3mm is 1/20th of a texel — cracks simply cannot live there, which is why they
   are not in it. This map tiles instead: 1024px over a 3.24m tile is ~316 px/m,
   so a one-pixel line is ~3mm. Correct by construction.

   TILING WITHOUT A REPEAT. Tiling is normally fatal for something as
   recognisable as a crack. The escape is a COPRIME repeat: cracks at 21 against
   the scan's 10. gcd(21,10) = 1, so the two patterns only re-align after the
   full 68m — no stretch of this wall ever shows the same crack over the same
   plaster twice. The pair is what the eye reads, not either layer alone. Keep
   them coprime if you retune: 21 and 10 works, 20 and 10 would repeat every
   6.8m.

   STRUCTURAL, NOT DECORATIVE. Cracks are grown by a wandering walk that
   branches and tapers to nothing at both tips, so they read as a fracture
   propagating through a material rather than a drawn line. Plaster chips lift
   along their edges, because a crack undermines what sits beside it.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Coprime with SCAN_REPEAT_X/Y — see above. Do not make these share a factor. */
const CRACK_REPEAT_X = 21;
const CRACK_REPEAT_Y = 3;

function buildCrackMap(): THREE.CanvasTexture {
  const S = 1024;
  const h = new Float32Array(S * S); // 0 = intact surface, negative = fracture
  const rnd = mulberry32(0xc3ac);

  const idx = (x: number, y: number) => (((y % S) + S) % S) * S + (((x % S) + S) % S);

  /** Carve a fracture. Depth is cut, never added — a crack only removes. */
  const carve = (
    x0: number,
    y0: number,
    dir: number,
    len: number,
    width: number,
    depth: number,
    branchesLeft: number,
    onPoint: (x: number, y: number) => void
  ) => {
    let x = x0;
    let y = y0;
    let d = dir;
    let t = 0;
    while (t < len) {
      /* A fracture is not a root. Rock splits along a stress line: it runs
         comparatively STRAIGHT, then kinks abruptly when it meets a harder
         aggregate grain or a weaker seam. A large per-step wander (this was
         0.3 rad) integrates into smooth sweeping curves, and smooth curves on a
         wall read as vines, lichen or roots — organic growth, not fracture.
         Small drift plus rare sharp deflections is the whole difference. */
      d += (rnd() - 0.5) * 0.075;
      if (rnd() < 0.035) d += (rnd() - 0.5) * 0.95; // met something harder
      x += Math.cos(d);
      y += Math.sin(d);
      t += 1;

      // Taper to nothing at BOTH ends. A crack that starts or stops at full
      // width is a drawn line; a real one propagates out of, and dies into,
      // intact material.
      const taper = Math.sin((t / len) * Math.PI);
      const w = width * taper;
      if (w < 0.3) continue;
      onPoint(x, y);

      const ri = Math.ceil(w);
      for (let dy = -ri; dy <= ri; dy++) {
        for (let dx = -ri; dx <= ri; dx++) {
          const dist = Math.hypot(dx, dy);
          if (dist > w) continue;
          const prof = 1 - dist / w;
          const v = -depth * taper * prof * prof; // V-section, deepest at centre
          const i = idx(Math.round(x) + dx, Math.round(y) + dy);
          if (v < h[i]) h[i] = v;
        }
      }

      if (branchesLeft > 0 && rnd() < 0.014) {
        carve(
          x,
          y,
          d + (rnd() < 0.5 ? 1 : -1) * (0.4 + rnd() * 0.7),
          len * (0.22 + rnd() * 0.3),
          width * 0.55,
          depth * 0.72,
          branchesLeft - 1,
          onPoint
        );
      }
    }
  };

  const spine: Array<[number, number]> = [];
  const record = (x: number, y: number) => {
    if (rnd() < 0.06) spine.push([x, y]);
  };

  /* Three tiers, and the split is the point: a wall with only hairlines has no
     structure, and a wall with only big cracks has no age. Widths are in texels
     at ~316 px/m, so 3.4 texels is ~1cm — a real settlement crack — and 0.45 is
     ~1.5mm, a real hairline. */

  // A FEW major structural cracks — long, steep, branching. Settlement.
  for (let i = 0; i < 4; i++) {
    carve(rnd() * S, rnd() * S, Math.PI / 2 + (rnd() - 0.5) * 0.9, 560 + rnd() * 460, 3.0 + rnd() * 1.6, 1.0, 3, record);
  }
  // Medium fractures spreading off the structure
  for (let i = 0; i < 14; i++) {
    carve(rnd() * S, rnd() * S, rnd() * Math.PI * 2, 150 + rnd() * 240, 1.5 + rnd() * 0.9, 0.72, 2, record);
  }
  // Micro hairlines / shrinkage crazing — the ones that only exist up close
  for (let i = 0; i < 85; i++) {
    carve(rnd() * S, rnd() * S, rnd() * Math.PI * 2, 24 + rnd() * 70, 0.45 + rnd() * 0.36, 0.36, 1, record);
  }

  // Chipped plaster along the fractures. A crack undermines its own edges, so
  // flakes let go beside it — shallow, irregular, and always adjacent to a
  // crack rather than scattered at random.
  for (const [cx, cy] of spine) {
    if (rnd() > 0.34) continue;
    const ox = cx + (rnd() - 0.5) * 9;
    const oy = cy + (rnd() - 0.5) * 9;
    const r = 1.6 + rnd() * 4.4;
    const depth = 0.16 + rnd() * 0.3;
    const ri = Math.ceil(r);
    for (let dy = -ri; dy <= ri; dy++) {
      for (let dx = -ri; dx <= ri; dx++) {
        const dist = Math.hypot(dx, dy);
        if (dist > r) continue;
        // Ragged rim, not a disc
        const edge = 0.6 + 0.4 * Math.sin(Math.atan2(dy, dx) * 5 + cx);
        if (dist > r * edge) continue;
        const i = idx(Math.round(ox) + dx, Math.round(oy) + dy);
        const v = -depth * (1 - dist / r);
        if (v < h[i]) h[i] = v;
      }
    }
  }

  /* Pack: RG = tangent-space normal XY, B = fracture mask. Z is reconstructed
     in the shader, which frees the third channel for the mask — so the whole
     crack system costs ONE texture fetch, and the mask is guaranteed to agree
     with the normal because both come out of this same array. */
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(S, S);
  const H = (x: number, y: number) => h[idx(x, y)];
  const STRENGTH = 9.0;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const gx = (H(x + 1, y) - H(x - 1, y)) * STRENGTH;
      const gy = (H(x, y + 1) - H(x, y - 1)) * STRENGTH;
      const len = Math.sqrt(gx * gx + gy * gy + 1);
      const i = (y * S + x) * 4;
      img.data[i] = (-gx / len) * 127.5 + 127.5;
      img.data[i + 1] = (-gy / len) * 127.5 + 127.5;
      img.data[i + 2] = Math.min(255, -h[y * S + x] * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Detail normal — aggregate grain, tiled far finer than the scan.

   This solves the cost of SCAN_REPEAT_X = 10. Bigger tiles were necessary
   (0.3m plaster islands read as camouflage) but they dropped texel density to
   ~136 px/m against the ~240 px/m the screen wants, so the scan's own popcorn
   grain went soft. Raising the repeat to sharpen it brings the camo straight
   back — the two requirements fight over one number.

   Splitting frequency across two maps ends the fight. The scan keeps the macro
   story at 10 repeats; this carries the micro tooth at ~60, where nobody can
   see a 1.1m period because there is no shape to recognise at that scale — only
   grain. It is 256px, costs one small texture, and it is the "detail normals"
   half of the reference's "normal map from height + detail normals".

   Normals only. Tiling an ALBEDO this hard would produce a visible repeating
   pattern instantly; tiling a normal produces surface tooth, which is what a
   lime plaster's aggregate actually is — geometry, not pigment.

   Both axes wrap. At a 1.1m period a seam would be far worse than the softness
   it is here to fix, so the fBm lattices are indexed directly (they wrap) and
   the pits and the height->normal gradient wrap by modulo.
   ═══════════════════════════════════════════════════════════════════════════ */

function buildDetailNormal(): THREE.CanvasTexture {
  const S = 256;

  // Two octave bands: aggregate lumps, and the fine tooth between them.
  const lumps = fbmField(S, S, 0xa663, 4, 24, 24);
  const tooth = fbmField(S, S, 0x5c21, 3, 80, 80);
  const rnd = mulberry32(0x1d0e);

  const h = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) {
    h[i] = lumps.d[i] * 0.6 + tooth.d[i] * 0.4;
  }

  // Micro-pitting — the reference calls for it explicitly, and it is what stops
  // plaster reading as sprayed plastic. Craters, so they only ever remove.
  for (let p = 0; p < 560; p++) {
    const cx = Math.floor(rnd() * S);
    const cy = Math.floor(rnd() * S);
    const r = 1 + rnd() * 2.4;
    const depth = 0.28 + rnd() * 0.55;
    const ri = Math.ceil(r);
    for (let dy = -ri; dy <= ri; dy++) {
      for (let dx = -ri; dx <= ri; dx++) {
        const d = Math.hypot(dx, dy);
        if (d > r) continue;
        const xx = (((cx + dx) % S) + S) % S;
        const yy = (((cy + dy) % S) + S) % S;
        h[yy * S + xx] -= depth * (1 - d / r);
      }
    }
  }

  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(S, S);
  const H = (x: number, y: number) => h[((((y % S) + S) % S) * S) + (((x % S) + S) % S)];
  const STRENGTH = 2.6;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const gx = (H(x + 1, y) - H(x - 1, y)) * STRENGTH;
      const gy = (H(x, y + 1) - H(x, y - 1)) * STRENGTH;
      const len = Math.sqrt(gx * gx + gy * gy + 1);
      const i = (y * S + x) * 4;
      img.data[i] = (-gx / len) * 127.5 + 127.5;
      img.data[i + 1] = (-gy / len) * 127.5 + 127.5;
      img.data[i + 2] = (1 / len) * 127.5 + 127.5;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
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

  /* ── Verdigris / cyan oxidation near industrial bolt points ────────────
     Copper and iron fasteners corrode to verdigris (copper carbonate) —
     vivid cyan-teal patches that gravity-streak downward from the bolt.
     Each patch is anchored to a real feature: pipe brackets and vent
     window mounting hardware. This is not scatter; it is consequence.    */
  const vCanvas = document.createElement('canvas');
  vCanvas.width = W;
  vCanvas.height = H;
  const vc = vCanvas.getContext('2d')!;
  vc.fillStyle = '#000';
  vc.fillRect(0, 0, W, H);
  vc.globalCompositeOperation = 'lighter';

  // Bolt points: pipe brackets at pipe X positions, at several heights
  const boltPoints: [number, number][] = [];
  for (const px of RUNOFF_SOURCES.pipes) {
    // Each pipe has 2–3 brackets along its length
    boltPoints.push([px + 0.15, 6.8]);
    boltPoints.push([px - 0.1, 4.5]);
    boltPoints.push([px + 0.2, 2.2]);
  }
  // Vent window mounting bolts — 4 corners per window
  for (const sx of RUNOFF_SOURCES.sills) {
    boltPoints.push([sx - 1.0, 6.8]);
    boltPoints.push([sx + 1.0, 6.8]);
    boltPoints.push([sx - 1.0, 5.6]);
    boltPoints.push([sx + 1.0, 5.6]);
  }

  for (const [bx, by] of boltPoints) {
    const cx2 = toU(bx);
    const cy2 = toV(by);
    // Main oxidation bloom — irregular, gravity-biased (more below bolt)
    const patchCount = 3 + Math.floor(rnd() * 4);
    for (let p = 0; p < patchCount; p++) {
      const offX = (rnd() - 0.5) * 18;
      const offY = rnd() * 14 + p * 3; // bias downward
      const r = 4 + rnd() * 12;
      const alpha = 0.12 + rnd() * 0.28;
      const g2 = vc.createRadialGradient(cx2 + offX, cy2 + offY, 1, cx2 + offX, cy2 + offY, r);
      g2.addColorStop(0, `rgba(92, 191, 176, ${alpha})`);
      g2.addColorStop(0.6, `rgba(58, 158, 146, ${alpha * 0.5})`);
      g2.addColorStop(1, 'rgba(58, 158, 146, 0)');
      vc.fillStyle = g2;
      vc.beginPath();
      vc.arc(cx2 + offX, cy2 + offY, r, 0, Math.PI * 2);
      vc.fill();
    }
    // Gravity drip streak below each bolt
    const dripLen = 8 + rnd() * 16;
    const dg = vc.createLinearGradient(0, cy2, 0, cy2 + dripLen);
    dg.addColorStop(0, `rgba(92, 191, 176, ${0.18 + rnd() * 0.15})`);
    dg.addColorStop(1, 'rgba(58, 158, 146, 0)');
    vc.fillStyle = dg;
    vc.fillRect(cx2 - 3 + (rnd() - 0.5) * 4, cy2, 6 + rnd() * 4, dripLen);
  }

  // Composite verdigris into the base macro's blue channel (repurposed slightly)
  // and store the cyan color data for the shader
  const vData = vc.getImageData(0, 0, W, H).data;
  const base2 = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < W * H; i++) {
    const j = i * 4;
    // Encode verdigris intensity into the alpha channel for shader pickup
    // (macro map was opaque; alpha was unused)
    base2.data[j + 3] = Math.min(255, 255 - vData[j] * 0.65);
    // Also tint the red channel slightly where verdigris is strong,
    // as a secondary read for the shader
    if (vData[j] > 30) {
      base2.data[j] = Math.max(0, base2.data[j] - vData[j] * 0.15);
    }
  }
  ctx.putImageData(base2, 0, 0);

  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  return t;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Poster ghost map — the history of what was pasted here before.

   The wall has to feel older than the posters on it, and the way a real wall
   says that is with the rectangles of everything that came before: sheets that
   were pasted up, weathered, and scraped off, over and over, for decades.

   WHY A GHOST LOOKS LIGHTER, NOT DIRTIER.
   The instinct is to draw a stain. It is the other way round. A pasted sheet
   SHELTERS the wall under it — for however many years it hung there, that
   rectangle collected no soot and took no rain. Strip it and you expose a
   patch that is cleaner and paler than everything around it, faintly warmed by
   the paste that soaked in. The dirt is only at the perimeter, where paste
   squeezed out past the edge and spent the next decade collecting grime. So a
   ghost is a pale rectangle with a dirty outline, and that outline is the cue
   the eye actually reads.

   WHAT THIS MAP DELIBERATELY DOES NOT CARRY.
   1024px over 68m is ~15 px/m, so one texel is ~7cm. Tack holes and tape tabs
   are millimetres — they cannot resolve here, and the previous version drawing
   them at "0.6px radius" was not making tack holes, it was making fist-sized
   blobs. Sub-pixel storytelling belongs in decals at detail resolution. What a
   macro layer CAN do is the low-frequency part — a soft tonal rectangle and a
   broken perimeter — and a ghost is genuinely low-frequency, so nothing is
   lost by keeping only that.

   R = sheltered-patch coverage · G = paste squeeze-out perimeter · B = unused
   Alpha is not used as a mask: see the shader note in applyMacroLayer.
   ═══════════════════════════════════════════════════════════════════════════ */

function buildGhostMap(): THREE.CanvasTexture {
  const W = 1024;
  const H = 256;

  const rnd = mulberry32(0xd3ad);

  const toU = (worldX: number) => ((worldX + WALL.width / 2) / WALL.width) * W;
  const toV = (worldY: number) => ((WALL.centerY + WALL.height / 2 - worldY) / WALL.height) * H;

  /* Two greyscale accumulation canvases, combined into R and G at the end.
     Drawing them separately is the only way to keep the channels independent —
     canvas composites RGB together, so a single canvas cannot hold two masks
     that overlap. The previous version claimed a channel packing in its header
     and then never did one; its final "pack" step was getImageData immediately
     followed by putImageData, which is a no-op. */
  const mk = () => {
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const x = cv.getContext('2d')!;
    x.fillStyle = '#000';
    x.fillRect(0, 0, W, H);
    return { cv, x };
  };
  const body = mk(); // R — the sheltered patch
  const edge = mk(); // G — paste squeeze-out, grime-collecting

  /* Sites where sheets have been going up for decades. Kept off the pipes and
     at reachable height — nobody pastes a flyer at 8m or over a downpipe. */
  const ghostWorldPositions = [
    { x: -28, y: 2.6, w: 1.4, h: 2.0 },
    { x: -22, y: 1.8, w: 2.0, h: 1.4 },
    { x: -17, y: 3.0, w: 1.2, h: 1.7 },
    { x: -10, y: 2.2, w: 1.8, h: 2.4 },
    { x: -5, y: 1.6, w: 1.5, h: 1.0 },
    { x: 1, y: 3.2, w: 2.2, h: 1.5 },
    { x: 6, y: 2.0, w: 1.3, h: 1.9 },
    { x: 12, y: 2.8, w: 1.6, h: 2.2 },
    { x: 17, y: 1.4, w: 2.0, h: 1.3 },
    { x: 24, y: 2.4, w: 1.4, h: 1.8 },
  ];

  for (const gw of ghostWorldPositions) {
    const x0 = toU(gw.x);
    const y0 = toV(gw.y + gw.h / 2);
    const gwPx = (gw.w / WALL.width) * W;
    const ghPx = (gw.h / WALL.height) * H;

    // Hand-placed sheets are never square, and never square in the same way
    const tilt = (rnd() - 0.5) * 0.05;
    const cx = x0 + gwPx / 2;
    const cy = y0 + ghPx / 2;

    body.x.save();
    body.x.translate(cx, cy);
    body.x.rotate(tilt);
    body.x.fillStyle = `rgba(255,255,255,${0.5 + rnd() * 0.35})`;
    body.x.fillRect(-gwPx / 2, -ghPx / 2, gwPx, ghPx);
    body.x.restore();

    edge.x.save();
    edge.x.translate(cx, cy);
    edge.x.rotate(tilt);
    edge.x.strokeStyle = `rgba(255,255,255,${0.55 + rnd() * 0.4})`;
    edge.x.lineWidth = 1.2 + rnd() * 1.4;
    edge.x.strokeRect(-gwPx / 2, -ghPx / 2, gwPx, ghPx);
    edge.x.restore();
  }

  /* ── Erosion ────────────────────────────────────────────────────────────
     This is the whole point, and it is what the old version was missing.

     A crisp rectangle on a wall reads as a UI panel glued to the brick, no
     matter how low its opacity — the eye finds the straight edge instantly and
     the illusion dies. But the answer is NOT to blur it. A blurred rectangle
     is still obviously a rectangle, just a soft one, and soft-cloud edges were
     the exact note that started this rework.

     Real ghosts erode. The paste bond fails unevenly, weather eats it in
     patches, someone scraped part of it off years ago and gave up on the rest.
     So the rectangle survives in fragments: intact along one stretch, gone
     entirely along another. Multiplying coverage by a broken fBm field does
     that — the edge stays straight WHERE IT SURVIVES, which is what says
     "a person put a straight-edged thing here" while the gaps say "and time
     has been working on it since". Straight but interrupted, not soft.        */
  /* Frequency is everything here. At baseX=6 over 4 octaves the finest lattice
     was 48 cells across 1024px — ~21px, which is the entire width of a ghost.
     The field could therefore only ever say "this whole ghost lives" or "this
     whole ghost dies", which is not erosion, it is a coin toss. The break-up
     has to happen WITHIN a ghost to read as decay, so the lattice has to be
     several times finer than the thing it is eating. */
  const erosion = fbmField(512, 128, 0x6a57, 4, 26, 9);
  const grain = fbmField(512, 128, 0x2b19, 5, 60, 20);

  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const octx = out.getContext('2d')!;
  const img = octx.createImageData(W, H);

  const bd = body.x.getImageData(0, 0, W, H).data;
  const ed = edge.x.getImageData(0, 0, W, H).data;

  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const i = (y * W + x) * 4;

      const e = sampleField(erosion, u, v);
      const g = sampleField(grain, u, v);

      // Survival field. Widened from smoothstep(0.34, 0.62) — that threshold
      // ate most ghosts outright and left the survivors at full strength, so
      // the wall had three hard rectangles and seven blanks. A gentler ramp
      // keeps every ghost partially present, which is what "faded" means.
      const survives = smoothstep(0.18, 0.78, e);
      // Finer break-up so surviving stretches are not uniform either.
      const mottle = 0.55 + g * 0.45;

      img.data[i] = bd[i] * survives * mottle;
      img.data[i + 1] = ed[i] * survives * (0.5 + g * 0.5);
      img.data[i + 2] = 0;
      img.data[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);

  const t = new THREE.CanvasTexture(out);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  return t;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Macro-layer shader injection.

   MeshStandardMaterial has no detail/macro slot, so patch it. Three extra
   fetches from tiny (1024x256) textures — near-perfect cache hit rate, far
   cheaper than the memory a non-tiling 4K texture set would cost.

   Now also carries:
   • Poster ghost history (paste tint, outlines, tape marks)
   • Verdigris oxidation (cyan patches from macro alpha channel)
   ═══════════════════════════════════════════════════════════════════════════ */

export function applyMacroLayer(
  material: THREE.MeshStandardMaterial,
  macroMap: THREE.Texture,
  ghostMap: THREE.Texture,
  cavityMap: THREE.Texture,
  detailNormal: THREE.Texture,
  crackMap: THREE.Texture
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMacroMap = { value: macroMap };
    shader.uniforms.uGhostMap = { value: ghostMap };
    // Same image as roughnessMap/aoMap — cavity rides in its unused .b
    shader.uniforms.uCavityMap = { value: cavityMap };
    shader.uniforms.uDetailNormal = { value: detailNormal };
    shader.uniforms.uCrackMap = { value: crackMap };
    shader.uniforms.uMapRepeat = { value: new THREE.Vector2(SCAN_REPEAT_X, SCAN_REPEAT_Y) };
    // ~60 repeats across 68m: a 1.1m period, below the scale at which the eye
    // can recognise a repeated shape — it reads as tooth, not as pattern.
    shader.uniforms.uDetailRepeat = { value: new THREE.Vector2(6.0, 4.0) };
    shader.uniforms.uDetailStrength = { value: 0.55 };
    // Coprime with uMapRepeat — see buildCrackMap. The pair never re-aligns.
    shader.uniforms.uCrackRepeat = { value: new THREE.Vector2(CRACK_REPEAT_X, CRACK_REPEAT_Y) };
    shader.uniforms.uCrackNormalStrength = { value: 0.9 };

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform sampler2D uMacroMap;
         uniform sampler2D uGhostMap;
         uniform sampler2D uCavityMap;
         uniform sampler2D uDetailNormal;
         uniform sampler2D uCrackMap;
         uniform vec2 uMapRepeat;
         uniform vec2 uDetailRepeat;
         uniform float uDetailStrength;
         uniform vec2 uCrackRepeat;
         uniform float uCrackNormalStrength;`
      )
      /* Detail normal. Replaces the stock chunk rather than appending to it,
         because two normal maps have to be combined in TANGENT space, BEFORE
         the TBN transform — perturbing the view-space normal afterwards is a
         different (and wrong) operation. Safe to hard-code the tangent-space
         branch: this material always has a normalMap, and the wall is a plane
         with no tangent attribute, so getTangentFrame is always the path. */
      .replace(
        '#include <normal_fragment_maps>',
        `vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
         mapN.xy *= normalScale;
         vec3 detN = texture2D( uDetailNormal, vNormalMapUv * uDetailRepeat ).xyz * 2.0 - 1.0;
         mapN.xy += detN.xy * uDetailStrength;
         // Fracture relief. Same field the albedo and roughness read below, so
         // a crack recesses and darkens at identical texels — the alternative
         // (an independent crack normal) is light raking over relief the colour
         // does not acknowledge, which the eye catches immediately.
         vec2 crackN = texture2D( uCrackMap, vNormalMapUv / uMapRepeat * uCrackRepeat ).rg * 2.0 - 1.0;
         mapN.xy += crackN * uCrackNormalStrength;
         #ifdef USE_TANGENT
           mat3 tbnD = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
         #else
           mat3 tbnD = getTangentFrame( - vViewPosition, normal, vNormalMapUv );
         #endif
         normal = normalize( tbnD * mapN );`
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
         // vMapUv is uv * repeat, un-wrapped — divide it back out to recover
         // the 0..1 wall-space UV the macro layer lives in.
         vec2 wallUV = vMapUv / uMapRepeat;
         vec4 macroS = texture2D( uMacroMap, wallUV );

         // Tonal drift. Was 0.46 + r*1.05 — a 0.46..1.51 multiplier, a ±50%
         // brightness swing that turned the wall into dark camouflage. The
         // macro layer's job is to break the tile period, not to repaint the
         // surface; the scan already carries the light-and-dark. Centred on 1.0
         // so it modulates rather than darkens.
         diffuseColor.rgb *= 0.88 + macroS.r * 0.24;

         // Soot. Was a mix toward vec3(0.22,0.24,0.29) at g*1.35 — crushing
         // whole stretches to 22% brightness, and toward a blue-grey at that,
         // which is where the wall's cold cast was really coming from. Under
         // overcast, grime on a pale wall is a soft neutral veil, not a
         // blackout, and low contrast is the explicit brief.
         diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3(0.70, 0.70, 0.71), macroS.g * 0.55 );

         // ── Iron oxidation bleeding from bolt points ──
         // Was vivid cyan verdigris at a 0.65 mix, which put the most saturated
         // colour in the scene on the wall itself — the one surface the palette
         // requires stay muted, with colour reserved for graffiti and posters.
         // It was also the wrong chemistry: verdigris is copper, and every
         // fastener here is iron. Iron gives oxidised brown, which the palette
         // does list, and which reads as consequence rather than decoration.
         float oxidation = 1.0 - macroS.a;
         diffuseColor.rgb = mix( diffuseColor.rgb, vec3(0.34, 0.18, 0.11), oxidation * 0.32 );

         // ── Poster ghosts ──
         // The mask here used to be max(ghost.rgb). That read the ghost canvas'
         // COLOUR, not its coverage: paste drawn at rgba(200,188,160, 0.12) has
         // an alpha of 0.12 but a max channel of 0.78, so a tint meant to sit
         // at 12% was applied at 78% and then multiplied by 1.8. Every ghost
         // was a hard-edged rectangle at ~6x its intended strength. The map now
         // carries coverage directly in R and G, so the read is honest.
         vec3 ghost = texture2D( uGhostMap, wallUV ).rgb;
         // Sheltered patch: paler and cleaner than the wall around it, because
         // it spent years under a sheet collecting no soot. Faintly warm from
         // paste that soaked in and never came out.
         diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3(1.13, 1.09, 1.00), ghost.r * 0.5 );
         // Squeeze-out perimeter: the one part of a ghost that IS dirty.
         diffuseColor.rgb *= 1.0 - ghost.g * 0.16;

         // ── Cavity ──
         // Baked from the scan's own displacement: high wherever a texel sits
         // below its neighbourhood — mortar joints, the step down off a broken
         // plaster edge, every pit. Dirt is not sprinkled on a wall, it is
         // washed downward and left wherever the surface is too low to drain,
         // so cavity IS the dirt mask, already correlated to the geometry.
         //
         // This is where the wall's depth comes from now. The albedo has been
         // deliberately flattened at bake time to kill the camouflage read, so
         // depth has to be carried by shading rather than by pigment — which is
         // also how the real surface works. Slightly cool, because what settles
         // in a recess is grey dust, not brick.
         // Signed around the cavity map's own mean (~0.10), so recesses darken
         // AND proud limewash lifts. This matters: a plain "darken the cavity"
         // mix only ever subtracts, and measured it dragged the wall's mean from
         // 144 to 108 — quietly undoing the approved exposure in the name of
         // depth. Balancing it about the mean buys the same depth for free,
         // and buys MORE of it, because the proud surfaces now separate upward
         // from the recesses instead of everything sliding down together.
         // Signed around the map's own mean (~0.10) rather than a plain darken:
         // a one-way "multiply the cavity down" only ever subtracts, and dragged
         // the wall's mean from 144 to 110 — buying depth by spending exposure.
         // Balancing about the mean gets MORE depth for less, because the proud
         // limewash separates upward from the recesses instead of the whole
         // surface sliding down together.
         float cavity = texture2D( uCavityMap, vMapUv ).b;
         float cavSigned = ( cavity - 0.10 ) * 1.30;
         diffuseColor.rgb *= clamp( 1.0 - cavSigned, 0.42, 1.18 );

         // ── Fractures ──
         // .b of the same field that supplied the normal above. Cracks are dark
         // because they are self-shadowed and full of dust — NOT because they
         // are drawn in black. A black line reads as ink on a surface; a dark
         // GREY recess reads as a hole in one. Kept restrained on purpose: the
         // brief wants cracks to vanish at distance and only surface up close,
         // and the relief is already carrying most of the read.
         float crackMask = texture2D( uCrackMap, vMapUv / uMapRepeat * uCrackRepeat ).b;
         // Desaturate before darkening. Simply multiplying warm ivory down gives
         // a TAN line — which reads as a stain or a root, not as a fracture. A
         // crack is dark because it is self-shadowed and packed with dust, and
         // both of those are achromatic: it should go dark GREY, never black
         // (a black line is ink ON a surface; a grey recess is a hole IN one).
         float crackLum = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
         vec3 crackCol = mix( diffuseColor.rgb, vec3( crackLum ), 0.55 ) * 0.42;
         diffuseColor.rgb = mix( diffuseColor.rgb, crackCol, crackMask * 0.85 );`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         vec2 wallUVr = vMapUv / uMapRepeat;
         vec4 macroR = texture2D( uMacroMap, wallUVr );
         roughnessFactor = clamp( roughnessFactor + macroR.g * 0.10 - macroR.b * 0.30, 0.05, 1.0 );
         // Dried paste seals the aggregate — the one place on this wall with a
         // slight sheen, and the reference calls for exactly that.
         vec3 ghostR = texture2D( uGhostMap, wallUVr ).rgb;
         roughnessFactor = clamp( roughnessFactor - ghostR.r * 0.14, 0.05, 1.0 );
         // Rust is a flaky oxide bloom, not a mineral crust — it is ROUGHER
         // than the plaster it stains, not glossier. The old sign here was
         // backwards and gave the patches a wet sheen under raking light.
         float oxidationR = 1.0 - macroR.a;
         roughnessFactor = clamp( roughnessFactor + oxidationR * 0.12, 0.05, 1.0 );

         // Cavity is packed dust and grit — the roughest thing on the wall, and
         // the reference's roughness table agrees (lime plaster very rough,
         // paint smoother). Roughening the recesses while the proud limewash
         // stays comparatively smooth is a second, independent depth cue: the
         // two read differently under the sky even where their albedo matches.
         float cavityR = texture2D( uCavityMap, vMapUv ).b;
         roughnessFactor = clamp( roughnessFactor + cavityR * 0.30, 0.05, 1.0 );

         // Fractured plaster exposes raw broken mineral — the roughest thing on
         // the wall. Third channel driven by the one crack field, so a fracture
         // recesses, darkens AND roughens at exactly the same texels.
         float crackR = texture2D( uCrackMap, vMapUv / uMapRepeat * uCrackRepeat ).b;
         roughnessFactor = clamp( roughnessFactor + crackR * 0.26, 0.05, 1.0 );`
      );
  };
  // Distinct key so this variant doesn't collide with stock standard materials
  material.customProgramCacheKey = () => 'weathered-wall-macro-v5-cracks';
}

/* ═══════════════════════════════════════════════════════════════════════════
   Alley environment map — OVERCAST DAYLIGHT.

   Two jobs, and the second is the important one.

   1. Metals need something to reflect. Without an environment every metal in
      the scene (manholes, pipes, puddles) mirrors a void and resolves to a
      flat dark blob. Metal without an environment is not metal.

   2. THIS IS THE KEY LIGHT. Under overcast there is no sun — the whole sky
      dome is the source. So the lighting lives here, not in a directionalLight,
      and scene.environmentIntensity is the master exposure dial.

   The obvious trap: "soft even light" sounds like "flat grey everywhere", and
   flat light would erase the plaster grain, chips and trowel marks the whole
   material is built to show. Real overcast does not do that. A CIE overcast
   sky is roughly 3x brighter at the zenith than at the horizon, and the ground
   is far darker than either. That top-to-bottom ramp is soft directional light:
   it shades every upward-facing chip differently from every downward-facing
   one, which is exactly what makes an overcast photograph of a wall read as
   tactile rather than washed out. The gradient below is that ramp, and it is
   why the scene can lose its torch and still show its surface.

   Neutral throughout. No sun disc, no blue sky, no golden bounce — a sun patch
   here is what the reference calls the "HDRI sunset look", and metals would
   mirror it straight back as the dramatic highlight the brief rules out.
   ═══════════════════════════════════════════════════════════════════════════ */

export function buildAlleyEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  /* Bright even cloud deck.

     A cloud deck is not a dim light — it is a huge one. An overcast sky still
     runs thousands of lux, which is why an overcast photograph is PALE rather
     than murky: the light is soft AND strong at the same time, and it is easy
     to build only the "soft" half and end up with a dull scene that is
     technically flat but nothing like the reference.

     The ground half matters as much as the sky half here. A vertical wall sees
     roughly half sky and half ground, so the ground's value sets the wall's
     floor. Too dark a ground and the wall's crevices crush toward black — which
     cannot happen under a real dome, because there is no direction light is
     failing to arrive from. The nadir is lifted well off black for that reason.  */
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0.0, '#EDEFEF'); // zenith — brightest part of the cloud deck
  g.addColorStop(0.18, '#E4E6E7'); // upper dome
  g.addColorStop(0.35, '#D6D8D9'); // lower dome, thickening haze
  g.addColorStop(0.47, '#C2C4C5'); // horizon — dimmest sky, still bright
  g.addColorStop(0.53, '#A8A9A9'); // opposite building faces, lit only by sky
  g.addColorStop(0.7, '#8B877F'); // ground bounce — pavement, faint dust warmth
  g.addColorStop(1.0, '#63605A'); // nadir — under-shadow, nowhere near black
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromEquirectangular(tex);
  tex.dispose();
  pmrem.dispose();
  return rt.texture;
}

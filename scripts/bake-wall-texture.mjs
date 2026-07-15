/**
 * Bakes an ambientCG PBR scan down to the wall's web budget.
 *
 *   node scripts/bake-wall-texture.mjs <path-to-unzipped-scan-folder>
 *
 * Run from the project root — `sharp` resolves out of ./node_modules (it ships
 * with Next). Writes into public/textures/wall/.
 *
 * Current source: PaintedPlaster016 (CC0), https://ambientcg.com/view?id=PaintedPlaster016
 * Download the 2K-JPG zip, unzip it, and point this at the folder.
 *
 * Why each step exists:
 *  1. 1024px  — the scan covers ~2m, so 1024 is ~512 px/m. Plenty at a 4m
 *               viewing distance, and 2K costs 4x the bytes for nothing.
 *  2. Packing — three samples aoMap.r and roughnessMap.g, so AO and roughness
 *               live in one image. Two maps, one request, half the VRAM.
 *  3. Grading — the scan is warm cream over ochre masonry; the alley is cool
 *               grey concrete and dirty white with warmth only as an accent.
 *               Doing it at bake time costs nothing at runtime.
 *
 * Raw 2K set is ~19.4MB. Target is under ~900KB total.
 */
import sharp from 'sharp';
import path from 'path';
import { mkdir, readdir } from 'fs/promises';

/* ── Grading knobs ──────────────────────────────────────────────────────────
   DO NOT REINTRODUCE sharp's .tint() HERE.

   This bake used to end with .tint({r:243,g:246,b:252}) to push the wall cool.
   That is not what tint does. sharp works in LAB and REPLACES the image's
   chroma with the tint's — it does not bias it. So it forced brick red, pale
   olive and warm ivory to one identical faint blue, and the scan came out
   effectively monochrome. Combined with saturation 0.42 it deleted the exact
   three things this asset was chosen for.

   The scan is limewash failing off brick: dirty white on top, pale olive
   plaster under it, muted reddish-brown brick where both have gone. That IS
   the target palette. It needs almost nothing done to it.

   0.88 keeps a light mute on it — the wall stays the muted backdrop and the
   posters stay the only saturated thing in frame — without flattening the
   substrate. If the wall ever reads too warm again, fix the LIGHT, not this.
   Grading the albedo to compensate for a warm rig is what got us here. */
const SATURATION = 0.88;
const BRIGHTNESS = 1.02;

/* Tonal compression, and this is a real art call rather than a tweak.

   The scan is roughly half plaster, half exposed brick, with the brick much
   darker. Rendered straight, that 50/50 at high contrast reads as CAMOUFLAGE —
   a busy dark-and-light mottle, not a wall. The reference is the opposite
   balance: broad pale plaster with brick showing through in a few places,
   "brick mostly hidden", everything low contrast and muted.

   We cannot change how much brick the scan contains. We CAN change how far the
   brick sits from the plaster in value, and that is what actually drives the
   camo read. Compressing the range and lifting the floor lets the brick sit
   under the plaster as a warm undertone rather than punching through as a dark
   blotch — "mostly hidden" achieved tonally instead of geometrically.

   linear(a, b) is out = in*a + b. Below: white 255 -> 237, black 25 -> 48.
   Range 225 -> 189, floor lifted 23 points. The previous 1.08/-7 did the exact
   opposite — it stretched the range and crushed the floor, maximising the camo.  */
const CONTRAST = 0.82;
const CONTRAST_OFFSET = 28;
const SIZE = 1024;

const srcDir = process.argv[2];
if (!srcDir) {
  console.error('usage: node scripts/bake-wall-texture.mjs <path-to-unzipped-scan-folder>');
  process.exit(1);
}

const OUT = path.join(process.cwd(), 'public', 'textures', 'wall');
await mkdir(OUT, { recursive: true });

// ambientCG names files <AssetId>_<Res>-<Fmt>_<MapName>.jpg — find them by suffix
// so this works for any asset id without editing the script.
const files = await readdir(srcDir);
const find = (suffix) => {
  const hit = files.find((f) => f.toLowerCase().endsWith(suffix.toLowerCase()));
  if (!hit) throw new Error(`no file ending in "${suffix}" found in ${srcDir}`);
  return path.join(srcDir, hit);
};

const colour = await sharp(find('_Color.jpg'))
  .resize(SIZE, SIZE, { kernel: 'lanczos3' })
  .modulate({ saturation: SATURATION, brightness: BRIGHTNESS })
  .linear(CONTRAST, CONTRAST_OFFSET)
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(path.join(OUT, 'plaster_color.jpg'));

// Highest quality of the three: JPEG artifacts in a normal map read as dents,
// and this map is carrying every chip edge, crack and popcorn grain.
const normal = await sharp(find('_NormalGL.jpg'))
  .resize(SIZE, SIZE, { kernel: 'lanczos3' })
  .jpeg({ quality: 90, mozjpeg: true })
  .toFile(path.join(OUT, 'plaster_normal.jpg'));

const ao = await sharp(find('_AmbientOcclusion.jpg'))
  .resize(SIZE, SIZE, { kernel: 'lanczos3' }).greyscale().raw().toBuffer();
const rough = await sharp(find('_Roughness.jpg'))
  .resize(SIZE, SIZE, { kernel: 'lanczos3' }).greyscale().raw().toBuffer();

/* ── Cavity, into the third channel ────────────────────────────────────────
   The scan ships a Displacement map that we were not using at all, and it is
   the most informative map in the set: it holds the STEP from limewash down to
   brick — the plaster's actual thickness, its ragged broken edges, and every
   recessed mortar joint. That step is what gives the reference wall its depth.

   We still do not want a displacementMap (30cm of it over 42cm quads is what
   produced the lumpy-terrain disaster; real relief here is ~1-2cm and subtends
   0.3° at 4m, so it belongs in shading, not geometry). But height is exactly
   what you need to derive CAVITY:

       cavity = blur(height) - height

   which is positive wherever a texel sits lower than its neighbourhood. That
   is a direct map of "where dirt collects, where light does not reach, where
   the surface is broken" — and it costs nothing, because AO is in R, roughness
   is in G, and B was being written as a constant 0.

   Blur radius sets which scale of recess counts. ~18px at 512px/m is ~3.5cm:
   fine enough for mortar joints and chip edges, coarse enough to ignore grain. */
const CAVITY_BLUR = 18;
const CAVITY_GAIN = 3.4;

const dispSharp = await sharp(find('_Displacement.jpg'))
  .resize(SIZE, SIZE, { kernel: 'lanczos3' }).greyscale().raw().toBuffer();
const dispBlur = await sharp(find('_Displacement.jpg'))
  .resize(SIZE, SIZE, { kernel: 'lanczos3' }).greyscale().blur(CAVITY_BLUR).raw().toBuffer();

const packed = Buffer.alloc(SIZE * SIZE * 3);
for (let i = 0; i < SIZE * SIZE; i++) {
  packed[i * 3] = ao[i]; // R -> aoMap.r
  packed[i * 3 + 1] = rough[i]; // G -> roughnessMap.g
  // Recess only: negative values are proud edges, which we do not want to dirty.
  const cav = (dispBlur[i] - dispSharp[i]) * CAVITY_GAIN;
  packed[i * 3 + 2] = Math.max(0, Math.min(255, cav)); // B -> cavity
}
const aoRough = await sharp(packed, { raw: { width: SIZE, height: SIZE, channels: 3 } })
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(path.join(OUT, 'plaster_ao_rough.jpg'));

const kb = (n) => (n / 1024).toFixed(0) + 'KB';
const total = colour.size + normal.size + aoRough.size;
console.log('plaster_color.jpg     ', kb(colour.size));
console.log('plaster_normal.jpg    ', kb(normal.size));
console.log('plaster_ao_rough.jpg  ', kb(aoRough.size), '(AO in R, roughness in G)');
console.log('TOTAL                 ', kb(total));
if (total > 900 * 1024) console.warn('WARNING: over the ~900KB budget — drop quality or size.');

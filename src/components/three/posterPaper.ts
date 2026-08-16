'use client';

import * as THREE from 'three';
import { mulberry32 } from './wallMaterial';

/* ═══════════════════════════════════════════════════════════════════════════
   Wheat-paste paper maps.

   Generated once and shared by every poster; per-instance variety comes from
   cloned textures with flipped/offset UVs, which share the same GPU image and
   therefore cost no extra VRAM.

   What a pasted poster actually is, and what the old flat plane had none of:
   paste soaks the sheet, the fibres swell, and it dries in ripples and trapped
   bubbles. That ripple catching a raking light is THE defining cue — a flat
   matte quad and a rippled sheet are night and day under a moving flashlight.
   Edges tear, corners lift and dogear, and everything fades from the top down
   because that is where the light hits.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface PaperMaps {
  /** Tangent-space normal carrying wrinkles, bubbles and edge cockle */
  wrinkleNormal: THREE.CanvasTexture;
  /** Edge silhouette in the GREEN channel (three's alphaMap reads .g) */
  tearMasks: THREE.CanvasTexture[];
}

let cached: PaperMaps | null = null;

/* ── Height → normal (local copy; paper wants clamped edges, not wrapped) ── */
function heightToNormal(src: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const hd = src.getContext('2d')!.getImageData(0, 0, w, h).data;
  const at = (x: number, y: number) => {
    const xi = Math.min(Math.max(x, 0), w - 1);
    const yi = Math.min(Math.max(y, 0), h - 1);
    return hd[(yi * w + xi) * 4] / 255;
  };
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const oc = out.getContext('2d')!;
  const img = oc.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const gy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.sqrt(gx * gx + gy * gy + 1);
      const i = (y * w + x) * 4;
      img.data[i] = (-gx / len) * 0.5 * 255 + 127.5;
      img.data[i + 1] = (-gy / len) * 0.5 * 255 + 127.5;
      img.data[i + 2] = (1 / len) * 0.5 * 255 + 127.5;
      img.data[i + 3] = 255;
    }
  }
  oc.putImageData(img, 0, 0);
  return out;
}

export function buildPaperMaps(): PaperMaps {
  if (cached) return cached;

  const S = 512;
  const rnd = mulberry32(0x9a71);

  /* ── 1. Wrinkle height ───────────────────────────────────────────────── */
  const hC = document.createElement('canvas');
  hC.width = S;
  hC.height = S;
  const hx = hC.getContext('2d')!;
  hx.fillStyle = '#808080';
  hx.fillRect(0, 0, S, S);

  // Long cockle ridges: paste is applied with a brush in strokes, and the sheet
  // buckles perpendicular to them. Hence roughly parallel, wandering ridges —
  // not isotropic noise.
  for (let i = 0; i < 46; i++) {
    const x0 = rnd() * S;
    const amp = 8 + rnd() * 30;
    const bright = rnd() > 0.5;
    hx.strokeStyle = bright ? `rgba(215,215,215,${0.24 + rnd() * 0.3})` : `rgba(38,38,38,${0.24 + rnd() * 0.3})`;
    hx.lineWidth = 3 + rnd() * 18;
    hx.lineCap = 'round';
    hx.beginPath();
    let x = x0;
    hx.moveTo(x, -10);
    for (let y = -10; y < S + 10; y += 14) {
      x += (rnd() - 0.5) * amp * 0.5;
      hx.lineTo(x, y);
    }
    hx.stroke();
  }

  // Trapped air bubbles — paste never goes down perfectly
  for (let i = 0; i < 52; i++) {
    const bx = 40 + rnd() * (S - 80);
    const by = 40 + rnd() * (S - 80);
    const br = 6 + rnd() * 34;
    const g = hx.createRadialGradient(bx, by, 1, bx, by, br);
    g.addColorStop(0, 'rgba(225,225,225,0.72)');
    g.addColorStop(0.66, 'rgba(155,155,155,0.3)');
    g.addColorStop(1, 'rgba(128,128,128,0)');
    hx.fillStyle = g;
    hx.beginPath();
    hx.arc(bx, by, br, 0, Math.PI * 2);
    hx.fill();
  }

  // Edge cockle: paper swells most where paste pools at the border
  const eg = hx.createLinearGradient(0, 0, 0, S);
  eg.addColorStop(0, 'rgba(196,196,196,0.6)');
  eg.addColorStop(0.1, 'rgba(128,128,128,0)');
  eg.addColorStop(0.9, 'rgba(128,128,128,0)');
  eg.addColorStop(1, 'rgba(196,196,196,0.6)');
  hx.fillStyle = eg;
  hx.fillRect(0, 0, S, S);

  // Directional paper fibre — cheap paper is milled, so its grain runs one way.
  // Visible fibre is the difference between paper and a printed plastic sheet.
  hx.lineCap = 'butt';
  for (let i = 0; i < 900; i++) {
    const fy = rnd() * S;
    const fx = rnd() * S;
    const fl = 8 + rnd() * 46;
    hx.strokeStyle = rnd() > 0.5 ? `rgba(200,200,200,${rnd() * 0.3})` : `rgba(58,58,58,${rnd() * 0.3})`;
    hx.lineWidth = 0.7 + rnd() * 0.9;
    hx.beginPath();
    hx.moveTo(fx, fy);
    hx.lineTo(fx + fl, fy + (rnd() - 0.5) * 2.5);
    hx.stroke();
  }

  // Paper fibre — the micro tooth that stops it reading as plastic film
  const hd = hx.getImageData(0, 0, S, S);
  for (let i = 0; i < hd.data.length; i += 4) {
    const n = (rnd() - 0.5) * 26;
    hd.data[i] += n;
    hd.data[i + 1] += n;
    hd.data[i + 2] += n;
  }
  hx.putImageData(hd, 0, 0);

  const wrinkleNormal = new THREE.CanvasTexture(heightToNormal(hC, 3.4));
  wrinkleNormal.wrapS = wrinkleNormal.wrapT = THREE.ClampToEdgeWrapping;
  wrinkleNormal.anisotropy = 8;

  /* ── 2. Edge masks ───────────────────────────────────────────────────────
     A hand-trimmed sheet, not a shredded one.

     This used to destroy 8–13% of every poster and it did it with CIRCLES: 22
     `arc()` bites of up to 26px radius walked around the border, which at this
     resolution is a 5%-of-the-sheet scallop each. Rendered, that is not a torn
     edge — it is a doily. On top of that went a polygonal corner bite of up to
     120px radius (nearly a quarter of the sheet), 26 pinholes and 12 slits
     punched clean through the artwork, so the wall showed through the print.

     None of it survived contact with the real posters. These are current event
     designs with the club's logo and legible titles — a sheet that has been
     chewed for twenty years is the wrong story for artwork that went up this
     term, and the holes were landing on type.

     What is left is the one cue actually worth having: the edge is not a
     ruled line. A shallow random walk, roughly a centimetre of wander at wall
     scale, so the silhouette reads as paper cut by hand and pasted rather than
     as a texture-mapped quad. Nothing is punched through the face, no corner
     is missing, and no shape here is a recognisable circle. ~99% of every
     sheet survives.

     Green channel, because three's alphaMap samples .g                        */
  const tearMasks: THREE.CanvasTexture[] = [];
  for (let v = 0; v < 4; v++) {
    /* Drawn on a scratch canvas first, then composited through a blur onto the
       real one. The blur is the point — see FEATHER below. */
    const tmp = document.createElement('canvas');
    tmp.width = S;
    tmp.height = S;
    const tx = tmp.getContext('2d')!;
    tx.fillStyle = '#000';
    tx.fillRect(0, 0, S, S);

    /* The walk starts on the sheet's true corners; all inset comes from the
       one-sided tear below, so nothing shrinks the poster uniformly. */
    const a = 0;
    const b = S;
    /** Fibre teeth present along the whole edge, in px of 512 (~3cm at wall). */
    const TOOTH = 4;

    /* ── A TORN edge, not a wavy one ────────────────────────────────────────
       The previous version produced smooth curves, and three things caused it:

         · the walk was DAMPED (`prev * 0.55 + …`), which is a low-pass filter.
           Filtering a random walk is exactly how you get gentle waves, and
           gentle waves are what a rounded CSS blob looks like.
         · the four corners were literal `quadraticCurveTo` arcs, R = 14–26px.
         · a 2.8px blur on top rounded off whatever angularity was left.

       Torn paper is the opposite of filtered. It is fibrous: high-frequency,
       angular, with the amplitude varying along the edge so some stretches are
       nearly clean and others are chewed. So the offset here is the sum of two
       octaves and is NOT damped —

         wander  a slow value-noise, the overall shape of the tear
         tooth   per-step white noise, undamped, the fibre teeth
         envelope a slower noise again that scales BOTH, so the edge is torn in
                  patches rather than uniformly all the way round

       and the edge is biased inward so tearing erodes the sheet rather than
       growing it past its own rectangle. */

    /** Smooth 1-D value noise in [0,1), from `n` random anchors. */
    const noise1 = (n: number) => {
      const anchors = Array.from({ length: n + 1 }, () => rnd());
      return (t: number) => {
        const x = Math.min(0.9999, Math.max(0, t)) * n;
        const i = Math.floor(x);
        const f = x - i;
        const s = f * f * (3 - 2 * f);
        return anchors[i] * (1 - s) + anchors[i + 1] * s;
      };
    };

    const pts: [number, number][] = [];
    const walk = (fromX: number, fromY: number, toX: number, toY: number, amp: number) => {
      /* THE OFFSET IS ONE-SIDED — always inward, never outward.

         This is the correction that finally made the tear visible. The previous
         version offset the edge by a SIGNED amount around the rectangle, and
         that is wrong twice over. It swings outward as often as inward, so the
         two cancel and the sheet's area barely moves — measured, raising the
         amplitude nearly 4x changed survival only 99.7% → 99.4%. And the
         outward swings cross the neighbouring edges, so the polygon
         self-intersects and canvas's nonzero fill rule welds the notches shut.
         The result was a sheet that was mathematically "torn" and visually a
         clean rectangle, which is exactly what shipped.

         Paper does not grow when it tears. `d >= 0` always.

         The shape is a BITE plus a TOOTH, not one noise:

           bite   pow(noise, 3) — near zero along most of the run, with one or
                  two places per edge where it approaches 1. That is what makes
                  a chunk missing HERE and an almost-straight edge THERE, which
                  is what torn paper actually looks like. A single mid-range
                  noise just insets the whole edge evenly, and an evenly inset
                  edge reads as a smaller clean rectangle — measured that too:
                  92.3% survived and it still looked untorn.
           tooth  a few px of fibre everywhere, so no run is ever a ruled line. */
      const steps = 170;
      const bite = noise1(5);
      const fine = noise1(40);
      const dx = toX - fromX;
      const dy = toY - fromY;
      const len = Math.hypot(dx, dy) || 1;
      // Inward normal, given the corner-to-corner walk order below.
      const ux = -dy / len;
      const uy = dx / len;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const B = Math.pow(bite(t), 3);
        const tooth = TOOTH * (0.25 + 0.75 * fine(t)) + TOOTH * 0.5 * rnd();
        const d = 1 + amp * B * (0.55 + 0.45 * rnd()) + tooth;
        pts.push([fromX + dx * t + ux * d, fromY + dy * t + uy * d]);
      }
    };

    /* Corner to corner, with NO arc between them. The noise runs at full
       amplitude straight through each corner, so corners come out irregular and
       chipped — which is what a torn corner is — instead of either a needle
       point or a drawn radius.

       Top edge tears most: weather runs down it and hands reach it first.

       Amplitudes are the DEEPEST a bite can go, in px of 512 — so 60 is about
       40cm at wall scale, and `pow(bite, 3)` means only one or two spots per
       edge get anywhere near it. Chosen off a rendered sweep at 26 / 60 / 85 /
       110 composited over a wall tone, judged with the mask converted to real
       alpha (see the note on that below): 26 still read as a rectangle, 85
       started clipping the GDG logo, and 110 ate into the title. 60 leaves
       every poster's type and logo intact while the silhouette is unmistakably
       torn — roughly 92% of the sheet survives. */
    walk(a, a, b, a, 60.0);
    walk(b, a, b, b, 44.0);
    walk(b, b, a, b, 52.0);
    walk(a, b, a, a, 44.0);

    tx.fillStyle = '#fff';
    tx.beginPath();
    tx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts) tx.lineTo(p[0], p[1]);
    tx.closePath();
    tx.fill();

    /* ── Age: small chips and splits, edges only ────────────────────────────
       A sheet that has been up for years loses its edges first — the paste
       holds the middle long after the perimeter has been knocked, picked at
       and frozen. So the damage goes HERE, on the border, and never on the
       face: the earlier version punched pinholes and slits through the middle
       of the artwork, which landed on the type and is a different (wrong)
       story.

       The shapes matter as much as the size. The version before that cut 22
       `arc()` bites of up to 26px — circles, which read as a scalloped doily,
       not as damage. These are wedges and hairlines: a chip is a splinter of
       paper breaking away, and a split is a crack running a short distance in
       from the edge before it stops. Both are a few centimetres at wall scale,
       against the 20cm scallops.

       Cut BEFORE the feather blur below, deliberately — the chips get the same
       soft edge as the rest of the border, so they read as worn rather than
       laser-cut. */
    tx.globalCompositeOperation = 'destination-out';

    /** A point on the border, plus the inward normal and the tangent. */
    const edgePoint = (e: number, t: number): [number, number, number, number] => {
      const span = b - a;
      if (e === 0) return [a + span * t, a, 0, 1];
      if (e === 1) return [b, a + span * t, -1, 0];
      if (e === 2) return [b - span * t, b, 0, -1];
      return [a, b - span * t, 1, 0];
    };

    /* NO chips. There used to be 13 wedges cut out of the border, up to 12px
       deep — and a 12px bite out of a 512px edge is a ~9cm notch on the real
       sheet. Zoomed in that is the single deep cut that reads as a glitch
       rather than as damage, because nothing else on the edge is anywhere near
       that scale. The torn walk above now carries all the erosion, at a
       consistent size, everywhere — which is what makes it read as one torn
       edge instead of a clean edge with bites taken out of it. */

    // Splits: hairline cracks running in from the edge and stopping. These are
    // fine, and stay — they are age, not damage, and they never break the
    // silhouette the way a chip does.
    for (let i = 0; i < 6; i++) {
      const [px, py, nx, ny] = edgePoint((i + 2) % 4, 0.12 + rnd() * 0.76);
      const tanX = -ny;
      const tanY = nx;
      const len = 6 + rnd() * 11;
      const drift = (rnd() - 0.5) * 0.8; // wanders off straight-in
      const endX = px + nx * len + tanX * len * drift;
      const endY = py + ny * len + tanY * len * drift;
      // Straight, not a quadratic. A split follows the paper's grain and runs
      // in a line; curving it was one more source of the roundness this pass
      // is removing. Thinner too, now that the feather is 1.1px not 2.8px.
      tx.lineWidth = 0.9 + rnd() * 1.1;
      tx.lineCap = 'round';
      tx.beginPath();
      /* Start INSIDE the torn edge, not on the original rectangle. `edgePoint`
         walks the untorn a/b box, and the tear above now eats up to ~64px in
         from it — so a split beginning at `-nx * 2` would usually be drawn in
         paper that is already gone, and never show. 12px in puts it on surviving
         sheet while still reading as a crack that runs from the edge. */
      tx.moveTo(px + nx * 12, py + ny * 12);
      tx.lineTo(endX, endY);
      tx.stroke();
    }

    tx.globalCompositeOperation = 'source-over';

    /* FEATHER. The mask was a hard black/white step, and `alphaTest` turns a
       step into a razor: every edge pixel is either fully paper or fully gone,
       so the border rendered as a stencilled vector cut with visible stair-
       stepping on the diagonals. Paper has thickness and frayed fibres — its
       edge is soft at this scale, not a knife line.

       Blurring the mask hands the material a RAMP instead of a step, which
       `alphaToCoverage` (see EventPoster3D) then resolves across the canvas's
       MSAA samples.

       1.1px, down from 2.8. 2.8 was tuned when the edge was a smooth curve and
       the blur was doing double duty as a corner-rounder — but a blur is a
       low-pass filter, and the torn walk above is built entirely out of the
       high frequencies it removes. At 2.8 the fibre teeth were smeared back
       into the soft wave this pass exists to get rid of. 1.1px is enough to
       give A2C a ramp to resolve and kill the stair-stepping, and small enough
       that a ~4.5px tooth survives it intact. */
    const FEATHER = 1.1;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const cx = c.getContext('2d')!;
    cx.filter = `blur(${FEATHER}px)`;
    cx.drawImage(tmp, 0, 0);
    cx.filter = 'none';

    /* Still nothing through the FACE — no pinholes, no internal slits, no
       corner bites. All the wear lives on the border, above. */

    /* ⚠ If you preview this mask in a 2D canvas, convert LUMINANCE TO ALPHA
       first. The canvas here is opaque black-and-white — three reads the green
       channel as alpha (`alphaMap` samples `.g`), it does not read the canvas's
       own alpha, which is 255 everywhere including the "missing" paper. So
       compositing the mask over artwork with `globalCompositeOperation =
       'destination-in'` keeps EVERYTHING and shows an untorn rectangle no
       matter how aggressive the tear is. That false negative is why several
       rounds of tuning here looked like they were doing nothing. Do:
           const im = ctx.getImageData(0, 0, S, S);
           for (let i = 0; i < im.data.length; i += 4) im.data[i+3] = im.data[i+1];
           ctx.putImageData(im, 0, 0);
       before using it as a mask. */
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 4;
    tearMasks.push(t);
  }

  /* There was a third map here — `grimeMap`: paste bleed haloes, an edge-dirt
     gradient and sixteen rain streaks running down the face. NOTHING SAMPLED
     IT. EventPoster3D takes `wrinkleNormal` and `tearMasks` and has never
     referenced it, so this was 38 gradient fills over a 512² buffer plus a GPU
     upload, on the main thread, while the preloader is animating — for a
     texture that never reached a shader. Removed rather than wired up: dark
     streaks and edge grime over live event artwork are the opposite of what
     these sheets are for (see the fade note in EventPoster3D). */

  cached = { wrinkleNormal, tearMasks };
  return cached;
}

/* ═══════════════════════════════════════════════════════════════════════════
   UV fade grade.

   Street posters bleach: cyan pigment goes first, then magenta, leaving a warm
   yellow cast; contrast collapses and blacks lift toward the paper. The old
   posters ran at full saturation and full contrast — brighter than anything
   else in frame — which reads as a screenshot glued to a wall.

   Injected rather than baked because the art differs per poster, and a
   material.color multiply can only darken: it cannot desaturate or lift.
   ═══════════════════════════════════════════════════════════════════════════ */

export function applyPosterFade(material: THREE.MeshStandardMaterial, amount: number) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFade = { value: amount };

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uFade;`
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
         {
           // Sun falls hardest on the top of the sheet — fade is not uniform
           float fadeGrad = uFade * mix( 1.25, 0.55, vMapUv.y );
           vec3 c = diffuseColor.rgb;
           // Dye loss: cyan first, then magenta — hence the warm residue
           c = mix( c, c * vec3( 1.06, 0.99, 0.82 ), clamp( fadeGrad, 0.0, 1.0 ) );
           // Pigment washes toward the paper's own luminance
           float lum = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
           c = mix( c, vec3( lum ), fadeGrad * 0.5 );
           // Contrast collapse + lifted blacks toward the paper stock. Kept
           // gentler than before: the artwork is not ours to wreck, and a
           // chalked-out print reads as a bad decal, not as sun damage.
           c = mix( c, c * 0.84 + vec3( 0.1, 0.095, 0.08 ), fadeGrad * 0.6 );
           diffuseColor.rgb = c;
         }`
      );
  };
  material.customProgramCacheKey = () => `poster-fade-${amount.toFixed(2)}`;
}

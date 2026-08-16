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

    /* Inset is tiny — 2–5px of 512, i.e. under a centimetre on a 3.4m sheet. */
    const inset = 2 + rnd() * 3;

    /* BLUNT CORNERS. The four edge walks used to meet at hard 90° points, so
       every sheet ended in four needle-sharp corners — the giveaway that this
       is a mapped quad and not a piece of paper. A real pasted corner is blunt:
       it gets knocked, rubbed and softened by the paste long before anything
       else on the sheet does. R is 14–26px of 512, i.e. roughly a 10–18cm
       radius at wall scale. */
    const R = 14 + rnd() * 12;

    const pts: [number, number][] = [];
    const walk = (
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      jitter: number
    ) => {
      /* Many small deviations read as a fibrous paper edge; a few large ones
         read as a zigzag. Each step is damped against the previous one so the
         line wanders rather than alternating side to side. */
      const steps = 34;
      let prevJx = 0;
      let prevJy = 0;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Taper to zero at both ends so the wander dies out before the corner
        // arc takes over — otherwise the jitter fights the rounding.
        const taper = Math.min(1, Math.min(t, 1 - t) * 5);
        prevJx = prevJx * 0.55 + (rnd() - 0.5) * jitter * 0.45;
        prevJy = prevJy * 0.55 + (rnd() - 0.5) * jitter * 0.45;
        pts.push([
          fromX + (toX - fromX) * t + prevJx * taper,
          fromY + (toY - fromY) * t + prevJy * taper,
        ]);
      }
    };

    const a = inset;
    const b = S - inset;
    /* Each edge now stops R short of the corner; the gap is bridged by a
       quadratic through the corner point, which is what rounds it off. Top
       edge still wanders most — weather and hands both work from the top. */
    walk(a + R, a, b - R, a, 4.0);
    walk(b, a + R, b, b - R, 2.4);
    walk(b - R, b, a + R, b, 3.0);
    walk(a, b - R, a, a + R, 2.4);

    const nEdge = 35; // steps + 1, i.e. one edge's worth of points
    const edge = (i: number) => pts.slice(i * nEdge, (i + 1) * nEdge);

    tx.fillStyle = '#fff';
    tx.beginPath();
    const e0 = edge(0);
    tx.moveTo(e0[0][0], e0[0][1]);
    for (const p of e0) tx.lineTo(p[0], p[1]);
    tx.quadraticCurveTo(b, a, edge(1)[0][0], edge(1)[0][1]);
    for (const p of edge(1)) tx.lineTo(p[0], p[1]);
    tx.quadraticCurveTo(b, b, edge(2)[0][0], edge(2)[0][1]);
    for (const p of edge(2)) tx.lineTo(p[0], p[1]);
    tx.quadraticCurveTo(a, b, edge(3)[0][0], edge(3)[0][1]);
    for (const p of edge(3)) tx.lineTo(p[0], p[1]);
    tx.quadraticCurveTo(a, a, e0[0][0], e0[0][1]);
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

    // Chips: shallow wedges out of the border. Kept off the rounded corners
    // (t stays in 0.10–0.90) so they never eat the bluntness back off.
    for (let i = 0; i < 13; i++) {
      const [px, py, nx, ny] = edgePoint(i % 4, 0.1 + rnd() * 0.8);
      const tanX = -ny;
      const tanY = nx;
      /* 2–6cm of edge taken, 3–9cm inward. Sized so a chip is still legible
         after the 2.8px feather: at 1.6/2.4 the blur swallowed most of them and
         only the sharper splits showed, which read as scratches rather than as
         a sheet that has been up for years. Still an order of magnitude under
         the 20cm scallops this replaced. */
      const halfW = 2.4 + rnd() * 5.4;
      const depth = 4.0 + rnd() * 8.0;
      // Base sits slightly OUTSIDE the sheet so the cut always breaks the edge
      // rather than leaving a hairline of paper across its mouth.
      const bx = px - nx * 2;
      const by = py - ny * 2;
      tx.beginPath();
      tx.moveTo(bx - tanX * halfW, by - tanY * halfW);
      // Apex offset along the edge as well as inward, so no chip is a
      // symmetrical triangle — real ones break along the grain, off-square.
      tx.lineTo(
        px + nx * depth + tanX * (rnd() - 0.5) * halfW * 1.4,
        py + ny * depth + tanY * (rnd() - 0.5) * halfW * 1.4
      );
      tx.lineTo(bx + tanX * halfW, by + tanY * halfW);
      tx.closePath();
      tx.fill();
    }

    // Splits: hairline cracks running in from the edge and stopping. Wider
    // than a true hairline (1.4–3px) on purpose — the feather below softens
    // everything by 2.8px, and a 1px crack simply disappears into it.
    for (let i = 0; i < 7; i++) {
      const [px, py, nx, ny] = edgePoint((i + 2) % 4, 0.12 + rnd() * 0.76);
      const tanX = -ny;
      const tanY = nx;
      const len = 7 + rnd() * 15;
      const drift = (rnd() - 0.5) * 0.8; // wanders off straight-in
      const midX = px + nx * len * 0.5 + tanX * len * drift * 0.5;
      const midY = py + ny * len * 0.5 + tanY * len * drift * 0.5;
      const endX = px + nx * len + tanX * len * drift;
      const endY = py + ny * len + tanY * len * drift;
      tx.lineWidth = 1.4 + rnd() * 1.6;
      tx.lineCap = 'round';
      tx.beginPath();
      tx.moveTo(px - nx * 2, py - ny * 2);
      tx.quadraticCurveTo(midX, midY, endX, endY);
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
       MSAA samples. 2.8px of 512 is about 2cm of softness on the sheet: enough
       to blunt the cut and kill the aliasing, not enough to look out of focus.
       Blur also rounds the corners a touch further, which is the same thing
       paste and weather do. */
    const FEATHER = 2.8;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const cx = c.getContext('2d')!;
    cx.filter = `blur(${FEATHER}px)`;
    cx.drawImage(tmp, 0, 0);
    cx.filter = 'none';

    /* Still nothing through the FACE — no pinholes, no internal slits, no
       corner bites. All the wear lives on the border, above. */

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

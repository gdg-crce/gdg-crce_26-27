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
  /** Tear/edge silhouette in the GREEN channel (three's alphaMap reads .g) */
  tearMasks: THREE.CanvasTexture[];
  /** Paste bleed, damp blotching and print mottle — multiplied into albedo */
  grimeMap: THREE.CanvasTexture;
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

  /* ── 2. Tear masks ───────────────────────────────────────────────────────
     Four silhouettes: irregular torn borders, the odd missing corner, and
     nibbled bites out of the edge. A poster that has been up for years is not
     a rectangle, and a perfect rectangle is one of the loudest CG tells on a
     street wall. Green channel, because three's alphaMap samples .g          */
  const tearMasks: THREE.CanvasTexture[] = [];
  for (let v = 0; v < 4; v++) {
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const cx = c.getContext('2d')!;
    cx.fillStyle = '#000';
    cx.fillRect(0, 0, S, S);

    // Ragged border walk — a torn edge is a random walk with a small step
    const inset = 6 + rnd() * 10;
    const pts: [number, number][] = [];
    const walk = (
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      jitter: number
    ) => {
      const steps = 26;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const jx = (rnd() - 0.5) * jitter;
        const jy = (rnd() - 0.5) * jitter;
        pts.push([fromX + (toX - fromX) * t + jx, fromY + (toY - fromY) * t + jy]);
      }
    };
    // Top edge is usually the most chewed (weather + people grabbing at it)
    walk(inset, inset, S - inset, inset, 16);
    walk(S - inset, inset, S - inset, S - inset, 9);
    walk(S - inset, S - inset, inset, S - inset, 13);
    walk(inset, S - inset, inset, inset, 9);

    cx.fillStyle = '#fff';
    cx.beginPath();
    cx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts) cx.lineTo(p[0], p[1]);
    cx.closePath();
    cx.fill();

    // Bite a corner off entirely on some variants
    cx.globalCompositeOperation = 'destination-out';
    if (v % 2 === 0) {
      const corners: [number, number][] = [
        [0, 0],
        [S, 0],
        [0, S],
        [S, S],
      ];
      const [ccx, ccy] = corners[Math.floor(rnd() * 4)];
      const r = 40 + rnd() * 80;
      cx.beginPath();
      cx.moveTo(ccx, ccy);
      for (let i = 0; i <= 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        cx.lineTo(ccx + Math.cos(a) * r * (0.6 + rnd() * 0.7), ccy + Math.sin(a) * r * (0.6 + rnd() * 0.7));
      }
      cx.closePath();
      cx.fill();
    }
    // Pinholes and small punctures — staples, thumbtacks, thrown gravel, and
    // twenty years of people picking at a corner in passing.
    for (let i = 0; i < 26; i++) {
      const hx2 = 20 + rnd() * (S - 40);
      const hy2 = 20 + rnd() * (S - 40);
      cx.beginPath();
      cx.arc(hx2, hy2, 0.9 + rnd() * 3.4, 0, Math.PI * 2);
      cx.fill();
    }
    // Tiny internal tears — short slits where the sheet has split along a
    // wrinkle and never repaired
    for (let i = 0; i < 12; i++) {
      const tx2 = 30 + rnd() * (S - 60);
      const ty2 = 30 + rnd() * (S - 60);
      const tl = 6 + rnd() * 30;
      const ta = rnd() * Math.PI;
      cx.lineWidth = 1 + rnd() * 2.4;
      cx.strokeStyle = '#fff';
      cx.beginPath();
      cx.moveTo(tx2, ty2);
      cx.lineTo(tx2 + Math.cos(ta) * tl, ty2 + Math.sin(ta) * tl);
      cx.stroke();
    }
    // Nibbles out of the edges
    for (let i = 0; i < 22; i++) {
      const edge = Math.floor(rnd() * 4);
      const t = rnd() * S;
      const r = 4 + rnd() * 26;
      const ex = edge === 0 ? t : edge === 1 ? S : edge === 2 ? t : 0;
      const ey = edge === 0 ? 0 : edge === 1 ? t : edge === 2 ? S : t;
      cx.beginPath();
      cx.arc(ex, ey, r, 0, Math.PI * 2);
      cx.fill();
    }
    cx.globalCompositeOperation = 'source-over';

    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 4;
    tearMasks.push(t);
  }

  /* ── 3. Paste bleed / damp blotch / print mottle ────────────────────── */
  const gC = document.createElement('canvas');
  gC.width = S;
  gC.height = S;
  const gx = gC.getContext('2d')!;
  gx.fillStyle = '#ffffff';
  gx.fillRect(0, 0, S, S);

  // Paste bleeds through the sheet and dries in translucent haloes
  for (let i = 0; i < 22; i++) {
    const bx = rnd() * S;
    const by = rnd() * S;
    const br = 30 + rnd() * 110;
    const g = gx.createRadialGradient(bx, by, 4, bx, by, br);
    g.addColorStop(0, `rgba(150,142,120,${0.1 + rnd() * 0.16})`);
    g.addColorStop(1, 'rgba(150,142,120,0)');
    gx.fillStyle = g;
    gx.beginPath();
    gx.arc(bx, by, br, 0, Math.PI * 2);
    gx.fill();
  }

  // Grime creeps in from the edges — dirt collects where paper meets wall
  const dg = gx.createLinearGradient(0, 0, 0, S);
  dg.addColorStop(0, 'rgba(96,88,74,0.4)');
  dg.addColorStop(0.18, 'rgba(255,255,255,0)');
  dg.addColorStop(0.7, 'rgba(255,255,255,0)');
  dg.addColorStop(1, 'rgba(72,66,56,0.55)');
  gx.fillStyle = dg;
  gx.fillRect(0, 0, S, S);

  // Rain streaks running down the face
  for (let i = 0; i < 16; i++) {
    const sx = rnd() * S;
    const sw = 2 + rnd() * 9;
    const g = gx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, `rgba(110,102,88,${0.12 + rnd() * 0.14})`);
    g.addColorStop(1, 'rgba(110,102,88,0)');
    gx.fillStyle = g;
    gx.fillRect(sx, rnd() * S * 0.4, sw, S);
  }

  const grimeMap = new THREE.CanvasTexture(gC);
  grimeMap.wrapS = grimeMap.wrapT = THREE.ClampToEdgeWrapping;
  grimeMap.colorSpace = THREE.SRGBColorSpace;
  grimeMap.anisotropy = 4;

  cached = { wrinkleNormal, tearMasks, grimeMap };
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

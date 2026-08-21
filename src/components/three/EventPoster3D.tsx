'use client';

import React, { useRef, useState, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { buildPaperMaps, applyPosterFade } from './posterPaper';

interface EventPoster3DProps {
  posterImage: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
  /** Stable per-poster variation seed (index in eventData) */
  variant?: number;
}

/**
 * Wheat-pasted street poster.
 *
 * What changed and why it matters:
 *
 * • It no longer floats. The old plane sat at z = 0.11 — eleven centimetres off
 *   the wall — with castShadow on, so the directional light threw a hard drop
 *   shadow around it. That black border was the single most artificial thing in
 *   frame. Paper is 0.1mm thick, conforms to the wall, and casts nothing. The
 *   11cm existed only to clear the old 30cm displacement; with the wall flat,
 *   it comes down to 12mm and becomes part of the surface.
 *
 * • It wrinkles. Paste soaks the sheet, the fibres swell, and it dries in
 *   ripples and trapped bubbles. Under this scene's cursor-tracked flashlight
 *   that ripple is what sells paper over a matte quad.
 *
 * • It is not a rectangle. Torn borders and missing corners via alpha cutout.
 *
 * • It has lifted corners. Real vertex displacement, because a curl has to
 *   catch light on its underside and show wall behind it — a normal map cannot
 *   fake that. 24x24 quads x 9 posters is ~10k tris, i.e. free.
 *
 * • It has faded. See applyPosterFade.
 */
export default function EventPoster3D({
  posterImage,
  position,
  rotation,
  scale: posterScale,
  variant = 0,
}: EventPoster3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const texture = useTexture(posterImage);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const paper = useMemo(() => buildPaperMaps(), []);

  /* The sheet takes its shape from the artwork, not the other way round.
     This was a hardcoded 3.4 × 3.4 square, which was fine while the posters
     were square 1024×1024 placeholders and silently squashed the real event
     designs (1179×1579 portrait) by a quarter of their width the moment they
     were swapped in.

     HEIGHT is the fixed dimension and width follows the aspect — not the other
     way round. These sheets sit at y ≈ 2.3–2.55 on a wall whose ground is at
     y = 0: driving height from a fixed width would have put a portrait poster's
     bottom edge through the pavement.

     useTexture suspends until the image has decoded, so `texture.image` is
     always populated by first render; the `|| 1` is for a texture with no
     intrinsic size, which would otherwise collapse the geometry to zero. */
  const img = texture.image as { width?: number; height?: number } | undefined;
  const aspect = img?.width && img?.height ? img.width / img.height : 1;
  const h = 3.4 * posterScale;
  const w = h * aspect;

  /* Per-poster variation. Cloned textures share the GPU image (Texture.clone
     keeps .source), so four masks flipped four ways give sixteen distinct
     silhouettes at zero extra VRAM. */
  const { tearMask, wrinkle } = useMemo(() => {
    const tm = paper.tearMasks[variant % paper.tearMasks.length].clone();
    const flipX = (variant >> 2) & 1;
    const flipY = (variant >> 1) & 1;
    tm.repeat.set(flipX ? -1 : 1, flipY ? -1 : 1);
    tm.offset.set(flipX ? 1 : 0, flipY ? 1 : 0);
    tm.needsUpdate = true;

    const wr = paper.wrinkleNormal.clone();
    wr.repeat.set(flipY ? -1 : 1, flipX ? -1 : 1);
    wr.offset.set(flipY ? 1 : 0, flipX ? 1 : 0);
    wr.needsUpdate = true;

    return { tearMask: tm, wrinkle: wr };
  }, [paper, variant]);

  /* Geometry: gentle sheet bow + lifted corners, baked into vertices once.
     Which corners lift, and how far, keys off the variant so no two posters
     peel the same way. Gravity decides the rest: the top corners let go first
     because that is where the sheet's own weight pulls against the paste. */
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, h, 24, 24);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const rnd = (n: number) => {
      const s = Math.sin(n * 127.1 + variant * 311.7) * 43758.5453;
      return s - Math.floor(s);
    };
    /* Corner lift, now barely there: 2–7mm at the top, 1–3mm at the bottom.
       It was 1.5–6.5cm at the top, which is a corner standing a finger's width
       off the wall — under a raking view that silhouettes against the plaster
       and is the single loudest "this is a floating quad" cue in the frame.
       The brief is a sheet that is STUCK to the wall, so the paste wins: what
       is left is just enough that the outline is not perfectly straight when
       the light rakes across it. The flashlight this was originally tuned to
       catch does not exist any more either (see the lighting notes in
       CLAUDE.md) — under a flat overcast dome a big curl gains nothing and
       only breaks the contact. */
    const curl = [
      rnd(1) * 0.002 + 0.001,
      rnd(2) * 0.002 + 0.001,
      rnd(3) * 0.005 + 0.002,
      rnd(4) * 0.005 + 0.002,
    ];

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const u = x / w + 0.5;
      const v = y / h + 0.5;

      // Corner proximity, sharpened so the lift stays in the last ~25%
      const cu = [u, 1 - u, u, 1 - u];
      const cv = [v, v, 1 - v, 1 - v];
      let z = 0;
      for (let c = 0; c < 4; c++) {
        const d = Math.max(0, 1 - Math.hypot(cu[c], cv[c]) / 0.55);
        z += d * d * d * curl[c];
      }

      /* Sheet bow and cockle, halved along with the curl. Paper still does not
         lie perfectly flat over old plaster, but at 1.6cm the bow was lifting
         the middle of the sheet clear of the wall; 7mm keeps the ripple without
         breaking contact. The fine cockle stays — that is surface, not lift,
         and it is what stops the sheet reading as a printed decal. */
      z += Math.sin(u * 3.1 + variant) * Math.cos(v * 2.3 + variant * 0.7) * 0.007;
      z += Math.sin(u * 11.0 + variant * 2.1) * 0.0035;
      z += Math.cos(v * 8.3 + variant * 1.7) * 0.003;

      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, [w, h, variant]);

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      map: texture,
      alphaMap: tearMask,
      normalMap: wrinkle,
      normalScale: new THREE.Vector2(0.2, 0.2),
      transparent: false,
      alphaTest: 0.02,
      alphaToCoverage: true,
      roughness: 0.75,
      metalness: 0,
      envMapIntensity: 0.5,
      side: THREE.FrontSide,
    });
    // Minimal fade so posters remain vibrant, crisp, clean, and proper
    const fade = 0.05 + ((variant * 0.07) % 1) * 0.08;
    applyPosterFade(m, fade);
    return m;
  }, [texture, tearMask, wrinkle, variant]);

  useEffect(() => {
    material.emissive.set(hovered ? '#2A1D10' : '#000000');
    material.emissiveIntensity = hovered ? 0.16 : 0;
  }, [hovered, material]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      tearMask.dispose();
      wrinkle.dispose();
    },
    [geometry, material, tearMask, wrinkle]
  );

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, 0, rotation]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* There is no shadow plane here any more, and there should not be one.

          It was a near-black quad (#0B0908 at 0.4 opacity) sitting 4mm behind
          the sheet, scaled to 1.012 and masked with the SAME tear mask. Two
          things came out of that, both of them the "shadows on the posters"
          complaint:

          1. Around the border it drew a dark outline 1.2% larger than the
             sheet. That is a drop shadow — exactly what the comment above it
             claimed it was replacing — and on a torn edge it traced every
             notch, which is what made the silhouette read as ragged and dirty.
          2. The old mask punched pinholes and slits through the artwork, and
             this plane sat behind them at a slightly different scale, so the
             holes did not line up and each one showed a black crescent. Dark
             speckles scattered across the print, over the type.

          Paper pasted flat to a wall under an even overcast sky has no
          shadow to cast: the sheet is 0.1mm thick and there is no gap for
          light to skip. What sells "stuck down" is the absence of a gap — the
          sheet sits at z=0.012 with almost no curl, so nothing separates it
          from the plaster — plus the wall's own ambient occlusion, which the
          scene already renders. Adding darkness by hand is what made it look
          stuck ON rather than stuck TO. */}
      <mesh geometry={geometry} material={material} receiveShadow />
    </group>
  );
}

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
    // Which of the four corners have let go, and by how much. Indices 0/1 are
    // the bottom pair, 2/3 the top — and the top always wins, because that is
    // where the sheet's own weight hangs off paste that gave up years ago.
    // Held to 1.5–6.5cm at the top: enough to read clearly at five metres and
    // to catch the flashlight on its underside, but a corner peeling further
    // than a hand's width stops being weathering and starts being a paper
    // aeroplane taped to a wall.
    const curl = [
      rnd(1) * 0.018 + 0.005,
      rnd(2) * 0.018 + 0.005,
      rnd(3) * 0.05 + 0.015,
      rnd(4) * 0.05 + 0.015,
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

      // Slow sheet bow — paper never lies perfectly flat over old plaster
      z += Math.sin(u * 3.1 + variant) * Math.cos(v * 2.3 + variant * 0.7) * 0.016;
      // Cockle ridges — the buckling that paste leaves behind, at sheet scale
      z += Math.sin(u * 11.0 + variant * 2.1) * 0.005;
      z += Math.cos(v * 8.3 + variant * 1.7) * 0.004;

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
      normalScale: new THREE.Vector2(1.0, 1.0),
      // Cutout, not blending: writes depth, needs no sorting, and is cheaper
      // than the transparent stack this replaces.
      transparent: false,
      alphaTest: 0.5,
      // Paper is matte but not dead — old print keeps a faint tooth, and the
      // ink sits slightly glossier than the stock around it.
      roughness: 0.88,
      metalness: 0,
      envMapIntensity: 0.45,
      side: THREE.FrontSide,
    });
    // Fade varies per poster — some have been up far longer than others.
    //
    // Backed off from 0.62–0.92. That range was set when the wall was graded
    // grey and lit by a golden spot, so the print was the brightest, most
    // saturated thing in frame and had to be beaten down. Both causes are gone:
    // the wall has its own colour back, and flat overcast stops blowing the ink
    // out. Fading this hard now would fight the brief from the other side —
    // the wall is meant to be the muted one and the posters are meant to carry
    // the colour. They are still the NEWEST thing on a 30-year surface, not the
    // quietest. 0.32–0.58 reads as cheap paper that has been rained on, while
    // leaving it the only saturated element in the frame.
    const fade = 0.32 + ((variant * 0.137) % 1) * 0.26;
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
      {/* Contact shadow. Paper casts no drop shadow, but where its torn edge
          meets the wall there is a hairline of dirt and occlusion — the thing
          that actually reads as "stuck down" rather than "hovering". */}
      <mesh position={[0, 0, -0.004]} renderOrder={-1}>
        {/* ~2cm of ring, not 6 — contact darkening is a hairline, and anything
            wider starts reading as the drop shadow this replaces. */}
        <planeGeometry args={[w * 1.012, h * 1.012]} />
        <meshBasicMaterial
          color="#0B0908"
          transparent
          opacity={0.4}
          alphaMap={tearMask}
          depthWrite={false}
        />
      </mesh>

      {/* No castShadow — paper on a wall throws nothing. */}
      <mesh geometry={geometry} material={material} receiveShadow />
    </group>
  );
}

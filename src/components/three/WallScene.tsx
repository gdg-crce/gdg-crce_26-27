'use client';

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sparkles, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import EventPoster3D from './EventPoster3D';
import { events } from '@/components/sections/events/eventData';
import {
  RightSideAlleyDetail,
  WallDecalsAndGrime,
  AlleyDepthLayers,
  UrbanStreetFloor,
} from './AlleyProps3D';
import {
  WALL,
  buildWallTextures,
  applyMacroLayer,
  buildAlleyEnvironment,
  heightToNormalCanvas,
  mulberry32,
} from './wallMaterial';

/* ═══════════════════════════════════════════════════
   Module-level Texture Cache
   Enables instantaneous sharing of heavy procedural canvas
   textures when WallScene mounts across multiple sections.
   ═══════════════════════════════════════════════════ */
let cachedSignTexture: THREE.CanvasTexture | null = null;
const cachedGraffitiTextures = new Map<string, THREE.CanvasTexture>();
let cachedSidewalkTextures: readonly [
  THREE.CanvasTexture,
  THREE.CanvasTexture,
  THREE.CanvasTexture,
  THREE.CanvasTexture,
  THREE.CanvasTexture,
  THREE.CanvasTexture,
  THREE.CanvasTexture
] | null = null;

/* ═══════════════════════════════════════════════════
   Interactive Human Camera Rig — Stride + Mouse Look
   ═══════════════════════════════════════════════════ */

function InteractiveCameraRig({ progressRef, snapToTarget }: { progressRef: React.RefObject<number>; snapToTarget?: boolean }) {
  const { camera } = useThree();
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const initializedRef = useRef(false);

  useFrame((state, delta) => {
    const p = progressRef.current ?? 0;
    // Base walking X position along wall (-24 -> 23)
    const targetX = THREE.MathUtils.lerp(-24, 23, p);

    if (!initializedRef.current || snapToTarget) {
      if (snapToTarget || p > 0.1) {
        camera.position.x = targetX;
      }
      initializedRef.current = true;
    }

    const smoothing = snapToTarget ? 1.0 : (1 - Math.pow(0.0001, delta));
    camera.position.x += (targetX - camera.position.x) * smoothing;

    // Interactive First-Person Head Tilt based on mouse pointer
    // Moving mouse up/down/left/right gently rotates view
    const pointerX = state.pointer.x * 0.45;
    const pointerY = state.pointer.y * 0.35;

    // Human walking stride: footstep dip + natural head sway
    const footstepY = Math.sin(p * 70) * 0.02;
    const footstepX = Math.cos(p * 35) * 0.012;

    camera.position.y = 2.1 + footstepY + pointerY * 0.15;
    camera.position.z = 4.4;

    lookTarget.set(
      camera.position.x + 0.65 + pointerX + footstepX,
      2.3 + pointerY,
      0
    );
    camera.lookAt(lookTarget);
  });

  return null;
}

/* ═══════════════════════════════════════════════════
   Flickering Cyan Neon Tube (Aesthetic Top Light)
   ═══════════════════════════════════════════════════ */

function CyanNeonTube3D() {
  const lightGroupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const flicker = Math.random() > 0.93 ? 0.2 : 1.0;
    const pulse = 0.9 + Math.sin(t * 2.5) * 0.1;
    const intensity = flicker * pulse;

    if (matRef.current) matRef.current.emissiveIntensity = 2.5 * intensity;
    if (lightGroupRef.current) {
      lightGroupRef.current.children.forEach((child) => {
        if ((child as THREE.PointLight).isLight) {
          (child as THREE.PointLight).intensity = 3.0 * intensity;
        }
      });
    }
  });

  return (
    <group position={[0, 7.6, 0.22]}>
      {/* Long Neon Tube lying horizontally */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 50, 8]} />
        <meshStandardMaterial
          ref={matRef}
          color="#A0FFFF"
          emissive="#00FFFF"
          emissiveIntensity={2.5}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
      
      {/* Tube Mounting Brackets */}
      {[-24, -18, -12, -6, 0, 6, 12, 18, 24].map((x, i) => (
        <mesh key={i} position={[x, 0.05, -0.06]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.12, 0.12]} />
          <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>
      ))}

      {/* Point lights distributed along the tube for an even neon glow on the wall */}
      <group ref={lightGroupRef}>
        {[-20, -10, 0, 10, 20].map((x, i) => (
          <pointLight
            key={i}
            position={[x, -0.2, 0.8]}
            color="#00FFFF"
            intensity={3}
            distance={15}
            decay={2}
          />
        ))}
      </group>
    </group>
  );
}

/* ═══════════════════════════════════════════════════
   Flickering 3D Neon Alley Sign ("MTV // ON AIR")
   ═══════════════════════════════════════════════════ */

function NeonAlleySign3D() {
  const lightRef = useRef<THREE.PointLight>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Controlled neon electrical flicker
    const flicker = Math.random() > 0.94 ? 0.35 : 1.0;
    const pulse = 0.88 + Math.sin(t * 3.5) * 0.12;
    const intensity = flicker * pulse;

    // Daylight neon behaves backwards from night neon: the tubes have to glow
    // HARDER to still read as lit against a bright sky, while throwing almost
    // nothing onto the wall. At 14 this pooled magenta across the plaster —
    // colour on the wall itself, which the palette reserves for graffiti and
    // posters. 2.0 keeps a faint halo at the tubes and nothing beyond them.
    if (lightRef.current) lightRef.current.intensity = 2.0 * intensity;
    if (matRef.current) matRef.current.emissiveIntensity = 1.0 * intensity;
  });

  const signTexture = useMemo(() => {
    if (cachedSignTexture) return cachedSignTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#110D0F';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#FF0055';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.font = 'bold italic 64px Impact, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#FF0055';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FF2277';
    ctx.fillText('MTV // LIVE 90s', 256, 64);

    cachedSignTexture = new THREE.CanvasTexture(canvas);
    return cachedSignTexture;
  }, []);

  return (
    <group position={[-14, 5.8, 0.15]} rotation={[0, 0, -0.04]}>
      {/* Scaled down 14% to avoid billboard oversized feel */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[4.15, 1.05, 0.10]} />
        <meshStandardMaterial color="#1A1516" roughness={0.8} />
      </mesh>

      {/* Glowing Neon Face */}
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[3.95, 0.92]} />
        <meshStandardMaterial
          ref={matRef}
          map={signTexture}
          emissive="#FF0055"
          emissiveMap={signTexture}
          emissiveIntensity={1.0}
          roughness={0.2}
        />
      </mesh>

      {/* Declared value must match what useFrame settles on. It used to say 14
          while the frame loop drove it to a different number, so the very first
          frame — and any frame where the loop has not run yet — flooded the
          plaster magenta. */}
      <pointLight
        ref={lightRef}
        position={[0, 0, 1.4]}
        color="#FF2D6B"
        intensity={2}
        distance={7}
        decay={2}
      />
    </group>
  );
}

/* ═══════════════════════════════════════════════════
   Weathered Urban Masonry Wall

   Base material is a photogrammetry scan (see ./wallMaterial for why the
   procedural generator that used to live there was abandoned). The macro layer,
   the runoff anchored to real pipes, and the poster-ghost decals still ride on
   top of it — a scan gives a believable SURFACE, but it knows nothing about
   this alley.

   The mesh is dead flat. The old 0.3 displacementScale over 42cm quads produced
   8cm-proud stucco and 9cm-deep "cracks" smeared into smooth valleys — lumpy
   terrain that resolved no real feature while costing 6,400 verts. Real walls
   ARE flat at metre scale; their story is at mm–cm scale, which is exactly what
   a normal map is for. At 4m a 2cm lip subtends 0.3°, so there is no silhouette
   to lose.
   ═══════════════════════════════════════════════════ */

function WeatheredUrbanStreetWall() {
  const loader = useMemo(() => new THREE.TextureLoader(), []);
  const tex = useMemo(() => buildWallTextures(loader), [loader]);
  /* The scan's normal is the ONLY thing carrying relief — the mesh is flat and
     the albedo is deliberately flattened at bake time to kill the camo read. So
     this map has to work harder than a default 1.0: at 1.1 the plaster's step
     down to the brick barely shaded and the wall read papery.

     Relief is not free under a dome: every texel this tilts away from the bright
     zenith turns toward the dark ground half, so pushing the normal DARKENS the
     wall (1.6 measured a drop from 144 to 110). That is paid for with
     envMapIntensity below rather than by backing the relief off — the depth is
     the point, and brightness is the cheaper thing to buy back. */
  const normalScale = useMemo(() => new THREE.Vector2(1.6, 1.6), []);

  // aoMap samples the second UV channel; a plane only ships `uv`, so alias it.
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(WALL.width, WALL.height);
    g.setAttribute('uv1', g.attributes.uv);
    return g;
  }, []);

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      map: tex.map,
      normalMap: tex.normalMap,
      normalScale,
      roughnessMap: tex.roughnessMap,
      aoMap: tex.aoMap,
      // AO only attenuates INDIRECT light — and here indirect light is nearly
      // all the light, so aoMap bites far harder than it would under a sun rig.
      // At 1.0 the scan's baked occlusion drove crevices toward black (measured
      // darkest pixel 10/255), which is impossible under a dome and was a large
      // part of what read as "dull". The cavity layer now carries the recesses
      // deliberately, so this only needs to deepen true occlusion.
      aoMapIntensity: 0.7,
      // roughness/metalness are multipliers over the maps, so keep them at 1/0
      // and let the maps do the talking. A scalar 0.92 across brick, paint,
      // soot and damp is one material — and one material reads as CG.
      roughness: 1.0,
      metalness: 0.0,
      // The sky dome is the key light now, so this is no longer a reflection
      // trim — it is how much daylight the wall receives. At 0.5 the wall was
      // being lit at half strength and then darkened again by the macro layer,
      // which is most of why it read as a night wall in a daylit scene.
      //
      // Past 1.0 this is an art dial, but it is the RIGHT dial: it lifts only
      // the wall, leaving the pavement and posters alone — both were already
      // peaking near clipping (227 and 221), so buying wall brightness with
      // toneMappingExposure or environmentIntensity would have blown them.
      // Raised to pay for the relief: normalScale 1.6 plus the cavity layer
      // cost the wall ~25% of its brightness, and this hands it back.
      envMapIntensity: 1.75,
    });
    // roughnessMap doubles as the cavity source — cavity is packed in its .b
    applyMacroLayer(m, tex.macroMap, tex.ghostMap, tex.roughnessMap, tex.detailNormal, tex.crackMap);
    return m;
  }, [tex, normalScale]);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  return (
    <mesh
      position={[0, WALL.centerY, 0]}
      geometry={geometry}
      material={material}
      receiveShadow
    />
  );
}

/* ═══════════════════════════════════════════════════
   Aerosol Graffiti

   The old tag was a Photoshop text layer: Impact + a crisp black stroke + a
   hard drop shadow, floating 10cm off the wall with castShadow on. That is why
   it read as a sticker hovering over the bricks rather than paint on them.

   Real aerosol: no outline, a soft overspray halo (the cone always oversprays),
   density that breaks up as paint skips the wall's pores, gravity drips from
   the heaviest passes only, and colour that is never pure-screen saturated —
   a can of cyan on a filthy 20-year-old wall is a dull teal.
   ═══════════════════════════════════════════════════ */

interface GraffitiProps {
  text: string;
  subtext?: string;
  color: string;
  accentColor: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  tagScale?: number;
}

function GraffitiTag({
  text,
  subtext,
  color,
  accentColor,
  position,
  rotation = [0, 0, 0],
  tagScale = 1,
}: GraffitiProps) {
  const texture = useMemo(() => {
    const cacheKey = `${text}_${subtext || ''}_${color}_${accentColor}`;
    if (cachedGraffitiTextures.has(cacheKey)) return cachedGraffitiTextures.get(cacheKey)!;

    const W = 512;
    const H = 256;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);

    const font = '900 italic 92px Impact, "Arial Black", sans-serif';

    // 1. Overspray halo — the aerosol cone always lays down a soft mist well
    //    beyond the stroke. This, not an outline, is what says "spray can".
    ctx.save();
    ctx.filter = 'blur(9px)';
    ctx.globalAlpha = 0.3;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, 256, 112);
    ctx.restore();

    // 2. Core pass, deliberately short of full opacity — thin aerosol lets the
    //    wall's own colour through, which is how paint bonds to a surface
    //    visually instead of sitting on top of it.
    ctx.save();
    ctx.filter = 'blur(1.1px)';
    ctx.globalAlpha = 0.82;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, 256, 112);
    ctx.restore();

    // 3. Absorption breakup — coherent blotches erased out of the paint so
    //    density varies organically. Porous plaster drinks paint unevenly and
    //    the aerosol skips the recesses entirely; uniform fill never does this.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const rnd = mulberry32(text.charCodeAt(0) * 7919 + text.length);
    for (let i = 0; i < 190; i++) {
      const bx = rnd() * W;
      const by = 40 + rnd() * 150;
      const br = 1.5 + rnd() * 9;
      ctx.globalAlpha = rnd() * 0.5;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 4. Drips — only where paint pooled, i.e. under the heaviest strokes.
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.62;
    for (let i = 0; i < 5; i++) {
      const dx = 110 + i * 62 + (rnd() - 0.5) * 26;
      const startY = 140 + rnd() * 12;
      const dripLen = 18 + rnd() * 48;
      ctx.lineWidth = 2 + rnd() * 2;
      ctx.beginPath();
      ctx.moveTo(dx, startY);
      ctx.lineTo(dx + (rnd() - 0.5) * 3, startY + dripLen);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(dx, startY + dripLen, ctx.lineWidth * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();

    // 5. Aerosol speckle — the fine spatter at the edge of the cone
    ctx.save();
    for (let i = 0; i < 420; i++) {
      const px = 40 + rnd() * 430;
      const py = 40 + rnd() * 190;
      ctx.fillStyle = rnd() > 0.5 ? color : accentColor;
      ctx.globalAlpha = rnd() * 0.26;
      ctx.fillRect(px, py, 1 + Math.round(rnd()), 1 + Math.round(rnd()));
    }
    ctx.restore();

    if (subtext) {
      // Stencil subtext: hard-edged because a stencil IS hard-edged — but faded
      // and speckled, because it was sprayed years before the tag over it.
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = 'rgba(228, 220, 208, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(48, 178, 416, 36);
      ctx.font = 'bold 18px "Courier New", Impact, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(226, 219, 206, 0.78)';
      ctx.fillText(subtext.toUpperCase(), 256, 196);
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 90; i++) {
        ctx.globalAlpha = rnd() * 0.6;
        ctx.beginPath();
        ctx.arc(40 + rnd() * 432, 176 + rnd() * 42, 0.8 + rnd() * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    cachedGraffitiTextures.set(cacheKey, tex);
    return tex;
  }, [text, subtext, color, accentColor]);

  return (
    // No castShadow: paint has no thickness and casts nothing. z sits at 10mm
    // — close enough to be part of the wall now that displacement is gone.
    <mesh position={position} rotation={rotation} receiveShadow>
      <planeGeometry args={[4.2 * tagScale, 2.1 * tagScale]} />
      <meshStandardMaterial
        map={texture}
        transparent={true}
        opacity={0.9}
        alphaTest={0.02}
        roughness={0.88}
        metalness={0}
        envMapIntensity={0.4}
        depthWrite={false}
        polygonOffset={true}
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
      />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════
   Street Trash Cans & Industrial Oil Drums
   ═══════════════════════════════════════════════════ */

function StreetTrashCans() {
  const canMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2B2827', roughness: 0.6, metalness: 0.6 }),
    []
  );
  const drumMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3A201C', roughness: 0.7, metalness: 0.4 }),
    []
  );

  const canPositions: [number, number, number][] = [
    [-25.5, 0.45, 0.6],
    [-14.5, 0.45, 0.55],
    [-3.8, 0.45, 0.65],
    [8.5, 0.45, 0.6],
    [19.2, 0.45, 0.55],
  ];

  return (
    <group>
      {canPositions.map((pos, i) => (
        <group key={i} position={pos}>
          <mesh material={canMat} castShadow receiveShadow>
            <cylinderGeometry args={[0.32, 0.28, 0.9, 14]} />
          </mesh>
          <mesh position={[0, 0.46, 0]} material={canMat} castShadow receiveShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.06, 14]} />
          </mesh>
          {i % 2 === 0 && (
            <mesh position={[0.75, 0.05, -0.1]} material={drumMat} castShadow receiveShadow>
              <cylinderGeometry args={[0.36, 0.36, 1.0, 14]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════
   Industrial Pipes & Barred Vent Windows
   ═══════════════════════════════════════════════════ */

function AlleyIndustrialDetails() {
  const pipeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3B332C', roughness: 0.65, metalness: 0.75 }),
    []
  );
  const rustMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#4A2A20', roughness: 0.8, metalness: 0.5 }),
    []
  );

  return (
    <group>
      {/* Overhead pipe */}
      <mesh position={[0, 7.8, 0.16]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.08, 68, 8]} />
        <meshStandardMaterial color="#38302A" roughness={0.7} metalness={0.6} />
      </mesh>

      {/* Vertical rusty drain pipes (Straight & Plumb) */}
      {[-24, -13, -2, 9, 21].map((x, i) => (
        <mesh key={i} position={[x, 3.8, 0.16]} rotation={[0, 0, 0]} material={i % 2 === 0 ? pipeMat : rustMat} castShadow receiveShadow>
          <cylinderGeometry args={[0.06, 0.06, 8.0, 8]} />
        </mesh>
      ))}

      {/* Barred vent windows */}
      {[-18, 2, 14].map((x, i) => (
        <group key={i} position={[x, 6.2, 0.10]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.4, 1.4, 0.1]} />
            <meshStandardMaterial color="#110E0D" roughness={0.9} />
          </mesh>
          {[-0.8, -0.4, 0, 0.4, 0.8].map((bx, idx) => (
            <mesh key={idx} position={[bx, 0, 0.08]} castShadow receiveShadow>
              <cylinderGeometry args={[0.025, 0.025, 1.35, 6]} />
              <meshStandardMaterial color="#2E2824" metalness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════
   Sidewalk Concrete with Rain Puddle Reflections
   ═══════════════════════════════════════════════════ */

function WetSidewalkAndStreet() {
  const [
    sidewalkTex,
    sidewalkNormalMap,
    sidewalkRoughnessMap,
    asphaltTex,
    asphaltNormalMap,
    asphaltRoughnessMap,
    curbTex,
  ] = useMemo(() => {
    if (cachedSidewalkTextures) return cachedSidewalkTextures;

    const rnd = mulberry32(0x5723);

    /* ══════════════════════════════════════════════════════════════════
       1. Authentic 90s Grey Concrete Footwalk (Sidewalk against wall)
       Poured urban cement slab with saw-cut expansion joints, fine stone
       aggregate, chewing gum spots, and natural sidewalk grit.
       ══════════════════════════════════════════════════════════════════ */
    const sW = 1024;
    const sH = 512;
    const sCanvas = document.createElement('canvas');
    sCanvas.width = sW;
    sCanvas.height = sH;
    const sCtx = sCanvas.getContext('2d')!;

    // Base concrete grey (#6C7178 to #64686F)
    sCtx.fillStyle = '#6C7178';
    sCtx.fillRect(0, 0, sW, sH);

    // Subtle cloudiness / moisture variation across sidewalk slabs
    for (let i = 0; i < 45; i++) {
      const px = rnd() * sW;
      const py = rnd() * sH;
      const pr = 40 + rnd() * 140;
      const grad = sCtx.createRadialGradient(px, py, 10, px, py, pr);
      grad.addColorStop(0, rnd() > 0.5 ? 'rgba(122, 127, 136, 0.18)' : 'rgba(92, 96, 103, 0.22)');
      grad.addColorStop(1, 'rgba(108, 113, 120, 0.0)');
      sCtx.fillStyle = grad;
      sCtx.beginPath();
      sCtx.arc(px, py, pr, 0, Math.PI * 2);
      sCtx.fill();
    }

    // High-definition concrete aggregate grain
    const sData = sCtx.getImageData(0, 0, sW, sH);
    for (let i = 0; i < sData.data.length; i += 4) {
      const n = (rnd() - 0.5) * 28;
      sData.data[i] = Math.max(0, Math.min(255, sData.data[i] + n));
      sData.data[i + 1] = Math.max(0, Math.min(255, sData.data[i + 1] + n));
      sData.data[i + 2] = Math.max(0, Math.min(255, sData.data[i + 2] + n));
    }
    sCtx.putImageData(sData, 0, 0);

    // Saw-cut concrete expansion joints (vertical joint grooves every 256px)
    for (let x = 0; x < sW; x += 256) {
      // Dark groove recess
      sCtx.fillStyle = '#2A2C30';
      sCtx.fillRect(x - 3, 0, 6, sH);
      // Highlight edge along score groove
      sCtx.fillStyle = 'rgba(142, 148, 158, 0.65)';
      sCtx.fillRect(x + 3, 0, 2, sH);
      // Dirt accumulation inside expansion groove
      sCtx.fillStyle = 'rgba(32, 34, 38, 0.45)';
      sCtx.fillRect(x - 12, 0, 24, sH);
    }

    // Footwalk chewing gum spots & sidewalk stains
    for (let i = 0; i < 45; i++) {
      const gx = rnd() * sW;
      const gy = rnd() * sH;
      const gr = 3 + rnd() * 8;
      sCtx.fillStyle = rnd() > 0.4 ? '#2E3136' : '#8B8F96';
      sCtx.beginPath();
      sCtx.arc(gx, gy, gr, 0, Math.PI * 2);
      sCtx.fill();
    }

    // Sidewalk Bump/Height canvas -> Normal Map
    const sBump = document.createElement('canvas');
    sBump.width = sW;
    sBump.height = sH;
    const sBumpCtx = sBump.getContext('2d')!;
    sBumpCtx.fillStyle = '#808080';
    sBumpCtx.fillRect(0, 0, sW, sH);
    sBumpCtx.drawImage(sCanvas, 0, 0);
    // Deepen grooves in bump map
    for (let x = 0; x < sW; x += 256) {
      sBumpCtx.fillStyle = '#101010';
      sBumpCtx.fillRect(x - 3, 0, 6, sH);
    }
    const sNormalCanvas = heightToNormalCanvas(sBump, sW, 3.2);

    // Sidewalk Roughness Map (Matte concrete ~0.82, damp grooves ~0.4)
    const sRough = document.createElement('canvas');
    sRough.width = sW;
    sRough.height = sH;
    const sRoughCtx = sRough.getContext('2d')!;
    sRoughCtx.fillStyle = '#D0D0D0'; // ~0.82 roughness
    sRoughCtx.fillRect(0, 0, sW, sH);
    for (let x = 0; x < sW; x += 256) {
      sRoughCtx.fillStyle = '#606060'; // smooth damp grooves
      sRoughCtx.fillRect(x - 10, 0, 20, sH);
    }

    const sTex = new THREE.CanvasTexture(sCanvas);
    sTex.wrapS = sTex.wrapT = THREE.RepeatWrapping;
    sTex.repeat.set(18, 1);
    sTex.colorSpace = THREE.SRGBColorSpace;

    const sNormTex = new THREE.CanvasTexture(sNormalCanvas);
    sNormTex.wrapS = sNormTex.wrapT = THREE.RepeatWrapping;
    sNormTex.repeat.set(18, 1);

    const sRoughTex = new THREE.CanvasTexture(sRough);
    sRoughTex.wrapS = sRoughTex.wrapT = THREE.RepeatWrapping;
    sRoughTex.repeat.set(18, 1);

    /* ══════════════════════════════════════════════════════════════════
       2. Authentic 90s Grey Street / Road Walk (Asphalt Tarmac)
       Directly inspired by real street photo: natural medium-grey road stone
       (#62666D), coarse aggregate pebbles, white painted shoulder stripe
       with distressed edges, and bitumen tar-sealed crack repair lines.
       ══════════════════════════════════════════════════════════════════ */
    const aW = 2048;
    const aH = 1024;
    const aCanvas = document.createElement('canvas');
    aCanvas.width = aW;
    aCanvas.height = aH;
    const aCtx = aCanvas.getContext('2d')!;

    // Base authentic stony grey asphalt (#62666D to #5E6269)
    aCtx.fillStyle = '#62666D';
    aCtx.fillRect(0, 0, aW, aH);

    // Natural roadside color variation: lighter grey dust accumulation near shoulder, slightly darker grey vehicle tracks
    const roadGrad = aCtx.createLinearGradient(0, 0, 0, aH);
    roadGrad.addColorStop(0, '#6F747C');   // Near curb/shoulder: lighter dusty stone grey
    roadGrad.addColorStop(0.15, '#666B72');
    roadGrad.addColorStop(0.4, '#585C63'); // Outer wheel track lane
    roadGrad.addColorStop(0.6, '#60646B'); // Center road
    roadGrad.addColorStop(0.8, '#585C63'); // Inner wheel track lane
    roadGrad.addColorStop(1.0, '#6A6F77'); // Far road surface
    aCtx.fillStyle = roadGrad;
    aCtx.fillRect(0, 0, aW, aH);

    // Organic patch variations & road weathering
    for (let i = 0; i < 65; i++) {
      const px = rnd() * aW;
      const py = rnd() * aH;
      const pr = 60 + rnd() * 220;
      const grad = aCtx.createRadialGradient(px, py, 10, px, py, pr);
      grad.addColorStop(0, rnd() > 0.5 ? 'rgba(120, 125, 134, 0.22)' : 'rgba(78, 82, 88, 0.24)');
      grad.addColorStop(1, 'rgba(98, 102, 109, 0.0)');
      aCtx.fillStyle = grad;
      aCtx.beginPath();
      aCtx.arc(px, py, pr, 0, Math.PI * 2);
      aCtx.fill();
    }

    // High-definition stony aggregate texture (white granite specks & dark basalt grains)
    const aData = aCtx.getImageData(0, 0, aW, aH);
    for (let i = 0; i < aData.data.length; i += 4) {
      const n = (rnd() - 0.5) * 32;
      aData.data[i] = Math.max(0, Math.min(255, aData.data[i] + n));
      aData.data[i + 1] = Math.max(0, Math.min(255, aData.data[i + 1] + n));
      aData.data[i + 2] = Math.max(0, Math.min(255, aData.data[i + 2] + n));
    }
    aCtx.putImageData(aData, 0, 0);

    // Coarse macro pebbles embedded in asphalt surface
    for (let i = 0; i < 1200; i++) {
      const bx = rnd() * aW;
      const by = rnd() * aH;
      const br = 1 + rnd() * 2.5;
      aCtx.fillStyle = rnd() > 0.45 ? '#80858E' : '#3E4147';
      aCtx.beginPath();
      aCtx.arc(bx, by, br, 0, Math.PI * 2);
      aCtx.fill();
    }

    // Authentic Worn White Painted Shoulder Line / Roadside Stripe (matching photo)
    // Running parallel to the curb (around Y = 70 to Y = 95)
    aCtx.save();
    aCtx.fillStyle = '#E2E6EC'; // Worn white traffic paint
    aCtx.fillRect(0, 72, aW, 20);

    // Distressed scuffs & road wear cutting into the white painted line
    aCtx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 350; i++) {
      const sx = rnd() * aW;
      const sy = 68 + rnd() * 28;
      const sw = 4 + rnd() * 26;
      const sh = 2 + rnd() * 10;
      aCtx.fillRect(sx, sy, sw, sh);
    }
    aCtx.restore();

    // Re-layer subtle grey dust over the worn white stripe
    aCtx.fillStyle = 'rgba(98, 102, 109, 0.28)';
    aCtx.fillRect(0, 70, aW, 24);

    // Bitumen / Liquid Tar Sealed Crack Lines (snake-like black tar repairs weaving across the road)
    aCtx.strokeStyle = '#282B30'; // Dark tar bitumen
    aCtx.lineCap = 'round';
    aCtx.lineJoin = 'round';
    for (let i = 0; i < 8; i++) {
      let currX = (i / 8) * aW + (rnd() - 0.5) * 150;
      let currY = 40 + rnd() * 120;
      const endY = aH - 40 - rnd() * 100;
      const stepY = (endY - currY) / 28;

      aCtx.beginPath();
      aCtx.moveTo(currX, currY);
      for (let j = 0; j < 28; j++) {
        currX += (rnd() - 0.5) * 45;
        currY += stepY;
        aCtx.lineTo(currX, currY);
      }
      aCtx.lineWidth = 6 + rnd() * 4;
      aCtx.stroke();

      // Inner tar gloss bead
      aCtx.strokeStyle = '#1D1F23';
      aCtx.lineWidth *= 0.6;
      aCtx.stroke();
    }

    // Subtle dark tire track scuffs & rubber wear along lanes
    for (let i = 0; i < 35; i++) {
      const tx = rnd() * aW;
      const ty = 260 + rnd() * 180;
      const tw = 80 + rnd() * 240;
      const th = 12 + rnd() * 25;
      aCtx.fillStyle = 'rgba(42, 45, 50, 0.32)';
      aCtx.fillRect(tx, ty, tw, th);
    }

    // Asphalt Bump/Height canvas -> Normal Map
    const aBump = document.createElement('canvas');
    aBump.width = aW;
    aBump.height = aH;
    const aBumpCtx = aBump.getContext('2d')!;
    aBumpCtx.fillStyle = '#808080';
    aBumpCtx.fillRect(0, 0, aW, aH);
    aBumpCtx.drawImage(aCanvas, 0, 0);
    // Raise white painted line slightly, recess tar cracks slightly
    aBumpCtx.fillStyle = '#A8A8A8';
    aBumpCtx.fillRect(0, 72, aW, 20);
    const aNormalCanvas = heightToNormalCanvas(aBump, aW, 3.8);

    // Asphalt Roughness Map (Stony aggregate matte ~0.76, tar crack lines slightly shiny ~0.35)
    const aRough = document.createElement('canvas');
    aRough.width = aW;
    aRough.height = aH;
    const aRoughCtx = aRough.getContext('2d')!;
    aRoughCtx.fillStyle = '#C2C2C2'; // ~0.76 roughness
    aRoughCtx.fillRect(0, 0, aW, aH);
    aRoughCtx.fillStyle = '#585858'; // shiny tar repair sheen
    for (let i = 0; i < 8; i++) {
      // draw rough tar paths
      aRoughCtx.fillRect((i / 8) * aW, 0, 18, aH);
    }

    const aTex = new THREE.CanvasTexture(aCanvas);
    aTex.wrapS = THREE.RepeatWrapping;
    aTex.wrapT = THREE.ClampToEdgeWrapping;
    aTex.repeat.set(18, 1);
    aTex.colorSpace = THREE.SRGBColorSpace;

    const aNormTex = new THREE.CanvasTexture(aNormalCanvas);
    aNormTex.wrapS = THREE.RepeatWrapping;
    aNormTex.wrapT = THREE.ClampToEdgeWrapping;
    aNormTex.repeat.set(18, 1);

    const aRoughTex = new THREE.CanvasTexture(aRough);
    aRoughTex.wrapS = THREE.RepeatWrapping;
    aRoughTex.wrapT = THREE.ClampToEdgeWrapping;
    aRoughTex.repeat.set(18, 1);

    // 3. Weathered Granite Concrete Curb Texture
    const cCanvas = document.createElement('canvas');
    cCanvas.width = 512;
    cCanvas.height = 64;
    const cCtx = cCanvas.getContext('2d')!;
    cCtx.fillStyle = '#5A5E65';
    cCtx.fillRect(0, 0, 512, 64);
    const cData = cCtx.getImageData(0, 0, 512, 64);
    for (let i = 0; i < cData.data.length; i += 4) {
      const n = (rnd() - 0.5) * 24;
      cData.data[i] = Math.max(0, Math.min(255, cData.data[i] + n));
      cData.data[i + 1] = Math.max(0, Math.min(255, cData.data[i + 1] + n));
      cData.data[i + 2] = Math.max(0, Math.min(255, cData.data[i + 2] + n));
    }
    cCtx.putImageData(cData, 0, 0);
    const cTex = new THREE.CanvasTexture(cCanvas);
    cTex.wrapS = THREE.RepeatWrapping;
    cTex.repeat.set(18, 1);
    cTex.colorSpace = THREE.SRGBColorSpace;

    const res = [sTex, sNormTex, sRoughTex, aTex, aNormTex, aRoughTex, cTex] as const;
    cachedSidewalkTextures = res;
    return res;
  }, []);

  const normalScale = useMemo(() => new THREE.Vector2(1.6, 1.6), []);

  return (
    <group>
      {/* Authentic grey concrete footwalk / sidewalk slab */}
      <mesh position={[0, -0.05, 1.6]} receiveShadow>
        <boxGeometry args={[72, 0.12, 3.2]} />
        <meshStandardMaterial
          map={sidewalkTex}
          normalMap={sidewalkNormalMap}
          normalScale={normalScale}
          roughnessMap={sidewalkRoughnessMap}
          roughness={0.82}
          metalness={0.04}
        />
      </mesh>

      {/* Weathered granite concrete curb edge separating footwalk from road */}
      <mesh position={[0, -0.1, 3.2]} castShadow receiveShadow>
        <boxGeometry args={[72, 0.22, 0.16]} />
        <meshStandardMaterial
          map={curbTex}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>

      {/* Authentic 90s greyish street road below with fine stone aggregate, white shoulder stripe, and tar repairs */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 6]} receiveShadow>
        <planeGeometry args={[72, 10, 64, 8]} />
        <meshStandardMaterial
          map={asphaltTex}
          normalMap={asphaltNormalMap}
          normalScale={normalScale}
          roughnessMap={asphaltRoughnessMap}
          roughness={0.76}
          metalness={0.06}
        />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════
   Scene Assembly
   ═══════════════════════════════════════════════════ */

/**
 * Procedural alley environment.
 */
function AlleyEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const env = buildAlleyEnvironment(gl);
    scene.environment = env;
    scene.environmentIntensity = 1.7;
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene]);

  return null;
}

/**
 * Dev-only handle on the renderer.
 *
 * The scene only draws inside requestAnimationFrame, which never fires while
 * the tab is hidden — so an automated pane can never see a frame. Exposing gl,
 * scene and camera allows a render to be driven synchronously and read back.
 * Remove alongside __wallTex and /api/devshot before shipping.
 */
function DevRenderHandle() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __r3f?: unknown }).__r3f = { gl, scene, camera };
  }, [gl, scene, camera]);

  return null;
}

function Scene({ progressRef, snapToTarget }: { progressRef: React.RefObject<number>; snapToTarget?: boolean }) {
  return (
    <>
      {/* Aerial perspective, neutral. Matches the horizon of the sky dome so
          the far end of the alley dissolves into cloud instead of into a warm
          haze that would reintroduce the golden cast through the back door. */}
      <fog attach="fog" args={['#A6A8A9', 35, 70]} />

      {/* THE KEY LIGHT. Under overcast the sky dome is the source, so almost
          all illumination arrives from here as image-based lighting rather than
          from discrete lights. See buildAlleyEnvironment. */}
      <AlleyEnvironment />
      <DevRenderHandle />

      {/* ── Overcast daylight rig ──────────────────────────────────────────
          What this replaces: a 2.0-intensity #FFD060 "golden morning sun" at
          y=5 raking long shadows, a warm sky fill, a 75 spotlight, and five
          #FFD890 sodium lamps at 32–38. That rig was every single item on the
          reference's avoid list at once — golden orange light, strong shadows,
          an HDRI sunset look and dramatic highlights.

          It also explains the cool bake we just undid. The albedo had been
          graded blue to fight all this amber. Remove the amber and the
          compensation has to come off too, or the wall goes cold. Light and
          albedo were dragging each other in opposite directions; now neither
          has to.                                                            */}

      {/* Whisper of neutral fill. The env already lights everything, but deep
          cavities receive almost nothing from a dome and would crush to black —
          and crushed blacks are contrast, which the brief rules out. */}
      <ambientLight intensity={0.46} color="#DFE2E2" />

      {/* Not a sun. A weak, nearly-overhead neutral light that exists only so
          solid props (bins, pipes, railings) drop a soft contact shadow and
          stay attached to the ground. High angle keeps shadows short and
          directly under things, the way they behave under a cloud deck; at 0.6
          it grounds objects without ever reading as a light source. */}
      <directionalLight
        position={[8, 22, 10]}
        intensity={0.6}
        color="#E6E9E9"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={20}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0008}
      />

      {/* Dim sodium lamps for neon light effect with little brightness */}
      {[-24, -13, -2, 9, 21].map((x, i) => (
        <pointLight
          key={`lamp-${i}`}
          position={[x, 5.5, 2]}
          color="#FFD890"
          intensity={3}
          distance={18}
          decay={2}
        />
      ))}

      {/* Camera rig. The cursor-tracked flashlight that used to live here is
          gone: a torch pool chasing the mouse is the opposite of "naturally
          photographed", and it was the brightest thing in a frame that is
          supposed to be evenly lit. The sky dome's zenith-to-horizon ramp is
          what reveals the surface now. */}
      <InteractiveCameraRig progressRef={progressRef} snapToTarget={snapToTarget} />

      {/* Architectural Wall, Decals & Street Depth */}
      <WeatheredUrbanStreetWall />
      <WallDecalsAndGrime />
      <CyanNeonTube3D />
      <NeonAlleySign3D />
      <AlleyIndustrialDetails />
      <AlleyDepthLayers />
      <WetSidewalkAndStreet />
      <UrbanStreetFloor />
      <StreetTrashCans />

      {/* Right-Side Balance: Architectural Utility Platform & Balcony */}
      <RightSideAlleyDetail />

      {/* Large Authentic Wheat-Pasted Posters */}
      {events.map((event, i) => (
        <Suspense key={event.id} fallback={null}>
          <EventPoster3D
            posterImage={event.posterImage}
            position={event.position}
            rotation={event.rotation}
            scale={event.scale}
            variant={i}
          />
        </Suspense>
      ))}

      {/* Authentic Spray Paint Graffiti with Archival Stencil Typography — positioned cleanly between posters */}
      <GraffitiTag text="EVENTS" subtext="UNDERGROUND TECH ARCHIVE // EST. 1994" color="#4E9AA4" accentColor="#37727E" position={[-26.0, 2.4, 0.010]} rotation={[0, 0, -0.02]} tagScale={0.86} />
      <GraffitiTag text="GDG" subtext="CRCE // SYNÉCHEIA // ALL ERAS" color="#B04A6B" accentColor="#6E2A42" position={[-14.5, 2.45, 0.010]} rotation={[0, 0, 0.03]} tagScale={0.86} />
      <GraffitiTag text="MTV" subtext="UNPLUGGED // ARCHIVE SER. 04" color="#4E9AA4" accentColor="#2F5A68" position={[-3.8, 2.4, 0.010]} rotation={[0, 0, -0.03]} tagScale={0.86} />
      <GraffitiTag text="90s" subtext="CONTINUITY // EVOLUTION // LEGACY" color="#C29A46" accentColor="#7E4E22" position={[7.35, 2.45, 0.010]} rotation={[0, 0, 0.04]} tagScale={0.84} />
      <GraffitiTag text="HACK" subtext="BYTE CLUB // OPEN SYNDICATE" color="#7F519B" accentColor="#43265C" position={[18.65, 2.4, 0.010]} rotation={[0, 0, -0.03]} tagScale={0.84} />

      {/* Airborne dust. Was 75 motes at size 1.8 / opacity 0.25 in near-white —
          which reads as fairy sparkles, an asset-store tell. Real dust is only
          visible when it crosses a beam: tiny, dim, and warm-grey. */}
      <Sparkles
        count={40}
        scale={[65, 6, 7]}
        size={0.7}
        speed={0.12}
        color="#C9BCA6"
        opacity={0.09}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════
   WallScene Public Component
   ═══════════════════════════════════════════════════ */

interface WallSceneProps {
  progressRef: React.RefObject<number>;
  snapToTarget?: boolean;
}

export default function WallScene({ progressRef, snapToTarget }: WallSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  // Ceiling DPR = the previously-tuned max, but never oversample a 1x display
  // (the old dpr={[1,1.5]} let R3F pick this; a fixed 1.5 would render 1.5x on a
  // plain 1080p panel for nothing). Adaptive quality only ever steps DOWN from here.
  const maxDpr = useRef(typeof window !== 'undefined' ? Math.min(1.5, window.devicePixelRatio || 1) : 1.5);
  const [dpr, setDpr] = useState(maxDpr.current);

  // Pause the whole WebGL frame loop while the Events act is off screen. The
  // Canvas otherwise renders continuously from page load — burning GPU through
  // Hero/About/WhatWeDo where it isn't even visible. rootMargin activates it
  // just before it scrolls in, so the fullscreen-wall entrance is never blank.
  const [active, setActive] = useState(true);
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      rootMargin: '600px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={hostRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
      <Canvas
        frameloop={active ? 'always' : 'never'}
        /* Do NOT let the canvas re-measure itself on scroll.
           R3F measures through react-use-measure, which reads
           getBoundingClientRect() — and a bounding rect INCLUDES every
           ancestor transform. This canvas lives inside
           `.xp-events-transition-window`, which EventsAndCouncilSection
           shrinks into the Media Player frame with `transform: scale(0.66)`.
           So the moment a scroll re-measure landed while that scale was
           applied, the canvas was sized to 66% of its container — and since
           the canvas is inside the same scaled element, it rendered at 66% of
           the window with the Canvas wrapper's #A6A8A9 showing through the rest.
           That is the grey L-shape, and it stayed until a later debounced
           measure happened to catch the transform back at 1.
           The layout box never changes (100vw × 100vh), so there is nothing
           legitimate for a scroll measure to find here anyway. */
        resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
        camera={{ position: [-26, 2.1, 4.4], fov: 62 }}
        dpr={dpr}
        shadows="soft"
        gl={{ antialias: true, powerPreference: 'high-performance', toneMappingExposure: 1.15 }}
        style={{
          width: '100%',
          height: '100%',
          // Matches the fog and the sky dome's horizon. A dark warm brown here
          // showed through as a night-alley edge around a daylit scene.
          background: '#A6A8A9',
          cursor: 'crosshair',
        }}
      >
        {/* Adaptive quality: hold the tuned look as the ceiling and only drop
            resolution on sustained frame-rate decline, recovering when headroom
            returns. flipflops settles at the floor instead of oscillating. */}
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => setDpr((d) => Math.max(0.75, Math.round((d - 0.25) * 100) / 100))}
          onIncline={() => setDpr((d) => Math.min(maxDpr.current, Math.round((d + 0.25) * 100) / 100))}
          onFallback={() => setDpr(0.75)}
        />
        <Suspense fallback={null}>
          <Scene progressRef={progressRef} snapToTarget={snapToTarget} />
        </Suspense>
      </Canvas>
    </div>
  );
}

'use client';

import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import EventPoster3D from './EventPoster3D';
import { events } from '@/components/sections/events/eventData';
import {
  RightSideAlleyDetail,
  WallDecalsAndGrime,
  AlleyDepthLayers,
  UrbanStreetFloor,
} from './AlleyProps3D';

/* ═══════════════════════════════════════════════════
   Module-level Texture Cache
   Enables instantaneous sharing of heavy procedural canvas
   textures when WallScene mounts across multiple sections.
   ═══════════════════════════════════════════════════ */
let cachedWallTextures: readonly [THREE.CanvasTexture, THREE.CanvasTexture, THREE.CanvasTexture] | null = null;
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
   Height-map → Tangent-space Normal Map
   Derives real per-pixel surface direction from the same
   canvas used for relief, so raking light actually reads
   mortar joints, cracks & peeling edges instead of a flat print.
   ═══════════════════════════════════════════════════ */

function heightCanvasToNormalMap(
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
  const heightData = hCtx.getImageData(0, 0, w, h).data;
  const getH = (x: number, y: number) => {
    const xi = (x + w) % w;
    const yi = (y + h) % h;
    return heightData[(yi * w + xi) * 4] / 255;
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
   Interactive Handheld Inspection Flashlight
   Smoothly tracks cursor across wall & posters
   ═══════════════════════════════════════════════════ */

function HandheldFlashlight({ progressRef }: { progressRef: React.RefObject<number> }) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state, delta) => {
    if (!lightRef.current) return;
    const p = progressRef.current ?? 0;
    const camX = THREE.MathUtils.lerp(-24, 23, p);

    // Map pointer coords (-1..1) to wall surface position
    const targetX = camX + state.pointer.x * 3.5;
    const targetY = 2.3 + state.pointer.y * 2.2;

    const smoothing = 1 - Math.pow(0.0002, delta);
    lightRef.current.position.x += (targetX - lightRef.current.position.x) * smoothing;
    lightRef.current.position.y += (targetY - lightRef.current.position.y) * smoothing;
  });

  return (
    <pointLight
      ref={lightRef}
      position={[-24, 2.3, 2.8]}
      color="#FFF4E0"
      intensity={20}
      distance={9}
      decay={2}
    />
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
    // Controlled neon electrical flicker (#3 in lighting hierarchy)
    const flicker = Math.random() > 0.94 ? 0.35 : 1.0;
    const pulse = 0.88 + Math.sin(t * 3.5) * 0.12;
    const intensity = flicker * pulse;

    if (lightRef.current) lightRef.current.intensity = 110 * intensity;
    if (matRef.current) matRef.current.emissiveIntensity = 1.2 * intensity;
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
          emissiveIntensity={1.2}
          roughness={0.2}
        />
      </mesh>

      {/* Controlled Neon Light (#3 in hierarchy) */}
      <pointLight
        ref={lightRef}
        position={[0, 0, 1.4]}
        color="#FF0055"
        intensity={110}
        distance={11}
        decay={2}
      />
    </group>
  );
}

/* ═══════════════════════════════════════════════════
   Authentic Distressed Urban Concrete & Peeling Plaster Wall
   Directly matching reference images: layered peeling stucco,
   exposed aged concrete substrate, deep structural cracks & grime
   ═══════════════════════════════════════════════════ */

function WeatheredUrbanStreetWall() {
  const [colorMap, normalMap, displacementMap] = useMemo(() => {
    if (cachedWallTextures) return cachedWallTextures;

    const W = 2048;
    const H = 1024;

    const cCanvas = document.createElement('canvas');
    cCanvas.width = W;
    cCanvas.height = H;
    const cCtx = cCanvas.getContext('2d')!;

    /* 1. Base Foundation: Complete Red/Warm-Brown Brickwork across entire wall (as shown in reference image) */
    cCtx.fillStyle = '#2A1A16'; // Dark mortar base
    cCtx.fillRect(0, 0, W, H);

    const brickW = 44;
    const brickH = 20;
    const cols = Math.ceil(W / (brickW + 4));
    const rows = Math.ceil(H / (brickH + 4));
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * ((brickW + 4) / 2);
      for (let c = 0; c < cols; c++) {
        const bx = c * (brickW + 4) + offset - (brickW + 4);
        const by = r * (brickH + 4);
        const tone = (r * 11 + c * 7) % 5;
        const colors = ['#A84432', '#983A2A', '#8A3424', '#7C2C1E', '#62241A'];
        cCtx.fillStyle = colors[tone];
        cCtx.fillRect(bx, by, brickW, brickH);
      }
    }

    /* 2. Topcoat Concrete & Stucco Layer ("the texture we currently have") drawn on a layer that cracks open */
    const topCanvas = document.createElement('canvas');
    topCanvas.width = W;
    topCanvas.height = H;
    const topCtx = topCanvas.getContext('2d')!;

    // Earthy muddy taupe / grimy urban concrete
    const baseGrad = topCtx.createLinearGradient(0, 0, 0, H);
    baseGrad.addColorStop(0, '#4E4944');
    baseGrad.addColorStop(0.6, '#46413C');
    baseGrad.addColorStop(1, '#34302C');
    topCtx.fillStyle = baseGrad;
    topCtx.fillRect(0, 0, W, H);

    // Peeling 90s Muddy Stucco & Bone/Putty Plaster Topcoat Layer
    const peelingPatches = [
      { cx: 300, cy: 350, rx: 280, ry: 240 },
      { cx: 780, cy: 520, rx: 340, ry: 310 },
      { cx: 1350, cy: 410, rx: 320, ry: 280 },
      { cx: 1820, cy: 600, rx: 290, ry: 260 },
      { cx: 520, cy: 820, rx: 260, ry: 180 },
      { cx: 1100, cy: 220, rx: 280, ry: 190 },
      { cx: 1650, cy: 250, rx: 260, ry: 210 },
    ];

    peelingPatches.forEach((p) => {
      topCtx.save();
      topCtx.beginPath();
      const points = 24;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const radiusNoise = 1 + Math.sin(angle * 5) * 0.18 + Math.cos(angle * 9) * 0.12;
        const x = p.cx + Math.cos(angle) * p.rx * radiusNoise;
        const y = p.cy + Math.sin(angle) * p.ry * radiusNoise;
        if (i === 0) topCtx.moveTo(x, y);
        else topCtx.lineTo(x, y);
      }
      topCtx.closePath();

      topCtx.shadowColor = 'rgba(12, 11, 10, 0.65)';
      topCtx.shadowBlur = 10;
      topCtx.shadowOffsetX = 3;
      topCtx.shadowOffsetY = 4;

      const grad = topCtx.createLinearGradient(p.cx - p.rx, p.cy - p.ry, p.cx + p.rx, p.cy + p.ry);
      grad.addColorStop(0, '#8E867A');
      grad.addColorStop(0.5, '#7F786D');
      grad.addColorStop(1, '#6E675D');
      topCtx.fillStyle = grad;
      topCtx.fill();
      topCtx.restore();

      topCtx.strokeStyle = 'rgba(210, 202, 188, 0.45)';
      topCtx.lineWidth = 2.0;
      topCtx.stroke();
    });

    // Institutional Under-layer Paint Patches & Flaking Chips
    for (let i = 0; i < 65; i++) {
      const px = Math.random() * W;
      const py = Math.random() * H;
      const pr = 12 + Math.random() * 45;
      topCtx.fillStyle = Math.random() > 0.5 ? 'rgba(68, 76, 72, 0.85)' : 'rgba(92, 86, 76, 0.88)';
      topCtx.beginPath();
      topCtx.arc(px, py, pr, 0, Math.PI * 2);
      topCtx.fill();
    }

    /* 3. Cut out cracks & chipped openings right through topcoat to reveal the brick foundation below */
    topCtx.save();
    topCtx.globalCompositeOperation = 'destination-out';
    topCtx.lineCap = 'round';
    topCtx.lineJoin = 'round';

    const cutoutCrack = (startX: number, startY: number, endY: number, branches: number) => {
      let currX = startX;
      let currY = startY;
      const stepY = (endY - startY) / 32;

      topCtx.beginPath();
      topCtx.moveTo(currX, currY);
      for (let i = 0; i < 32; i++) {
        currX += (Math.random() - 0.5) * 24;
        currY += stepY;
        topCtx.lineTo(currX, currY);

        if (branches > 0 && Math.random() > 0.75) {
          const bx = currX + (Math.random() - 0.5) * 110;
          const by = currY + 40 + Math.random() * 80;
          topCtx.moveTo(currX, currY);
          topCtx.lineTo(bx, by);
          topCtx.moveTo(currX, currY);
        }
      }
      topCtx.lineWidth = 6.5; // Wide enough to clearly see the red bricks through the crack
      topCtx.stroke();

      // Jagged spall breakout holes along the crack exposing red brick
      if (branches > 0) {
        topCtx.beginPath();
        let bx = startX;
        let by = startY + (endY - startY) * 0.4;
        topCtx.moveTo(bx - 18, by);
        for (let i = 0; i < 16; i++) {
          bx += (Math.random() - 0.5) * 20;
          by += stepY;
          topCtx.lineTo(bx + (Math.random() - 0.5) * 15, by);
        }
        for (let i = 16; i >= 0; i--) {
          bx -= (Math.random() - 0.5) * 20;
          by -= stepY;
          topCtx.lineTo(bx - 20 - Math.random() * 10, by);
        }
        topCtx.closePath();
        topCtx.fill();
      }
    };

    for (let i = 0; i < 11; i++) {
      const sx = 90 + i * 175 + (Math.random() - 0.5) * 50;
      cutoutCrack(sx, 20 + Math.random() * 80, H - 20, i % 2 === 0 ? 1 : 0);
    }
    topCtx.restore();

    /* 4. Layer the topcoat with cracked cutouts right onto the red brick foundation */
    cCtx.save();
    cCtx.shadowColor = 'rgba(10, 8, 8, 0.85)';
    cCtx.shadowBlur = 8;
    cCtx.shadowOffsetX = 2;
    cCtx.shadowOffsetY = 3;
    cCtx.drawImage(topCanvas, 0, 0);
    cCtx.restore();

    /* 5. Muddy 90s Street Splash Zone along Bottom Wall Curb (Lower 25%) */
    const splashGrad = cCtx.createLinearGradient(0, H * 0.72, 0, H);
    splashGrad.addColorStop(0, 'rgba(28, 24, 20, 0.0)');
    splashGrad.addColorStop(0.5, 'rgba(28, 24, 20, 0.55)');
    splashGrad.addColorStop(1, 'rgba(22, 18, 15, 0.88)');
    cCtx.fillStyle = splashGrad;
    cCtx.fillRect(0, H * 0.72, W, H * 0.28);

    // Muddy splatter droplets splashed up from street rain
    cCtx.fillStyle = 'rgba(24, 20, 16, 0.82)';
    for (let i = 0; i < 350; i++) {
      const sx = Math.random() * W;
      const sy = H * 0.68 + Math.random() * (H * 0.32);
      const sr = 1.5 + Math.random() * 5.5;
      cCtx.beginPath();
      cCtx.arc(sx, sy, sr, 0, Math.PI * 2);
      cCtx.fill();
    }

    /* 6. Rust Bleed Streaks & Efflorescence (Mineral Salt Bleed) */
    for (let i = 0; i < 28; i++) {
      const rx = Math.random() * W;
      const ry = Math.random() * (H * 0.35);
      const rw = 4 + Math.random() * 12;
      const rh = 120 + Math.random() * 320;
      const rGrad = cCtx.createLinearGradient(rx, ry, rx, ry + rh);
      rGrad.addColorStop(0, 'rgba(118, 48, 28, 0.62)'); // Warm 90s rust iron bleed
      rGrad.addColorStop(1, 'rgba(118, 48, 28, 0.0)');
      cCtx.fillStyle = rGrad;
      cCtx.fillRect(rx, ry, rw, rh);
    }

    /* 7. Staple Scars, Old Glue Residue & Torn Flyer Scraps */
    cCtx.fillStyle = 'rgba(195, 178, 135, 0.22)';
    for (let i = 0; i < 32; i++) {
      cCtx.fillRect(Math.random() * W, Math.random() * H, 45 + Math.random() * 80, 60 + Math.random() * 100);
    }

    /* 8. High-Definition Concrete Aggregate Grain & Grunge Noise */
    const imgData = cCtx.getImageData(0, 0, W, H);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 26;
      imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + n));
      imgData.data[i + 1] = Math.max(0, Math.min(255, imgData.data[i + 1] + n));
      imgData.data[i + 2] = Math.max(0, Math.min(255, imgData.data[i + 2] + n));
    }
    cCtx.putImageData(imgData, 0, 0);

    const cTex = new THREE.CanvasTexture(cCanvas);
    cTex.wrapS = cTex.wrapT = THREE.RepeatWrapping;
    cTex.repeat.set(4, 1.2);
    cTex.colorSpace = THREE.SRGBColorSpace;

    /* 9. Ultra-Tactile High-Relief Bump / Normal Map */
    const bCanvas = document.createElement('canvas');
    bCanvas.width = W;
    bCanvas.height = H;
    const bCtx = bCanvas.getContext('2d')!;
    bCtx.fillStyle = '#606060'; // Deeper base relief level for brick foundation
    bCtx.fillRect(0, 0, W, H);

    // Elevated topcoat regions
    bCtx.drawImage(topCanvas, 0, 0);
    peelingPatches.forEach((p) => {
      bCtx.beginPath();
      const points = 24;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const radiusNoise = 1 + Math.sin(angle * 5) * 0.18 + Math.cos(angle * 9) * 0.12;
        const x = p.cx + Math.cos(angle) * p.rx * radiusNoise;
        const y = p.cy + Math.sin(angle) * p.ry * radiusNoise;
        if (i === 0) bCtx.moveTo(x, y);
        else bCtx.lineTo(x, y);
      }
      bCtx.closePath();
      bCtx.fillStyle = '#A6A6A6';
      bCtx.fill();
    });

    // Deep structural crack grooves
    const drawBumpCrack = (startX: number, startY: number, endY: number) => {
      let currX = startX;
      let currY = startY;
      const stepY = (endY - startY) / 32;
      bCtx.beginPath();
      bCtx.moveTo(currX, currY);
      for (let i = 0; i < 32; i++) {
        currX += (Math.random() - 0.5) * 22;
        currY += stepY;
        bCtx.lineTo(currX, currY);
      }
      bCtx.strokeStyle = '#111111';
      bCtx.lineWidth = 3.8;
      bCtx.stroke();
    };

    for (let i = 0; i < 11; i++) {
      const sx = 90 + i * 175;
      drawBumpCrack(sx, 20, H - 20);
    }

    /* 10. Fine per-pixel Normal Map — derived from the relief canvas above so
       mortar joints, crack lips & peeling edges catch raking light correctly */
    const normalCanvas = heightCanvasToNormalMap(bCanvas, 1024, 2.6);
    const nTex = new THREE.CanvasTexture(normalCanvas);
    nTex.wrapS = nTex.wrapT = THREE.RepeatWrapping;
    nTex.repeat.set(4, 1.2);

    /* 11. Coarse Displacement Map — same relief data downsampled so the
       peeling patches physically bulge and cracks physically recess,
       giving real parallax as the camera walks past instead of flat shading */
    const dCanvas = document.createElement('canvas');
    dCanvas.width = 512;
    dCanvas.height = 256;
    dCanvas.getContext('2d')!.drawImage(bCanvas, 0, 0, 512, 256);
    const dTex = new THREE.CanvasTexture(dCanvas);
    dTex.wrapS = dTex.wrapT = THREE.RepeatWrapping;
    dTex.repeat.set(4, 1.2);

    cachedWallTextures = [cTex, nTex, dTex] as const;
    return cachedWallTextures;
  }, []);

  const normalScale = useMemo(() => new THREE.Vector2(1.5, 1.5), []);

  return (
    <mesh position={[0, 3.8, 0]} receiveShadow>
      <planeGeometry args={[68, 9.6, 160, 40]} />
      <meshStandardMaterial
        map={colorMap}
        normalMap={normalMap}
        normalScale={normalScale}
        displacementMap={displacementMap}
        displacementScale={0.3}
        displacementBias={-0.113}
        roughness={0.92}
        metalness={0.04}
      />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════
   Authentic Layered Spray Paint Graffiti Tags
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

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 512, 256);

    ctx.save();
    ctx.font = '900 italic 92px Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. Dark stencil outline for crisp contrast against brick
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    ctx.strokeStyle = '#0E0812';
    ctx.lineWidth = 12;
    ctx.strokeText(text, 256, 112);

    // 2. Pure matte aerosol spray fill without glowing neon drop-shadow (#1 Everything glows fix)
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.fillText(text, 256, 112);

    // 4. Realistic spray paint drips running down the brick wall
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const dx = 110 + i * 52 + (Math.random() - 0.5) * 20;
      const startY = 145 + Math.random() * 10;
      const dripLen = 25 + Math.random() * 55;
      ctx.lineWidth = 2.5 + Math.random() * 2.5;

      ctx.beginPath();
      ctx.moveTo(dx, startY);
      ctx.lineTo(dx, startY + dripLen);
      ctx.stroke();

      // Drip bead at bottom
      ctx.beginPath();
      ctx.arc(dx, startY + dripLen, ctx.lineWidth * 0.85, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // 5. Masonry texture absorption & aerosol speckles
    for (let i = 0; i < 450; i++) {
      const px = 60 + Math.random() * 390;
      const py = 50 + Math.random() * 180;
      ctx.fillStyle = Math.random() > 0.5 ? color : accentColor;
      ctx.globalAlpha = Math.random() * 0.35;
      ctx.fillRect(px, py, 2, 2);
    }
    ctx.restore();

    if (subtext) {
      ctx.save();
      // Industrial stencil border stamp (#8 Typography upgrade)
      ctx.strokeStyle = 'rgba(235, 228, 218, 0.42)';
      ctx.lineWidth = 2;
      ctx.strokeRect(48, 178, 416, 36);

      // Authentic letterpress / stencil tracking
      ctx.font = 'bold 18px "Courier New", Impact, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#E8E2D6';
      ctx.shadowBlur = 0; // Crisp matte stencil ink
      ctx.fillText(subtext.toUpperCase(), 256, 196);
      ctx.restore();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    cachedGraffitiTextures.set(cacheKey, tex);
    return tex;
  }, [text, subtext, color, accentColor]);

  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <planeGeometry args={[4.2 * tagScale, 2.1 * tagScale]} />
      <meshStandardMaterial
        map={texture}
        transparent={true}
        alphaTest={0.01}
        roughness={0.94}
        metalness={0.02}
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
      const px = Math.random() * sW;
      const py = Math.random() * sH;
      const pr = 40 + Math.random() * 140;
      const grad = sCtx.createRadialGradient(px, py, 10, px, py, pr);
      grad.addColorStop(0, Math.random() > 0.5 ? 'rgba(122, 127, 136, 0.18)' : 'rgba(92, 96, 103, 0.22)');
      grad.addColorStop(1, 'rgba(108, 113, 120, 0.0)');
      sCtx.fillStyle = grad;
      sCtx.beginPath();
      sCtx.arc(px, py, pr, 0, Math.PI * 2);
      sCtx.fill();
    }

    // High-definition concrete aggregate grain
    const sData = sCtx.getImageData(0, 0, sW, sH);
    for (let i = 0; i < sData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 28;
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
      const gx = Math.random() * sW;
      const gy = Math.random() * sH;
      const gr = 3 + Math.random() * 8;
      sCtx.fillStyle = Math.random() > 0.4 ? '#2E3136' : '#8B8F96';
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
    const sNormalCanvas = heightCanvasToNormalMap(sBump, sW, 3.2);

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
      const px = Math.random() * aW;
      const py = Math.random() * aH;
      const pr = 60 + Math.random() * 220;
      const grad = aCtx.createRadialGradient(px, py, 10, px, py, pr);
      grad.addColorStop(0, Math.random() > 0.5 ? 'rgba(120, 125, 134, 0.22)' : 'rgba(78, 82, 88, 0.24)');
      grad.addColorStop(1, 'rgba(98, 102, 109, 0.0)');
      aCtx.fillStyle = grad;
      aCtx.beginPath();
      aCtx.arc(px, py, pr, 0, Math.PI * 2);
      aCtx.fill();
    }

    // High-definition stony aggregate texture (white granite specks & dark basalt grains)
    const aData = aCtx.getImageData(0, 0, aW, aH);
    for (let i = 0; i < aData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 32;
      aData.data[i] = Math.max(0, Math.min(255, aData.data[i] + n));
      aData.data[i + 1] = Math.max(0, Math.min(255, aData.data[i + 1] + n));
      aData.data[i + 2] = Math.max(0, Math.min(255, aData.data[i + 2] + n));
    }
    aCtx.putImageData(aData, 0, 0);

    // Coarse macro pebbles embedded in asphalt surface
    for (let i = 0; i < 1200; i++) {
      const bx = Math.random() * aW;
      const by = Math.random() * aH;
      const br = 1 + Math.random() * 2.5;
      aCtx.fillStyle = Math.random() > 0.45 ? '#80858E' : '#3E4147';
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
      const sx = Math.random() * aW;
      const sy = 68 + Math.random() * 28;
      const sw = 4 + Math.random() * 26;
      const sh = 2 + Math.random() * 10;
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
      let currX = (i / 8) * aW + (Math.random() - 0.5) * 150;
      let currY = 40 + Math.random() * 120;
      const endY = aH - 40 - Math.random() * 100;
      const stepY = (endY - currY) / 28;

      aCtx.beginPath();
      aCtx.moveTo(currX, currY);
      for (let j = 0; j < 28; j++) {
        currX += (Math.random() - 0.5) * 45;
        currY += stepY;
        aCtx.lineTo(currX, currY);
      }
      aCtx.lineWidth = 6 + Math.random() * 4;
      aCtx.stroke();

      // Inner tar gloss bead
      aCtx.strokeStyle = '#1D1F23';
      aCtx.lineWidth *= 0.6;
      aCtx.stroke();
    }

    // Subtle dark tire track scuffs & rubber wear along lanes
    for (let i = 0; i < 35; i++) {
      const tx = Math.random() * aW;
      const ty = 260 + Math.random() * 180;
      const tw = 80 + Math.random() * 240;
      const th = 12 + Math.random() * 25;
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
    const aNormalCanvas = heightCanvasToNormalMap(aBump, aW, 3.8);

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
      const n = (Math.random() - 0.5) * 24;
      cData.data[i] = Math.max(0, Math.min(255, cData.data[i] + n));
      cData.data[i + 1] = Math.max(0, Math.min(255, cData.data[i + 1] + n));
      cData.data[i + 2] = Math.max(0, Math.min(255, cData.data[i + 2] + n));
    }
    cCtx.putImageData(cData, 0, 0);
    const cTex = new THREE.CanvasTexture(cCanvas);
    cTex.wrapS = THREE.RepeatWrapping;
    cTex.repeat.set(18, 1);
    cTex.colorSpace = THREE.SRGBColorSpace;

    cachedSidewalkTextures = [sTex, sNormTex, sRoughTex, aTex, aNormTex, aRoughTex, cTex] as const;
    return cachedSidewalkTextures;
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

function HeroCenterSpotlight() {
  const targetRef = useRef<THREE.Object3D>(null);

  return (
    <group position={[-1.0, 6.2, 3.2]}>
      <object3D ref={targetRef} position={[-1.0, 2.45, 0]} />
      {/* Hero #1 (Brightest Object): Center Poster Theater Halogen Spotlight */}
      <spotLight
        target={targetRef.current || undefined}
        color="#FFF4DE"
        intensity={360}
        angle={0.65}
        penumbra={0.42}
        distance={14}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={14}
        shadow-bias={-0.0015}
      />
      {/* Center hero pool reinforcement */}
      <pointLight position={[-1.0, 2.5, 2.1]} color="#FFF2DB" intensity={180} distance={8} decay={2} />
    </group>
  );
}

function Scene({ progressRef, snapToTarget }: { progressRef: React.RefObject<number>; snapToTarget?: boolean }) {
  return (
    <>
      <fog attach="fog" args={['#141113', 18, 48]} />

      {/* Balanced atmospheric fill so masonry & details are beautifully defined and legible */}
      <ambientLight intensity={0.42} color="#FAF0E6" />
      <directionalLight
        position={[3, 12, 8]}
        intensity={1.35}
        color="#F5E4C3"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={20}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0012}
      />

      {/* Hero #1: Center Poster Spotlight */}
      <HeroCenterSpotlight />

      {/* Controlled Overhead Streetlamp Pools */}
      <pointLight position={[-22, 6.5, 3.5]} color="#FFB653" intensity={210} distance={22} decay={2} />
      <pointLight position={[-11, 6.8, 3.5]} color="#FFB653" intensity={200} distance={22} decay={2} />
      <pointLight position={[0, 6.5, 3.5]} color="#FFB653" intensity={230} distance={22} decay={2} />
      <pointLight position={[11, 6.8, 3.5]} color="#FFB653" intensity={200} distance={22} decay={2} />
      <pointLight position={[22, 6.5, 3.5]} color="#FFB653" intensity={210} distance={22} decay={2} />

      {/* Interactive First-Person Human Camera + Handheld Flashlight */}
      <InteractiveCameraRig progressRef={progressRef} snapToTarget={snapToTarget} />
      <HandheldFlashlight progressRef={progressRef} />

      {/* Architectural Wall, Decals & Street Depth */}
      <WeatheredUrbanStreetWall />
      <WallDecalsAndGrime />
      <NeonAlleySign3D />
      <AlleyIndustrialDetails />
      <AlleyDepthLayers />
      <WetSidewalkAndStreet />
      <UrbanStreetFloor />
      <StreetTrashCans />

      {/* Right-Side Balance: Architectural Utility Platform & Balcony */}
      <RightSideAlleyDetail />

      {/* Large Authentic Wheat-Pasted Posters */}
      {events.map((event) => (
        <Suspense key={event.id} fallback={null}>
          <EventPoster3D
            posterImage={event.posterImage}
            position={event.position}
            rotation={event.rotation}
            scale={event.scale}
          />
        </Suspense>
      ))}

      {/* Authentic Spray Paint Graffiti with Archival Stencil Typography — positioned cleanly between posters */}
      <GraffitiTag text="EVENTS" subtext="UNDERGROUND TECH ARCHIVE // EST. 1994" color="#00E5FF" accentColor="#00A8CC" position={[-26.0, 2.4, 0.105]} rotation={[0, 0, -0.02]} tagScale={0.86} />
      <GraffitiTag text="GDG" subtext="CRCE // SUNÉKHEIA // ALL ERAS" color="#FF007F" accentColor="#990044" position={[-14.5, 2.45, 0.105]} rotation={[0, 0, 0.03]} tagScale={0.86} />
      <GraffitiTag text="MTV" subtext="UNPLUGGED // ARCHIVE SER. 04" color="#00E5FF" accentColor="#006688" position={[-3.8, 2.4, 0.105]} rotation={[0, 0, -0.03]} tagScale={0.86} />
      <GraffitiTag text="90s" subtext="CONTINUITY // EVOLUTION // LEGACY" color="#FFBB00" accentColor="#AA5500" position={[7.35, 2.45, 0.105]} rotation={[0, 0, 0.04]} tagScale={0.84} />
      <GraffitiTag text="HACK" subtext="BYTE CLUB // OPEN SYNDICATE" color="#BF00FF" accentColor="#550088" position={[18.65, 2.4, 0.105]} rotation={[0, 0, -0.03]} tagScale={0.84} />

      {/* Rising Street Steam & Dust Motes */}
      <Sparkles
        count={75}
        scale={[65, 7, 8]}
        size={1.8}
        speed={0.2}
        color="#EADDC7"
        opacity={0.25}
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
  return (
    <Canvas
      camera={{ position: [-26, 2.1, 4.4], fov: 62 }}
      dpr={[1, 1.5]}
      shadows="soft"
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#161315',
        cursor: 'crosshair',
      }}
    >
      <Suspense fallback={null}>
        <Scene progressRef={progressRef} snapToTarget={snapToTarget} />
      </Suspense>
    </Canvas>
  );
}

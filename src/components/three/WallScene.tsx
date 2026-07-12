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
   Interactive Human Camera Rig — Stride + Mouse Look
   ═══════════════════════════════════════════════════ */

function InteractiveCameraRig({ progressRef }: { progressRef: React.RefObject<number> }) {
  const { camera } = useThree();
  const lookTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const p = progressRef.current ?? 0;
    // Base walking X position along wall (-24 -> 23)
    const targetX = THREE.MathUtils.lerp(-24, 23, p);

    const smoothing = 1 - Math.pow(0.0001, delta);
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

    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <group position={[-14, 5.8, 0.15]} rotation={[0, 0, -0.04]}>
      {/* Scaled down 14% to avoid billboard oversized feel */}
      <mesh>
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
   Procedural Old Broken Brick & Crumbling Plaster Wall
   ═══════════════════════════════════════════════════ */

function OldBrokenBrickWall() {
  const [colorMap, bumpMap] = useMemo(() => {
    const W = 1024;
    const H = 1024;
    const brickW = 44;
    const brickH = 20;
    const mortar = 3;
    const rows = Math.ceil(H / (brickH + mortar));
    const cols = Math.ceil(W / (brickW + mortar)) + 2;

    const cCanvas = document.createElement('canvas');
    cCanvas.width = W;
    cCanvas.height = H;
    const cCtx = cCanvas.getContext('2d')!;

    cCtx.fillStyle = '#3A322C';
    cCtx.fillRect(0, 0, W, H);

    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (brickW / 2);
      for (let c = -1; c < cols; c++) {
        const x = c * (brickW + mortar) + offset;
        const y = r * (brickH + mortar);

        let br = 125 + Math.random() * 45 - 20;
        let bg = 58 + Math.random() * 25 - 12;
        let bb = 42 + Math.random() * 20 - 10;

        if (Math.random() > 0.85) {
          br *= 0.7; bg *= 0.7; bb *= 0.7;
        }

        cCtx.fillStyle = `rgb(${br | 0},${bg | 0},${bb | 0})`;
        cCtx.fillRect(x, y, brickW, brickH);

        cCtx.fillStyle = 'rgba(0,0,0,0.12)';
        cCtx.fillRect(x, y + brickH - 4, brickW, 4);
      }
    }

    /* Crumbling Plaster Patches Over Bricks */
    for (let i = 0; i < 16; i++) {
      const px = Math.random() * W;
      const py = Math.random() * H;
      const pr = 40 + Math.random() * 90;

      const grad = cCtx.createRadialGradient(px, py, pr * 0.2, px, py, pr);
      grad.addColorStop(0, 'rgba(140, 134, 126, 0.92)');
      grad.addColorStop(0.7, 'rgba(115, 108, 98, 0.85)');
      grad.addColorStop(1, 'rgba(115, 108, 98, 0.0)');

      cCtx.fillStyle = grad;
      cCtx.beginPath();
      cCtx.arc(px, py, pr, 0, Math.PI * 2);
      cCtx.fill();
    }

    /* Vertical Grime & Water Streaks */
    for (let i = 0; i < 30; i++) {
      const sx = Math.random() * W;
      const sy = Math.random() * (H * 0.3);
      const sw = 6 + Math.random() * 18;
      const sh = 150 + Math.random() * 350;

      const sGrad = cCtx.createLinearGradient(sx, sy, sx, sy + sh);
      sGrad.addColorStop(0, 'rgba(15, 12, 10, 0.4)');
      sGrad.addColorStop(1, 'rgba(15, 12, 10, 0.0)');
      cCtx.fillStyle = sGrad;
      cCtx.fillRect(sx, sy, sw, sh);
    }

    const imgData = cCtx.getImageData(0, 0, W, H);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 18;
      imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + n));
      imgData.data[i + 1] = Math.max(0, Math.min(255, imgData.data[i + 1] + n));
      imgData.data[i + 2] = Math.max(0, Math.min(255, imgData.data[i + 2] + n));
    }
    cCtx.putImageData(imgData, 0, 0);

    const cTex = new THREE.CanvasTexture(cCanvas);
    cTex.wrapS = cTex.wrapT = THREE.RepeatWrapping;
    cTex.repeat.set(16, 4);
    cTex.colorSpace = THREE.SRGBColorSpace;

    const bCanvas = document.createElement('canvas');
    bCanvas.width = W;
    bCanvas.height = H;
    const bCtx = bCanvas.getContext('2d')!;
    bCtx.fillStyle = '#444';
    bCtx.fillRect(0, 0, W, H);

    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (brickW / 2);
      for (let c = -1; c < cols; c++) {
        const x = c * (brickW + mortar) + offset;
        const y = r * (brickH + mortar);
        const v = 150 + Math.random() * 35;
        bCtx.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`;
        bCtx.fillRect(x, y, brickW, brickH);
      }
    }

    const bTex = new THREE.CanvasTexture(bCanvas);
    bTex.wrapS = bTex.wrapT = THREE.RepeatWrapping;
    bTex.repeat.set(16, 4);

    return [cTex, bTex] as const;
  }, []);

  return (
    <mesh position={[0, 3.8, 0]}>
      <planeGeometry args={[68, 9.6]} />
      <meshStandardMaterial
        map={colorMap}
        bumpMap={bumpMap}
        bumpScale={0.48}
        roughness={0.85}
        metalness={0.03}
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
    return tex;
  }, [text, subtext, color, accentColor]);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[4.2 * tagScale, 2.1 * tagScale]} />
      <meshStandardMaterial
        map={texture}
        transparent={true}
        alphaTest={0.01}
        roughness={0.94}
        metalness={0.02}
        polygonOffset={true}
        polygonOffsetFactor={-4}
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
          <mesh material={canMat}>
            <cylinderGeometry args={[0.32, 0.28, 0.9, 14]} />
          </mesh>
          <mesh position={[0, 0.46, 0]} material={canMat}>
            <cylinderGeometry args={[0.35, 0.35, 0.06, 14]} />
          </mesh>
          {i % 2 === 0 && (
            <mesh position={[0.75, 0.05, -0.1]} material={drumMat}>
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
      <mesh position={[0, 7.8, 0.16]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 68, 8]} />
        <meshStandardMaterial color="#38302A" roughness={0.7} metalness={0.6} />
      </mesh>

      {/* Vertical rusty drain pipes (Straight & Plumb) */}
      {[-24, -13, -2, 9, 21].map((x, i) => (
        <mesh key={i} position={[x, 3.8, 0.16]} rotation={[0, 0, 0]} material={i % 2 === 0 ? pipeMat : rustMat}>
          <cylinderGeometry args={[0.06, 0.06, 8.0, 8]} />
        </mesh>
      ))}

      {/* Barred vent windows */}
      {[-18, 2, 14].map((x, i) => (
        <group key={i} position={[x, 6.2, 0.04]}>
          <mesh>
            <boxGeometry args={[2.4, 1.4, 0.1]} />
            <meshStandardMaterial color="#110E0D" roughness={0.9} />
          </mesh>
          {[-0.8, -0.4, 0, 0.4, 0.8].map((bx, idx) => (
            <mesh key={idx} position={[bx, 0, 0.08]}>
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
  const [sidewalkTex, asphaltTex] = useMemo(() => {
    // 1. Realistic Weathered Urban Sidewalk with Grime & Stains
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 512;
    sCanvas.height = 256;
    const sCtx = sCanvas.getContext('2d')!;
    sCtx.fillStyle = '#6E737C'; // Authentic urban poured cement grey
    sCtx.fillRect(0, 0, 512, 256);

    const sData = sCtx.getImageData(0, 0, 512, 256);
    for (let i = 0; i < sData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 20;
      sData.data[i] = Math.max(0, Math.min(255, sData.data[i] + n));
      sData.data[i + 1] = Math.max(0, Math.min(255, sData.data[i + 1] + n));
      sData.data[i + 2] = Math.max(0, Math.min(255, sData.data[i + 2] + n));
    }
    sCtx.putImageData(sData, 0, 0);

    // Sidewalk oil stains, dirt puddles & chewing gum spots
    for (let i = 0; i < 28; i++) {
      const px = Math.random() * 512;
      const py = Math.random() * 256;
      const pr = 8 + Math.random() * 32;
      const grad = sCtx.createRadialGradient(px, py, 1, px, py, pr);
      grad.addColorStop(0, 'rgba(28, 30, 35, 0.45)');
      grad.addColorStop(0.6, 'rgba(38, 41, 47, 0.25)');
      grad.addColorStop(1, 'rgba(38, 41, 47, 0.0)');
      sCtx.fillStyle = grad;
      sCtx.beginPath();
      sCtx.arc(px, py, pr, 0, Math.PI * 2);
      sCtx.fill();
    }

    // Small dark street gum & grime speckles
    sCtx.fillStyle = 'rgba(18, 20, 24, 0.65)';
    for (let i = 0; i < 120; i++) {
      sCtx.fillRect(Math.random() * 512, Math.random() * 256, 3, 3);
    }

    // Grimy gutter runoff stain near curb edge
    const gutterGrad = sCtx.createLinearGradient(0, 210, 0, 256);
    gutterGrad.addColorStop(0, 'rgba(22, 25, 30, 0.0)');
    gutterGrad.addColorStop(1, 'rgba(22, 25, 30, 0.5)');
    sCtx.fillStyle = gutterGrad;
    sCtx.fillRect(0, 210, 512, 46);

    // Concrete slab expansion joints with accumulated dirt
    sCtx.fillStyle = 'rgba(20, 23, 28, 0.75)';
    for (let x = 0; x <= 512; x += 128) {
      sCtx.fillRect(x - 2, 0, 5, 256);
    }

    const sTex = new THREE.CanvasTexture(sCanvas);
    sTex.wrapS = sTex.wrapT = THREE.RepeatWrapping;
    sTex.repeat.set(18, 1);
    sTex.colorSpace = THREE.SRGBColorSpace;

    // 2. Gritty Urban Charcoal Asphalt Road with Tire Skid Marks & Oil Slick Messiness
    const aCanvas = document.createElement('canvas');
    aCanvas.width = 1024;
    aCanvas.height = 512;
    const aCtx = aCanvas.getContext('2d')!;
    aCtx.fillStyle = '#1D2024'; // Dark charcoal asphalt tarmac
    aCtx.fillRect(0, 0, 1024, 512);

    const aData = aCtx.getImageData(0, 0, 1024, 512);
    for (let i = 0; i < aData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 26;
      aData.data[i] = Math.max(0, Math.min(255, aData.data[i] + n));
      aData.data[i + 1] = Math.max(0, Math.min(255, aData.data[i + 1] + n));
      aData.data[i + 2] = Math.max(0, Math.min(255, aData.data[i + 2] + n));
    }
    aCtx.putImageData(aData, 0, 0);

    // Long dark tire skid marks & rubber scuff streaks
    for (let i = 0; i < 14; i++) {
      const sx = Math.random() * 1024;
      const sy = 60 + Math.random() * 380;
      const sw = 120 + Math.random() * 260;
      const sh = 10 + Math.random() * 18;
      aCtx.fillStyle = 'rgba(10, 12, 15, 0.55)';
      aCtx.fillRect(sx, sy, sw, sh);
    }

    // Slick dark asphalt oil patches & tar repairs
    for (let i = 0; i < 22; i++) {
      const px = Math.random() * 1024;
      const py = Math.random() * 512;
      const pr = 16 + Math.random() * 54;
      const grad = aCtx.createRadialGradient(px, py, 2, px, py, pr);
      grad.addColorStop(0, 'rgba(8, 10, 12, 0.7)');
      grad.addColorStop(0.7, 'rgba(14, 16, 19, 0.35)');
      grad.addColorStop(1, 'rgba(14, 16, 19, 0.0)');
      aCtx.fillStyle = grad;
      aCtx.beginPath();
      aCtx.arc(px, py, pr, 0, Math.PI * 2);
      aCtx.fill();
    }

    // Painted white road shoulder striping
    aCtx.fillStyle = 'rgba(235, 240, 245, 0.88)';
    aCtx.fillRect(0, 28, 1024, 8);

    // Painted yellow dashed road center line
    aCtx.fillStyle = 'rgba(245, 197, 24, 0.92)';
    for (let x = 0; x < 1024; x += 128) {
      aCtx.fillRect(x + 16, 246, 68, 10);
    }

    // Grimy street wear scuffs over the painted markings
    aCtx.fillStyle = 'rgba(15, 17, 20, 0.55)';
    for (let i = 0; i < 65; i++) {
      aCtx.fillRect(Math.random() * 1024, 20, 16 + Math.random() * 40, 25);
      aCtx.fillRect(Math.random() * 1024, 240, 16 + Math.random() * 40, 22);
    }

    const aTex = new THREE.CanvasTexture(aCanvas);
    aTex.wrapS = THREE.RepeatWrapping;
    aTex.wrapT = THREE.ClampToEdgeWrapping;
    aTex.repeat.set(18, 1);
    aTex.colorSpace = THREE.SRGBColorSpace;

    return [sTex, aTex] as const;
  }, []);

  return (
    <group>
      {/* Gritty urban cement sidewalk slab */}
      <mesh position={[0, -0.05, 1.6]}>
        <boxGeometry args={[72, 0.12, 3.2]} />
        <meshStandardMaterial
          map={sidewalkTex}
          roughness={0.72}
          metalness={0.08}
        />
      </mesh>

      {/* Weathered concrete curb edge */}
      <mesh position={[0, -0.1, 3.2]}>
        <boxGeometry args={[72, 0.22, 0.15]} />
        <meshStandardMaterial color="#40454D" roughness={0.8} />
      </mesh>

      {/* Weathered charcoal asphalt street road below with skid marks & oil stains */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 6]}>
        <planeGeometry args={[72, 10]} />
        <meshStandardMaterial
          map={asphaltTex}
          roughness={0.58}
          metalness={0.14}
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
      />
      {/* Center hero pool reinforcement */}
      <pointLight position={[-1.0, 2.5, 2.1]} color="#FFF2DB" intensity={180} distance={8} decay={2} />
    </group>
  );
}

function Scene({ progressRef }: { progressRef: React.RefObject<number> }) {
  return (
    <>
      <fog attach="fog" args={['#141113', 18, 48]} />

      {/* Balanced atmospheric fill so masonry & details are beautifully defined and legible */}
      <ambientLight intensity={0.52} color="#FAF0E6" />
      <directionalLight position={[3, 12, 8]} intensity={1.35} color="#F5E4C3" />

      {/* Hero #1: Center Poster Spotlight */}
      <HeroCenterSpotlight />

      {/* Controlled Overhead Streetlamp Pools */}
      <pointLight position={[-22, 6.5, 3.5]} color="#FFB653" intensity={210} distance={22} decay={2} />
      <pointLight position={[-11, 6.8, 3.5]} color="#FFB653" intensity={200} distance={22} decay={2} />
      <pointLight position={[0, 6.5, 3.5]} color="#FFB653" intensity={230} distance={22} decay={2} />
      <pointLight position={[11, 6.8, 3.5]} color="#FFB653" intensity={200} distance={22} decay={2} />
      <pointLight position={[22, 6.5, 3.5]} color="#FFB653" intensity={210} distance={22} decay={2} />

      {/* Interactive First-Person Human Camera + Handheld Flashlight */}
      <InteractiveCameraRig progressRef={progressRef} />
      <HandheldFlashlight progressRef={progressRef} />

      {/* Architectural Wall, Decals & Street Depth */}
      <OldBrokenBrickWall />
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
      <GraffitiTag text="EVENTS" subtext="UNDERGROUND TECH ARCHIVE // EST. 1994" color="#00E5FF" accentColor="#00A8CC" position={[-26.0, 2.4, 0.045]} rotation={[0, 0, -0.02]} tagScale={0.86} />
      <GraffitiTag text="GDG" subtext="CRCE // SUNÉKHEIA // ALL ERAS" color="#FF007F" accentColor="#990044" position={[-14.5, 2.45, 0.045]} rotation={[0, 0, 0.03]} tagScale={0.86} />
      <GraffitiTag text="MTV" subtext="UNPLUGGED // ARCHIVE SER. 04" color="#00E5FF" accentColor="#006688" position={[-3.8, 2.4, 0.045]} rotation={[0, 0, -0.03]} tagScale={0.86} />
      <GraffitiTag text="90s" subtext="CONTINUITY // EVOLUTION // LEGACY" color="#FFBB00" accentColor="#AA5500" position={[7.35, 2.45, 0.045]} rotation={[0, 0, 0.04]} tagScale={0.84} />
      <GraffitiTag text="HACK" subtext="BYTE CLUB // OPEN SYNDICATE" color="#BF00FF" accentColor="#550088" position={[18.65, 2.4, 0.045]} rotation={[0, 0, -0.03]} tagScale={0.84} />

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
}

export default function WallScene({ progressRef }: WallSceneProps) {
  return (
    <Canvas
      camera={{ position: [-26, 2.1, 4.4], fov: 62 }}
      dpr={[1, 1.5]}
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
        <Scene progressRef={progressRef} />
      </Suspense>
    </Canvas>
  );
}

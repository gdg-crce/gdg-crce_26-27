'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildNightlifeEnvironment } from './discoBall';
import { DiscoBallModel } from './DiscoBallModel';

/* Hermite smoothstep — the reveal ref arrives linear from the section. */
function smooth01(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

interface DiscoBallSceneProps {
  /** 0 → 1 settle progress: 0 = facet close-up (under the bloom), 1 = settled. */
  revealRef: React.RefObject<number>;
  /** 0 → 1 scroll rotation, added on top of the slow ambient spin. */
  rotationRef?: React.RefObject<number>;
  /** Gates the render loop so the ball costs nothing while off-screen. */
  active?: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════
   Environment — sets the dark warm/cool dome as the scene reflection source.
   The mirror plates read this and nothing else, so this is the whole palette.
   ═══════════════════════════════════════════════════════════════════════ */
function Environment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const env = useMemo(() => buildNightlifeEnvironment(gl), [gl]);
  useEffect(() => {
    scene.environment = env;
    scene.background = null; // CSS owns the #0a0a0a backdrop + light rays
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [scene, env]);
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════
   Twinkle glints — small additive sprites sitting ON the sphere surface,
   parented to the SPIN group so they orbit with the ball (never a flat
   overlay). depthTest occludes the ones behind the ball, so only the facets
   currently facing us catch light. Each pulses on its own slow rhythm.
   ═══════════════════════════════════════════════════════════════════════ */
function makeGlintTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,250,235,0.85)');
  g.addColorStop(0.6, 'rgba(255,240,210,0.25)');
  g.addColorStop(1.0, 'rgba(255,240,210,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const GLINT_COLORS = ['#fff3d8', '#fff8ec', '#ffe6c2', '#cddaf2', '#e7d6f2'];

interface Glint {
  pos: [number, number, number];
  phase: number;
  speed: number;
  color: string;
  base: number;
}

/* Deterministic scatter of glint points over the sphere (module-level so the
   RNG state never lives across a render). */
function scatterGlints(radius: number, count: number): Glint[] {
  let seed = 20260719;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, () => {
    const u = rand();
    const v = rand();
    const theta = Math.acos(2 * v - 1);
    const phi = 2 * Math.PI * u;
    const dir = new THREE.Vector3(
      Math.sin(theta) * Math.cos(phi),
      Math.cos(theta),
      Math.sin(theta) * Math.sin(phi)
    );
    return {
      pos: dir.multiplyScalar(radius * 1.02).toArray() as [number, number, number],
      phase: rand() * Math.PI * 2,
      speed: 1.6 + rand() * 1.6, // ~2–4s cycle
      color: GLINT_COLORS[Math.floor(rand() * GLINT_COLORS.length)],
      base: radius * (0.11 + rand() * 0.08),
    };
  });
}

function Glints({ radius, count = 16 }: { radius: number; count?: number }) {
  const tex = useMemo(() => makeGlintTexture(), []);
  const glints = useMemo(() => scatterGlints(radius, count), [radius, count]);

  const refs = useRef<THREE.Sprite[]>([]);
  useEffect(() => () => tex.dispose(), [tex]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < glints.length; i++) {
      const sp = refs.current[i];
      if (!sp) continue;
      const gdata = glints[i];
      // Sharp, sparse twinkle: mostly dark, occasional bright catch.
      let k = 0.5 + 0.5 * Math.sin(t * gdata.speed + gdata.phase);
      k = Math.pow(k, 4);
      (sp.material as THREE.SpriteMaterial).opacity = k * 0.9;
      const s = gdata.base * (0.7 + 0.6 * k);
      sp.scale.set(s, s, s);
    }
  });

  return (
    <>
      {glints.map((gd, i) => (
        <sprite
          key={i}
          ref={(el) => {
            if (el) refs.current[i] = el;
          }}
          position={gd.pos}
        >
          <spriteMaterial
            map={tex}
            color={gd.color}
            transparent
            opacity={0}
            depthWrite={false}
            depthTest
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   The ball + camera choreography. The ball stays roughly centred (so the
   About copy can orbit around it) — it slowly, ambiently auto-spins so the
   facets keep catching light even at rest, with scroll adding a little extra.
   ═══════════════════════════════════════════════════════════════════════ */
const BALL_FIT = 3.8; // mirror-sphere diameter in world units
const BALL_RADIUS = BALL_FIT / 2;

function DiscoBall({
  revealRef,
  rotationRef,
}: {
  revealRef: React.RefObject<number>;
  rotationRef?: React.RefObject<number>;
}) {
  const camera = useThree((s) => s.camera);
  const anchor = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const rv = smooth01(revealRef.current ?? 0);
    const scroll = rotationRef?.current ?? 0;

    // Continuous ambient spin (always turning so the facets keep twinkling) plus
    // a clear scroll contribution (~3 turns across the scroll). The bright,
    // varied env means every degree of turn visibly sweeps sparkle across it.
    if (spin.current) {
      spin.current.rotation.y = t * 0.28 + scroll * Math.PI * 3.0;
    }

    // Ball settles slightly upward, so the beams burst symmetrically around it and
    // the copy can orbit clear of it. A small damped sway keeps it feeling hung.
    if (anchor.current) {
      const sway = Math.sin(t * 0.6) * 0.045 * rv;
      const bob = Math.cos(t * 1.1) * 0.03 * rv;
      anchor.current.position.set(sway, bob + 1.0 * rv, 0);
      anchor.current.rotation.z = Math.sin(t * 0.6) * 0.02 * rv;
    }

    // Camera dollies out from a facet close-up (under the bloom) to the settled
    // framing. Parallax is scaled by reveal so the close-up stays rock-steady.
    const px = state.pointer.x * 0.3 * rv;
    const py = state.pointer.y * 0.24 * rv;
    camera.position.x += (px - camera.position.x) * 0.05;
    camera.position.y += (py - camera.position.y) * 0.05;
    camera.position.z = THREE.MathUtils.lerp(2.3, 8.2, rv);
    camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={anchor}>
      <group ref={spin}>
        <DiscoBallModel fit={BALL_FIT} envIntensity={4.2} showChain />
        <Glints radius={BALL_RADIUS} count={35} />
        <mesh position={[0, 4, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 8]} />
          <meshStandardMaterial color="#8f9298" roughness={0.4} metalness={1} />
        </mesh>
      </group>
    </group>
  );
}

/* Stage spotlights — a warm key from the upper left and a cool fill from the
   right, aimed at the ball. On the mirror plates these do little (the env map
   carries the reflections), but they model the fixture, chain and dark grout so
   the ball reads as lit from real sources. The VISIBLE light sources + beams are
   the CSS layer (.about-glow / .about-rays); these are just the modelling. */
function SpotlightProps() {
  return (
    <>
      <spotLight
        position={[-4.6, 3.2, 2.4]}
        target-position={[0, 0, 0]}
        angle={0.6}
        penumbra={0.9}
        intensity={24}
        distance={18}
        color="#ffcf92"
      />
      <spotLight
        position={[4.8, 0.4, 2.4]}
        target-position={[0, 0, 0]}
        angle={0.6}
        penumbra={0.9}
        intensity={16}
        distance={18}
        color="#8fc0ea"
      />
    </>
  );
}

/* Minimal ambient rig — just enough to keep the fixture, chain and dark grout
   from crushing to black. The plates' look is 99% the env map. */
function NightlifeLights() {
  return (
    <>
      <ambientLight intensity={0.22} color="#242832" />
      <directionalLight position={[3, 5, 6]} intensity={0.55} color="#eaf0f6" />
    </>
  );
}

/* Dev handle mirroring WallScene's window.__r3f — remove before shipping. */
function DevHandle({ revealRef }: { revealRef: React.RefObject<number> }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __disco?: unknown }).__disco = { gl, scene, camera, revealRef };
  }, [gl, scene, camera, revealRef]);
  return null;
}

export default function DiscoBallScene({
  revealRef,
  rotationRef,
  active = true,
}: DiscoBallSceneProps) {
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, 2.2], fov: 42, near: 0.1, far: 100 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMappingExposure: 1.35 }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent' }}
    >
      <Environment />
      <NightlifeLights />
      <SpotlightProps />
      <DiscoBall revealRef={revealRef} rotationRef={rotationRef} />
      <DevHandle revealRef={revealRef} />
    </Canvas>
  );
}

'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import {
  buildDiscoTiles,
  buildNightlifeEnvironment,
  makeRayMaterial,
  makeTwinkleMaterial,
} from './discoBall';

/* Hermite smoothstep — the reveal ref arrives linear from the section. */
function smooth01(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

interface DiscoBallSceneProps {
  /** 0 → 1 settle progress: 0 = extreme facet close-up, 1 = small, upper-centre. */
  revealRef: React.RefObject<number>;
  /** 0 → 1 scroll rotation: drives the ball's spin (no autonomous rotation). */
  rotationRef?: React.RefObject<number>;
  /** Gates the render loop so the ball costs nothing while off-screen. */
  active?: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════
   The ball + rays + camera choreography.
   ═══════════════════════════════════════════════════════════════════════ */
function DiscoBall({
  revealRef,
  rotationRef,
}: {
  revealRef: React.RefObject<number>;
  rotationRef?: React.RefObject<number>;
}) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);

  const env = useMemo(() => buildNightlifeEnvironment(gl), [gl]);
  const { tileGeo, matrices, count } = useMemo(() => buildDiscoTiles(1.5), []);
  const material = useMemo(() => makeTwinkleMaterial(env), [env]);
  const rayMat = useMemo(() => makeRayMaterial(), []);

  const anchorRef = useRef<THREE.Group>(null); // translates ball to its settle position
  const spinRef = useRef<THREE.Group>(null); // spins the ball only
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const rayRef = useRef<THREE.Mesh>(null);

  // Bake the per-instance transforms once.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) mesh.setMatrixAt(i, matrices[i]);
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, matrices]);

  // Dispose GPU resources on unmount (env RT, geometry, materials).
  useEffect(() => {
    return () => {
      env.dispose();
      tileGeo.dispose();
      material.dispose();
      rayMat.dispose();
    };
  }, [env, tileGeo, material, rayMat]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const rv = smooth01(revealRef.current ?? 0);

    // Rotation is SCROLL-DRIVEN, not autonomous: the ball turns only as the
    // user scrolls, sweeping the tiles past the env hotspots. ~2.5 turns across
    // the driven range.
    if (spinRef.current) {
      spinRef.current.rotation.y = (rotationRef?.current ?? 0) * Math.PI * 2.5;
    }

    // Ball slides from screen-centre (origin) up-right into its resting corner.
    if (anchorRef.current) {
      anchorRef.current.position.set(
        THREE.MathUtils.lerp(0, 0.80, rv),
        THREE.MathUtils.lerp(0, 1.35, rv),
        0
      );
    }

    // Camera dollies out from a facet close-up to the settled framing. Parallax
    // is scaled by the reveal so the close-up stays rock-steady under the bloom.
    const px = state.pointer.x * 0.5 * rv;
    const py = state.pointer.y * 0.4 * rv;
    camera.position.x += (px - camera.position.x) * 0.06;
    camera.position.y += (py - camera.position.y) * 0.06;
    camera.position.z = THREE.MathUtils.lerp(2.05, 7.4, rv);
    camera.lookAt(0, 0, 0);

    // Drive shader time + ray intensity (rays bloom in as the ball settles).
    const sh = material.userData.shader as { uniforms: Record<string, { value: number }> } | undefined;
    if (sh) sh.uniforms.uTime.value = t;
    rayMat.uniforms.uTime.value = t;
    rayMat.uniforms.uIntensity.value = THREE.MathUtils.lerp(0.4, 1.0, rv);

    // Billboard the ray plane. anchorRef carries only translation, so copying
    // the camera quaternion in local space is correct.
    if (rayRef.current) rayRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <>
      <group ref={anchorRef}>
        {/* Warm amber rays + halo, billboarded behind the ball. Large plane so
            the shafts run long, well past the ball's silhouette. */}
        <mesh ref={rayRef} material={rayMat} renderOrder={-1} frustumCulled={false}>
          <planeGeometry args={[16, 16]} />
        </mesh>

        <group ref={spinRef}>
          {/* Dark grout core so the tile gaps read as shadow, not transparency. */}
          <mesh>
            <sphereGeometry args={[1.482, 48, 48]} />
            <meshStandardMaterial
              color="#0a0a0d"
              roughness={0.85}
              metalness={0.15}
              envMap={env}
              envMapIntensity={0.35}
            />
          </mesh>

          {/* ~1000 mirror tiles, one draw call. */}
          <instancedMesh ref={meshRef} args={[tileGeo, material, count]} frustumCulled={false} />
        </group>
      </group>

      {/* Faint warm dust drifting through the light. */}
      <Sparkles
        count={40}
        scale={[9, 7, 5]}
        position={[0.5, 1.0, -1]}
        size={2.2}
        speed={0.3}
        noise={1.2}
        color="#ffcf8a"
        opacity={0.5}
      />
    </>
  );
}

/* Warm nightlife rig — deliberately minimal. The tiles are pure mirrors
   (metalness 1), so their COLOUR comes almost entirely from the env map's
   hotspots, not from these lights. Washing the ball with a strong amber
   point light is exactly what made it read as one flat artificial colour, so
   the rig is now just a faint warm fill plus one soft directional for a broad
   specular sheen; the env carries the glare and the variety. */
function NightlifeLights() {
  return (
    <>
      <ambientLight intensity={0.16} color="#3a2410" />
      <directionalLight position={[3, 5, 6]} intensity={0.6} color="#fff1de" />
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
      camera={{ position: [0, 0, 2.05], fov: 42, near: 0.1, far: 100 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMappingExposure: 1.2 }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent' }}
    >
      <NightlifeLights />
      <DiscoBall revealRef={revealRef} rotationRef={rotationRef} />
      <DevHandle revealRef={revealRef} />
    </Canvas>
  );
}

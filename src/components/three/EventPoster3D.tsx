'use client';

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';

interface EventPoster3DProps {
  posterImage: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
}

/**
 * Clean street poster directly stuck to the wall surface:
 * - Directly adhered to wall with no artificial drop shadows
 * - No tape strips or black border boxes
 * - Transparent alpha support so PNG backgrounds don't render black
 * - Subtle emissive glow on hover for interactive feedback
 */
export default function EventPoster3D({
  posterImage,
  position,
  rotation,
  scale: posterScale,
}: EventPoster3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const texture = useTexture(posterImage);
  texture.colorSpace = THREE.SRGBColorSpace;

  // Large proper poster dimensions directly stuck to wall
  const w = 3.4 * posterScale;
  const h = 3.4 * posterScale;

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, 0, rotation]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Main Poster Face directly adhered to wall */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={texture}
          transparent={true}
          alphaTest={0.01}
          roughness={0.78}
          metalness={0.02}
          emissive={hovered ? '#332211' : '#000000'}
          emissiveIntensity={hovered ? 0.18 : 0}
          polygonOffset={true}
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
    </group>
  );
}


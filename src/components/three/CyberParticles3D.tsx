'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

function FloatingMesh() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x += 0.003;
    meshRef.current.rotation.y += 0.005;
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.8, 1]} />
      <meshStandardMaterial 
        color="#39B7BD" 
        wireframe
        transparent
        opacity={0.2}
        metalness={0.5}
        roughness={0.5}
      />
    </mesh>
  );
}

export default function CyberParticles3D() {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none -z-10 opacity-25">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.0} />
        
        <Float speed={1.0} rotationIntensity={0.4} floatIntensity={0.8}>
          <FloatingMesh />
        </Float>

        <Sparkles 
          count={50} 
          scale={8} 
          size={2} 
          speed={0.3} 
          color="#00D4E8" 
        />
        <Sparkles 
          count={30} 
          scale={6} 
          size={1.5} 
          speed={0.2} 
          color="#B4E600" 
        />
      </Canvas>
    </div>
  );
}

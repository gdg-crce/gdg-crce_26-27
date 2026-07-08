'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

function VinylMesh() {
  const recordRef = useRef<THREE.Group>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth) - 0.5,
        y: (e.clientY / window.innerHeight) - 0.5,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((state) => {
    if (!recordRef.current) return;
    
    // Slow auto rotation
    recordRef.current.rotation.z += 0.01;

    // Subtle parallax tilt based on mouse position
    const targetX = mouse.y * 0.4;
    const targetY = mouse.x * 0.4;
    
    recordRef.current.rotation.x += (targetX - recordRef.current.rotation.x) * 0.1;
    recordRef.current.rotation.y += (targetY - recordRef.current.rotation.y) * 0.1;
  });

  return (
    <group ref={recordRef} rotation={[0.4, 0, 0]}>
      {/* Outer Vinyl Disc */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[2.5, 2.5, 0.06, 64]} />
        <meshStandardMaterial 
          color="#141416" 
          roughness={0.25} 
          metalness={0.8}
        />
      </mesh>

      {/* Grooves effect (stacked thin rings) */}
      {[1.0, 1.3, 1.6, 1.9, 2.2].map((radius, idx) => (
        <mesh key={idx} position={[0, 0.031, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius, radius + 0.02, 64]} />
          <meshStandardMaterial 
            color="#2a2a2e" 
            roughness={0.1}
            metalness={0.9}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}

      {/* Center Label (Colored Sticker) */}
      <mesh position={[0, 0.032, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.005, 32]} />
        <meshStandardMaterial 
          color="#AD2421" // Initial warm rust-red, shifts via standard lighting
          roughness={0.5} 
          metalness={0.1}
        />
      </mesh>

      {/* Center Pin Hole */}
      <mesh position={[0, 0.033, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.01, 16]} />
        <meshStandardMaterial 
          color="#000000" 
          roughness={0.9} 
          metalness={0.0}
        />
      </mesh>
    </group>
  );
}

export default function Vinyl3D() {
  return (
    <div className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] cursor-grab active:cursor-grabbing">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <ambientLight intensity={1.5} />
        <pointLight position={[10, 10, 10]} intensity={2.0} />
        <directionalLight position={[-5, 5, 2]} intensity={1.5} />
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.8}>
          <VinylMesh />
        </Float>
      </Canvas>
    </div>
  );
}

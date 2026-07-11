'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface VHSTapeProps {
  reelRotation: number;
  logoScale: number;
  revealProgress: number;
}

/* ─── Subtle floating dust motes that drift organically ─── */
const DUST_COUNT = 60;

function DustParticles() {
  const meshRef = useRef<THREE.Points>(null);

  const { positions, velocities, sizes, opacities } = useMemo(() => {
    const pos = new Float32Array(DUST_COUNT * 3);
    const vel = new Float32Array(DUST_COUNT * 3);
    const sz = new Float32Array(DUST_COUNT);
    const op = new Float32Array(DUST_COUNT);

    for (let i = 0; i < DUST_COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;

      vel[i * 3]     = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.003 + 0.001;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.004;

      sz[i] = Math.random() * 0.08 + 0.02;
      op[i] = Math.random() * 0.35 + 0.1;
    }

    return { positions: pos, velocities: vel, sizes: sz, opacities: op };
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));
    return geo;
  }, [positions, sizes, opacities]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aOpacity;
        varying float vOpacity;
        void main() {
          vOpacity = aOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (160.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.05, dist) * vOpacity;
          gl_FragColor = vec4(0.9, 0.87, 0.8, alpha * 0.45);
        }
      `,
    });
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const posAttr = meshRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < DUST_COUNT; i++) {
      arr[i * 3]     += velocities[i * 3];
      arr[i * 3 + 1] += velocities[i * 3 + 1];
      arr[i * 3 + 2] += velocities[i * 3 + 2];

      if (Math.abs(arr[i * 3])     > 18) arr[i * 3]     *= -0.9;
      if (Math.abs(arr[i * 3 + 1]) > 11) arr[i * 3 + 1] *= -0.9;
      if (Math.abs(arr[i * 3 + 2]) > 10) arr[i * 3 + 2] *= -0.9;

      arr[i * 3]     += Math.sin(Date.now() * 0.00025 + i * 1.3) * 0.001;
      arr[i * 3 + 1] += Math.cos(Date.now() * 0.00018 + i * 2.1) * 0.0008;
    }

    posAttr.needsUpdate = true;
    material.uniforms.uTime.value += delta;
  });

  return <points ref={meshRef} geometry={geometry} material={material} />;
}


/* ─── The custom GLB VHS cassette — stationary at center ─── */
function VHSCassette() {
  const { nodes, materials } = useGLTF('/models/myModel-v1-transformed.glb');

  /*
   * Center offset: the model meshes are positioned around x≈15, y≈0.8, z≈-28.5.
   * We subtract this to bring the model to the origin.
   */
  const modelCenter: [number, number, number] = [15.2, 0.8, -28.5];

  return (
    <group>
      {/* Rotate upright (model is built lying flat), scale to fit */}
      <group rotation={[Math.PI / 2, 0, 0]} scale={1.15}>
        <group position={[-modelCenter[0], -modelCenter[1], -modelCenter[2]]}>
          <mesh
            geometry={(nodes.Plane as THREE.Mesh).geometry}
            material={materials['Material.001']}
            position={[15.105, 1.252, -28.368]}
            scale={[5.62, 1, 3.57]}
          />
          <mesh
            geometry={(nodes.Object_10 as THREE.Mesh).geometry}
            material={materials.PaletteMaterial001}
            position={[15.125, 0.442, -29.077]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[12.1, 11.563, 3.496]}
          />
          <mesh
            geometry={(nodes.Object_3 as THREE.Mesh).geometry}
            material={materials.material_2}
            position={[16.522, 0.588, -22.215]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[10.071, 9.623, 2.909]}
          />
          <mesh
            geometry={(nodes.Object_4 as THREE.Mesh).geometry}
            material={materials.material_3}
            position={[15.227, 0.635, -28.954]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[12.752, 12.185, 3.684]}
          />
          <mesh
            geometry={(nodes.Object_6 as THREE.Mesh).geometry}
            material={materials.material_5}
            position={[24.768, 1.011, -35.007]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[0.772, 0.738, 0.223]}
          />
          <mesh
            geometry={(nodes.Object_7 as THREE.Mesh).geometry}
            material={materials.PaletteMaterial002}
            position={[15.227, 0.916, -28.237]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[12.109, 11.57, 3.498]}
          />
          <mesh
            geometry={(nodes.Object_8 as THREE.Mesh).geometry}
            material={materials.material_7}
            position={[15.227, 1.007, -34.479]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[12.752, 12.185, 3.684]}
          />
        </group>
      </group>
    </group>
  );
}

useGLTF.preload('/models/myModel-v1-transformed.glb');


/* ─── Scene wrapper ─── */
export default function VHSTape(props: VHSTapeProps) {
  return (
    <div style={{ width: '100%', height: '53vw', maxHeight: '574px', position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 28], fov: 38 }}>
        {/* Warm, moody VHS-era lighting */}
        <ambientLight intensity={0.4} color="#e8dcc8" />
        <directionalLight
          position={[10, 16, 14]}
          intensity={1.6}
          color="#fff5e6"
          castShadow
        />
        <directionalLight position={[-8, 8, -8]} intensity={0.5} color="#c8d8ff" />
        <directionalLight position={[0, 2, 20]} intensity={0.8} color="#ffe8d0" />
        <pointLight position={[0, -8, 6]} intensity={0.35} color="#ff9955" distance={40} />
        <pointLight position={[-16, 3, 0]} intensity={0.25} color="#8899cc" distance={45} />

        <React.Suspense fallback={null}>
          <VHSCassette />
          <DustParticles />
        </React.Suspense>

        <fog attach="fog" args={['#080808', 25, 65]} />
      </Canvas>
    </div>
  );
}

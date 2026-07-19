/*
  Disco ball geometry — compressed (Draco + Meshopt) from the raw 6.46MB scan
  down to 322KB via `npx gltfjsx@6.5.3 public/models/disco_ball.glb --transform`.

  Model: "Free Realistic Disco Ball" by z o o z i (zozo.surreal)
  License: CC-BY-4.0 — http://creativecommons.org/licenses/by/4.0/
  Source: https://sketchfab.com/3d-models/free-realistic-disco-ball-f59e18c05c99406086dc1bffff07bafc
  (Attribution is required by the licence — keep this header.)

  This is NOT the raw gltfjsx dump. The generated component has been reshaped so
  the ball is a self-contained, ORIGIN-CENTRED unit: the raw asset ships ~9 units
  up and ~10 wide, so we measure the base sphere on mount and translate+scale the
  whole rig (ball + fixture + chain) so the mirror sphere sits at (0,0,0) with a
  known diameter. The parent then only has to spin / dolly it.

  Materials are retuned here for a photographed-under-overcast read, not a comic
  render: the plates are a NEUTRAL silver mirror (all colour comes from the env
  map, never from the material), the base sphere is dark grout, and reflection
  strength is a single dialable prop instead of the asset's baked-in blowout.
*/
'use client';

import * as THREE from 'three';
import { useLayoutEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import type { GLTF } from 'three-stdlib';

const MODEL_URL = '/models/disco_ball-transformed.glb';

type GLTFResult = GLTF & {
  nodes: {
    Base_Sphere_DiscoBall_0: THREE.Mesh;
    Reflective_Plates_Reflective_0: THREE.Mesh;
    Fix_Metal_0: THREE.Mesh;
    Chain_Metal_0: THREE.Mesh;
  };
  materials: {
    DiscoBall: THREE.MeshStandardMaterial;
    Reflective: THREE.MeshStandardMaterial;
    Metal: THREE.MeshStandardMaterial;
  };
};

interface DiscoBallModelProps {
  /** Target diameter (world units) of the mirror sphere after centring. */
  fit?: number;
  /** Reflection strength on the mirror plates — the master "sparkle" dial. */
  envIntensity?: number;
  /** Show the ceiling fixture + hanging chain (reads as a real hung ball). */
  showChain?: boolean;
}

export function DiscoBallModel({ fit = 3, envIntensity = 1.15, showChain = true }: DiscoBallModelProps) {
  const { nodes, materials } = useGLTF(MODEL_URL) as unknown as GLTFResult;
  const rig = useRef<THREE.Group>(null);
  const sphere = useRef<THREE.Mesh>(null);

  // Retune the shared materials once for a subtle, real mirror-ball look.
  useLayoutEffect(() => {
    const refl = materials.Reflective;
    refl.metalness = 1;
    refl.roughness = 0.06; // sharp mirror — crisp facet reflections, not a soft smear
    refl.color.set('#d4d7dd'); // neutral silver — colour is carried entirely by the env map
    refl.envMapIntensity = envIntensity;
    // Flat per-facet shading: each mirror plate reflects ONE crisp direction
    // instead of a curved, smeared average — this is what makes it read as a
    // real tiled disco ball rather than a blurry chrome sphere.
    refl.flatShading = true;
    refl.needsUpdate = true;

    const base = materials.DiscoBall;
    base.metalness = 0.25;
    base.roughness = 0.9;
    base.color.set('#101015'); // grout: dark so the bright facets pop, not a grey wash
    base.envMapIntensity = 0.3;

    const metal = materials.Metal;
    metal.metalness = 1;
    metal.roughness = 0.4;
    metal.color.set('#8f9298');
    metal.envMapIntensity = 0.7;
  }, [materials, envIntensity]);

  // Centre + scale the whole rig from the base sphere's world bounds, so the ball
  // sits at the origin at diameter `fit` no matter the asset's native transforms.
  useLayoutEffect(() => {
    const g = rig.current;
    const s = sphere.current;
    if (!g || !s) return;

    g.position.set(0, 0, 0);
    g.scale.setScalar(1);
    g.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(s);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const diameter = Math.max(size.x, size.y, size.z) || 1;
    const k = fit / diameter;

    g.scale.setScalar(k);
    g.position.set(-center.x * k, -center.y * k, -center.z * k);
  }, [fit]);

  return (
    <group ref={rig} dispose={null}>
      <group name="Sketchfab_Scene">
        <group name="RootNode" scale={0.01}>
          <group name="Disco_Sphere" position={[0, 900.28, 0]} rotation={[0, 0.482, 0]} scale={991.387}>
            <group name="Base_Sphere" position={[0, -0.908, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.101}>
              <mesh
                ref={sphere}
                name="Base_Sphere_DiscoBall_0"
                geometry={nodes.Base_Sphere_DiscoBall_0.geometry}
                material={materials.DiscoBall}
              />
            </group>
            <group name="Reflective_Plates" position={[0, -0.908, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.101}>
              <mesh
                name="Reflective_Plates_Reflective_0"
                geometry={nodes.Reflective_Plates_Reflective_0.geometry}
                material={materials.Reflective}
              />
            </group>
            <group name="Fix" position={[0, -0.908, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.101}>
              <mesh name="Fix_Metal_0" geometry={nodes.Fix_Metal_0.geometry} material={materials.Metal} />
            </group>
            {showChain && (
              <group name="Chain" position={[0, -0.908, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.101}>
                <mesh name="Chain_Metal_0" geometry={nodes.Chain_Metal_0.geometry} material={materials.Metal} />
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);

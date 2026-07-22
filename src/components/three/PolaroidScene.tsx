'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { whatWeDoItems } from '@/components/sections/whatwedo/whatWeDoData';
import { pacifico, spaceGrotesk } from '@/lib/fonts';

/* ══════════════════════════════════════════════════════════════════════════
   PolaroidScene — the lens-portal (Act 2.5)

   The Three.js camera starts INSIDE the lens barrel, staring at the aperture
   blades at the peak of the shutter flash; scroll dollies it back out of the
   lens to reveal the whole procedural Polaroid, which then prints one photo per
   section from its slot. The photos develop from a milky blank to a full
   exposure and drift into a stack. Everything is posed imperatively from one
   `pose(p)` function (single scalar → whole scene), same contract as the other
   scroll acts — no React state on the frame path.
   ══════════════════════════════════════════════════════════════════════════ */

/* ── scalar helpers ─────────────────────────────────────────────────────── */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 2.4);

/** Keyframe sampler over [p, value] pairs, smoothstepped between neighbours. */
function sampleNum(keys: [number, number][], p: number) {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (p <= keys[i][0]) {
      const [x0, v0] = keys[i - 1];
      const [x1, v1] = keys[i];
      return lerp(v0, v1, smooth(x0, x1, p));
    }
  }
  return keys[keys.length - 1][1];
}
function sampleVec(keys: [number, [number, number, number]][], p: number, out: THREE.Vector3) {
  const x = sampleNum(keys.map(([t, v]) => [t, v[0]]), p);
  const y = sampleNum(keys.map(([t, v]) => [t, v[1]]), p);
  const z = sampleNum(keys.map(([t, v]) => [t, v[2]]), p);
  return out.set(x, y, z);
}

/* ── camera path (the portal) ────────────────────────────────────────────
   Model faces +Z (measured). Lens opening centre ≈ (0, +0.3), aperture deep at
   z≈0.6, barrel rim z≈1.3. p0 sits the camera inside the barrel looking into the
   aperture; it dollies out, frames the whole body, then tips down to the table
   where the prints lie. */
const POS_KEYS: [number, [number, number, number]][] = [
  [0.0, [0, 0.3, 1.0]],
  [0.14, [0, 0.45, 2.6]],
  [0.42, [0, 0.8, 6.8]],
  [0.85, [0, 1.2, 7.5]],
  [1.0, [0, 4.5, 8.5]],
];
const LOOK_KEYS: [number, [number, number, number]][] = [
  [0.0, [0, 0.3, 0.3]],
  [0.14, [0, 0.35, 1.0]],
  [0.42, [0, -0.2, 0.5]],
  [0.85, [0, -0.5, 1.5]],
  [1.0, [0, -1.5, 2.9]],
];
const FOV_KEYS: [number, number][] = [
  [0.0, 72],
  [0.14, 58],
  [0.42, 44],
  [0.85, 46],
  [1.0, 50],
];

/* ── printed-photo choreography ─────────────────────────────────────────── */
const CONTENT_A = 0.42;
const CONTENT_B = 0.9;
const SLOT = new THREE.Vector3(0, -1.15, 1.35); // the model's film slot
/** Resting pose per print — laid FLAT on the table (rotX ≈ -90°, face up),
 *  fanned with a curated random rotation, forming a physical archive. */
const STACK: { pos: [number, number, number]; rot: [number, number, number] }[] = [
  { pos: [-1.35, -1.61, 2.4], rot: [-1.5, 0.08, 0.36] },
  { pos: [0.1, -1.57, 3.4], rot: [-1.53, -0.03, -0.2] },
  { pos: [1.45, -1.6, 2.3], rot: [-1.47, 0.02, 0.55] },
];

/* ══════════════════════════════════════════════════════════════════════════
   Procedural textures (built once)
   ══════════════════════════════════════════════════════════════════════════ */

/** Warm studio env — a soft top light over a dark desk, PMREM'd for reflections
 *  on the black lens + glass. No network fetch. */
function buildStudioEnv(renderer: THREE.WebGLRenderer): THREE.Texture {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.0, '#fff3e2');
  g.addColorStop(0.35, '#d7d3d0');
  g.addColorStop(0.62, '#6f6a72');
  g.addColorStop(1.0, '#201d28');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // a bright soft-box overhead-front for a glass highlight
  const s = ctx.createRadialGradient(w * 0.42, h * 0.24, 6, w * 0.42, h * 0.24, h * 0.5);
  s.addColorStop(0, 'rgba(255,255,255,0.95)');
  s.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = s;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromEquirectangular(tex);
  tex.dispose();
  pmrem.dispose();
  return rt.texture;
}

/* ── the desk: the provided wood table ─────────────────────────────────────
   The scanned wood_table_001 set (in public/textures/table/), optimised
   off-line the same way as the wall: diffuse recompressed, roughness half-res,
   and the normal DERIVED from the set's 16-bit displacement map (its .exr
   normal can't be read by sharp; a height→normal sobel off the same scan is
   equivalent). A deliberately different surface from the concrete wall. */
function loadDeskWood(loader: THREE.TextureLoader) {
  const setup = (url: string, srgb: boolean) => {
    const t = loader.load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 6);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return {
    map: setup('/textures/table/table_color.jpg', true),
    normalMap: setup('/textures/table/table_normal.jpg', false),
    roughnessMap: setup('/textures/table/table_rough.jpg', false),
  };
}

/* ── the backdrop: the provided concrete wall ──────────────────────────────
   The scanned concrete_wall_001 set (in public/textures/poloroid/), optimised
   off-line to ~145KB total: diffuse recompressed, roughness half-res, and the
   normal DERIVED from the set's 16-bit displacement map (its .exr normal can't
   be read by sharp; a height→normal sobel off the same scan is equivalent) —
   see scripts note. Tiled and muted so it reads as a wall well behind the
   subject. A deliberately different surface from the wood desk. */
function loadStudioWall(loader: THREE.TextureLoader) {
  const setup = (url: string, srgb: boolean) => {
    const t = loader.load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 1.6);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return {
    map: setup('/textures/poloroid/wall_color.jpg', true),
    normalMap: setup('/textures/poloroid/wall_normal.jpg', false),
    roughnessMap: setup('/textures/poloroid/wall_rough.jpg', false),
  };
}

/** One polaroid's full front face (photo window + Candice header + lorem). */
function buildPolaroidFace(
  item: { no: string; title: string; body: string; accent: string },
  headerFamily: string,
  bodyFamily: string
): { tex: THREE.CanvasTexture; redraw: () => void } {
  const W = 512;
  const H = 632;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  const draw = () => {
    // paper
    ctx.fillStyle = '#f6f3ea';
    ctx.fillRect(0, 0, W, H);
    // exposure window
    const wx = W * 0.075;
    const wy = H * 0.06;
    const ww = W * 0.85;
    const wh = H * 0.66;
    const grad = ctx.createRadialGradient(wx + ww * 0.5, wy + wh * 0.38, 20, wx + ww * 0.5, wy + wh * 0.55, ww * 0.85);
    grad.addColorStop(0, item.accent);
    grad.addColorStop(0.6, shade(item.accent, -0.32));
    grad.addColorStop(1, '#0c0a12');
    ctx.fillStyle = grad;
    ctx.fillRect(wx, wy, ww, wh);
    // big faint number motif
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.font = `700 ${Math.round(wh * 0.7)}px ${bodyFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.no, wx + ww * 0.5, wy + wh * 0.5);
    // flash hotspot + grain
    const hot = ctx.createRadialGradient(wx + ww * 0.42, wy + wh * 0.3, 8, wx + ww * 0.42, wy + wh * 0.3, ww * 0.5);
    hot.addColorStop(0, 'rgba(255,246,225,0.3)');
    hot.addColorStop(1, 'rgba(255,246,225,0)');
    ctx.fillStyle = hot;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.save();
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
      ctx.fillRect(wx + Math.random() * ww, wy + Math.random() * wh, 1, 1);
    }
    ctx.restore();
    // window inner shadow frame
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(wx, wy, ww, wh);

    // chin: header + body
    const cy = wy + wh + H * 0.02;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = item.accent;
    ctx.font = `400 46px ${headerFamily}`;
    ctx.fillText(item.title, wx, cy);
    ctx.fillStyle = '#4a3f39';
    ctx.font = `400 18px ${bodyFamily}`;
    wrapText(ctx, item.body, wx, cy + 58, ww, 23);
  };

  draw();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return {
    tex,
    redraw: () => {
      draw();
      tex.needsUpdate = true;
    },
  };
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lh;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const f = amt < 0 ? 1 + amt : 1;
  const add = amt < 0 ? 0 : amt * 255;
  r = Math.round(r * f + add);
  g = Math.round(g * f + add);
  b = Math.round(b * f + add);
  return `rgb(${r},${g},${b})`;
}

/* ══════════════════════════════════════════════════════════════════════════
   Printed photos — one mesh group per section, posed by pose()
   ══════════════════════════════════════════════════════════════════════════ */
type PhotoHandles = {
  group: THREE.Group;
  develop: THREE.MeshBasicMaterial;
};

function PrintedPhotos({
  registerRef,
}: {
  registerRef: (i: number, h: PhotoHandles | null) => void;
}) {
  const faces = useMemo(() => {
    const hf = pacifico.style.fontFamily;
    const bf = spaceGrotesk.style.fontFamily;
    return whatWeDoItems.map((it) => buildPolaroidFace(it, hf, bf));
  }, []);

  // redraw once the web fonts are ready (canvas text needs the loaded face)
  useEffect(() => {
    let alive = true;
    const fam = `400 46px ${pacifico.style.fontFamily}`;
    const famB = `400 18px ${spaceGrotesk.style.fontFamily}`;
    Promise.all([
      (document as Document).fonts.load(fam).catch(() => {}),
      (document as Document).fonts.load(famB).catch(() => {}),
    ]).then(() => {
      if (alive) faces.forEach((f) => f.redraw());
    });
    return () => {
      alive = false;
    };
  }, [faces]);

  useEffect(() => () => faces.forEach((f) => f.tex.dispose()), [faces]);

  return (
    <>
      {whatWeDoItems.map((item, i) => (
        <PhotoBody key={item.no} index={i} face={faces[i].tex} registerRef={registerRef} />
      ))}
    </>
  );
}

/** A single polaroid: thin white slab + textured front + milky develop overlay. */
function PhotoBody({
  index,
  face,
  registerRef,
}: {
  index: number;
  face: THREE.CanvasTexture;
  registerRef: (i: number, h: PhotoHandles | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const developMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#d7dace', transparent: true, opacity: 1 }), []);
  useEffect(() => {
    if (groupRef.current) registerRef(index, { group: groupRef.current, develop: developMat });
    return () => registerRef(index, null);
  }, [index, developMat, registerRef]);
  useEffect(() => () => developMat.dispose(), [developMat]);

  return (
    <group ref={groupRef} visible={false}>
      {/* slab (gives thickness + white edges/back) */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.85, 0.04]} />
        <meshStandardMaterial color="#f4f1e8" roughness={0.75} metalness={0} />
      </mesh>
      {/* printed front */}
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={[1.5, 1.85]} />
        <meshStandardMaterial map={face} roughness={0.72} metalness={0} />
      </mesh>
      {/* developing emulsion — sized + placed to the exposure window */}
      <mesh position={[0, 0.2, 0.03]} material={developMat}>
        <planeGeometry args={[1.3, 1.24]} />
      </mesh>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   The real Meshy-generated Polaroid (compressed GLB, meshopt + webp)
   ══════════════════════════════════════════════════════════════════════════ */
/** Wrapper transform that normalises the model into scene space (front → +Z,
 *  sized + centred to the rig). Tuned to the asset below. */
const MODEL_SCALE = 1.7;
const MODEL_POS: [number, number, number] = [0, 0, 0];
const MODEL_ROT: [number, number, number] = [0, 0, 0];

function PolaroidModel() {
  // meshopt is auto-configured by drei; draco disabled (asset uses neither)
  const { scene } = useGLTF('/models/polaroid.glb', false);
  const model = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat) mat.envMapIntensity = 0.9;
      }
    });
    return c;
  }, [scene]);
  return (
    <group position={MODEL_POS} rotation={MODEL_ROT} scale={MODEL_SCALE}>
      <primitive object={model} />
    </group>
  );
}
useGLTF.preload('/models/polaroid.glb');

/* ══════════════════════════════════════════════════════════════════════════
   Scene — env, lights, camera, and the single pose() driver
   ══════════════════════════════════════════════════════════════════════════ */
function Scene({ progressRef }: { progressRef: React.RefObject<number> }) {
  const { camera, gl, scene, pointer } = useThree();
  const photoRefs = useRef<(PhotoHandles | null)[]>([]);
  const shimmerRef = useRef<THREE.PointLight>(null);
  const blueRayRef = useRef<THREE.PointLight>(null);
  const registerRef = React.useCallback((i: number, h: PhotoHandles | null) => {
    photoRefs.current[i] = h;
  }, []);

  // reusable temporaries
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpLook = useMemo(() => new THREE.Vector3(), []);
  const tmpA = useMemo(() => new THREE.Vector3(), []);
  const tmpB = useMemo(() => new THREE.Vector3(), []);

  // studio environment
  useEffect(() => {
    const env = buildStudioEnv(gl);
    scene.environment = env;
    scene.environmentIntensity = 1.0;
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene]);

  // the set: a wood table + a concrete backdrop (two distinct scanned surfaces)
  const wood = useMemo(() => loadDeskWood(new THREE.TextureLoader()), []);
  const wall = useMemo(() => loadStudioWall(new THREE.TextureLoader()), []);
  useEffect(
    () => () => {
      [wood.map, wood.normalMap, wood.roughnessMap, wall.map, wall.normalMap, wall.roughnessMap].forEach((t) =>
        t.dispose()
      );
    },
    [wood, wall]
  );

  const N = whatWeDoItems.length;

  /* the single scene driver — camera + every print, from one scalar */
  const pose = React.useCallback(
    (p: number, px = 0, py = 0) => {
      const cam = camera as THREE.PerspectiveCamera;
      sampleVec(POS_KEYS, p, tmpPos);
      sampleVec(LOOK_KEYS, p, tmpLook);
      // pointer parallax, only once we've pulled back out of the lens
      const par = smooth(0.34, 0.55, p) * 0.5;
      tmpPos.y += py * par;
      cam.position.copy(tmpPos);
      cam.lookAt(tmpLook);
      const fov = sampleNum(FOV_KEYS, p);
      if (Math.abs(cam.fov - fov) > 0.01) {
        cam.fov = fov;
        cam.updateProjectionMatrix();
      }

      // prints
      const seg = (CONTENT_B - CONTENT_A) / N;
      for (let i = 0; i < N; i++) {
        const h = photoRefs.current[i];
        if (!h) continue;
        const start = CONTENT_A + i * seg;
        const emerge = easeOut(smooth(start, start + seg * 0.62, p));
        const develop = smooth(start + seg * 0.3, start + seg * 1.25, p);
        const st = STACK[i % STACK.length];

        if (emerge <= 0.001) {
          h.group.visible = false;
          continue;
        }
        h.group.visible = true;
        // position: slot → stack, sliding down/out
        tmpA.copy(SLOT);
        tmpB.set(st.pos[0], st.pos[1], st.pos[2]);
        h.group.position.lerpVectors(tmpA, tmpB, emerge);
        // rotation: upright at the slot → laid-back stack pose
        h.group.rotation.set(st.rot[0] * emerge, st.rot[1] * emerge, st.rot[2] * emerge);
        // scale: a touch small as it clears the slot, to sell the eject
        const s = lerp(0.86, 1.25, emerge);
        h.group.scale.setScalar(s);
        h.develop.opacity = 1 - develop;
      }
    },
    [camera, N, tmpPos, tmpLook, tmpA, tmpB]
  );

  useFrame((state) => {
    pose(progressRef.current ?? 0, pointer.x, pointer.y);
    // shimmer: a warm highlight sweeps so the glossy prints catch a rhythmic
    // specular; the blue lower-right ray breathes faintly against it.
    const t = state.clock.elapsedTime;
    if (shimmerRef.current) {
      shimmerRef.current.position.x = Math.sin(t * 0.5) * 3.4;
      shimmerRef.current.intensity = 4 + Math.sin(t * 0.9) * 1.2;
    }
    if (blueRayRef.current) blueRayRef.current.intensity = 6.5 + Math.sin(t * 0.7) * 1.5;
  });

  return (
    <>
      {/* Contained depth — an even dark fog fades the far desk and the wall
          edges into the void, so the set reads as a shallow, deliberate space
          rather than an infinite plane receding into black. Near sits past the
          subject at every camera keyframe, so the Polaroid is never fogged;
          colour matches the canvas clear so the fade has no seam. */}
      <fog attach="fog" args={[0x17141c, 8, 26]} />

      <ambientLight intensity={0.42} color="#fff0dc" />
      {/* warm amber key */}
      <directionalLight
        position={[5, 7, 6]}
        intensity={1.5}
        color="#ffe9cf"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0006}
      />
      {/* soft neutral fill */}
      <directionalLight position={[-6, 3, 4]} intensity={0.4} color="#e2e8f2" />
      {/* warm rim from behind */}
      <pointLight position={[-2, 1.5, -4]} intensity={9} distance={14} decay={2} color="#ffce97" />
      {/* the ONE faint blue ray at the lower-right (breathes in useFrame) */}
      <pointLight ref={blueRayRef} position={[7, -1.2, 5]} intensity={6.5} distance={18} decay={2} color="#59a0ff" />
      {/* shimmer sweep — animated warm highlight for the glossy prints */}
      <pointLight ref={shimmerRef} position={[0, 4, 5]} intensity={4} distance={16} decay={2} color="#fff6e8" />
      {/* faint aperture fill so the inside-lens moment isn't pure black */}
      <pointLight position={[0, 0.34, 3.0]} intensity={2.2} distance={6} decay={2} color="#ffffff" />

      {/* the wooden desk the camera + prints rest on */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.66, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          map={wood.map}
          normalMap={wood.normalMap}
          normalScale={[1, 1]}
          roughnessMap={wood.roughnessMap}
          roughness={1}
          metalness={0}
          envMapIntensity={0.55}
        />
      </mesh>

      {/* aged plaster backdrop — closes the void behind the subject so the set
          reads as a shallow, deliberate space. Its base sits below the desk
          line, so the desk occludes the seam where they meet. */}
      <mesh position={[0, 3.4, -4.6]} receiveShadow>
        <planeGeometry args={[34, 13]} />
        <meshStandardMaterial
          map={wall.map}
          normalMap={wall.normalMap}
          normalScale={[1, 1]}
          roughnessMap={wall.roughnessMap}
          roughness={1}
          metalness={0}
          color="#a7a29a"
          envMapIntensity={0.22}
        />
      </mesh>

      <PolaroidModel />
      <PrintedPhotos registerRef={registerRef} />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Public component
   ══════════════════════════════════════════════════════════════════════════ */
export default function PolaroidScene({ progressRef }: { progressRef: React.RefObject<number> }) {
  return (
    <Canvas
      camera={{ position: [0, 0.35, 1.62], fov: 70, near: 0.01, far: 100 }}
      dpr={[1, 1.5]}
      shadows="soft"
      gl={{ antialias: true, powerPreference: 'high-performance', toneMappingExposure: 1.1 }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#17141c' }}
    >
      <Scene progressRef={progressRef} />
    </Canvas>
  );
}

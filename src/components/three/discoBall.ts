import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════
   Disco Ball — procedural, high-LOD.  (NOT public/models/disco_ball.glb)

   The whole "shimmer" read is carried by three cheap things, in order of
   importance:
     1. a warm-nightlife environment map with a few BRIGHT hotspots — this is
        what the mirror tiles actually reflect, so it IS the sparkle. A flat
        env gives flat tiles; the hotspots are the point.
     2. ~1000 individually-oriented mirror tiles on one InstancedMesh (one
        draw call) so the facets are real geometry, sharp at close-up.
     3. a per-tile emissive twinkle patched into the standard material, plus a
        slow ball spin so tiles sweep past the hotspots.
   The warm amber rays are a single additive billboard behind the ball.
   ═══════════════════════════════════════════════════════════════════════ */

/* Small deterministic PRNG so the tile layout + twinkle phases are stable
   across reloads (kept local to avoid pulling in the heavy wall module). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   Warm nightlife environment (equirect → PMREM).

   A dark, warm dome with a handful of bright spotlight blobs. The tiles are
   near-mirrors, so these blobs become the crisp high-contrast reflections
   from the reference photo; the ball rotating past them is the twinkle.
   One cool violet accent keeps the 70s palette's aqua/purple undertone alive
   against all the amber.
   ───────────────────────────────────────────────────────────────────────── */
export function buildNightlifeEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  // Mostly-dark warm room, so the bright sources read as GLARE, not a wash.
  // The single over-exposed key is what puts the white hotspot on the ball;
  // the amber/orange/red fills give the reference photo's colour variety and
  // the cool accent stops it collapsing to one flat orange.
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0.0, '#0b0603'); // near-black warm
  g.addColorStop(0.34, '#1c0f06');
  g.addColorStop(0.5, '#2a1608'); // dim warm mid
  g.addColorStop(0.66, '#180d05');
  g.addColorStop(1.0, '#070402');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);

  // Additive radial light sources.
  const blob = (x: number, y: number, r: number, inner: string) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, inner);
    rg.addColorStop(0.5, inner.replace(')', ', 0.5)').replace('rgb', 'rgba'));
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  ctx.globalCompositeOperation = 'lighter';
  // One intense, over-exposed key light (double blob for a blown-out core) —
  // this is the white glare that streaks across the tiles as the ball turns.
  blob(232, 74, 94, 'rgb(255,246,224)');
  blob(232, 72, 44, 'rgb(255,255,255)');
  // Warm amber + orange fills.
  blob(366, 122, 78, 'rgb(255,166,80)');
  blob(148, 150, 86, 'rgb(232,96,26)');
  // Deep warm red pool (the reference's red facets).
  blob(300, 202, 66, 'rgb(198,44,20)');
  // Cool violet accent — keeps the 70s aqua/purple undertone alive.
  blob(74, 92, 42, 'rgb(96,72,210)');
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromEquirectangular(tex);
  tex.dispose();
  pmrem.dispose();
  return rt.texture;
}

/* ─────────────────────────────────────────────────────────────────────────
   Tile layout — classic disco ball: horizontal latitude rings, each with a
   tile count proportional to its circumference so the grout gaps stay even.
   Returns a unit BoxGeometry (scaled per-instance) carrying a per-instance
   `aPhase` attribute for the twinkle, plus the composed instance matrices.
   ───────────────────────────────────────────────────────────────────────── */
export function buildDiscoTiles(
  radius = 1.5,
  rings = 28,
  baseCount = 56
): { tileGeo: THREE.BoxGeometry; matrices: THREE.Matrix4[]; count: number } {
  const rng = mulberry32(20260717);
  const matrices: THREE.Matrix4[] = [];
  const phases: number[] = [];

  const outward = new THREE.Vector3(0, 0, 1); // box front (+Z) faces radially out
  const dir = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  const latMin = -82 * (Math.PI / 180);
  const latMax = 82 * (Math.PI / 180);
  const tileDepth = 0.02; // flat mirror facets, not chunky boxes

  // Row height is the meridian arc between rings. With baseCount ≈ 2·rings the
  // equator tiles come out roughly square, matching the reference's grid.
  const tileH = (((latMax - latMin) * radius) / (rings - 1)) * 0.9;

  for (let i = 0; i < rings; i++) {
    const t = rings === 1 ? 0.5 : i / (rings - 1);
    const lat = latMin + (latMax - latMin) * t;
    const cosLat = Math.cos(lat);
    const n = Math.max(1, Math.round(baseCount * cosLat));

    // Brick-offset alternate rows (half a tile) — real disco balls stagger, and
    // it reads far cleaner than the previous random per-tile tilt, which was the
    // "misaligned" look. Tiles now sit flush in tidy latitude bands.
    const thetaOffset = (i % 2) * (Math.PI / n);
    const tileW = ((2 * Math.PI * radius * cosLat) / n) * 0.9; // 0.9 → thin grout gap

    for (let j = 0; j < n; j++) {
      const theta = thetaOffset + (j / n) * Math.PI * 2;
      dir.set(cosLat * Math.cos(theta), Math.sin(lat), cosLat * Math.sin(theta)).normalize();
      pos.copy(dir).multiplyScalar(radius - tileDepth * 0.5);

      // No random tilt — each tile's front faces exactly outward for clean,
      // aligned facets. The shimmer comes from the env hotspots + scroll spin.
      quat.setFromUnitVectors(outward, dir);

      scale.set(Math.max(tileW, 0.03), Math.max(tileH, 0.03), tileDepth);
      matrices.push(new THREE.Matrix4().compose(pos.clone(), quat.clone(), scale.clone()));
      phases.push(rng());
    }
  }

  const tileGeo = new THREE.BoxGeometry(1, 1, 1);
  tileGeo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(new Float32Array(phases), 1));
  return { tileGeo, matrices, count: matrices.length };
}

/* ─────────────────────────────────────────────────────────────────────────
   Mirror-tile material: standard PBR (metalness 1, low roughness) reflecting
   the nightlife env, with a per-instance emissive twinkle patched in so
   individual tiles spark white-hot on their own rhythm.
   ───────────────────────────────────────────────────────────────────────── */
export function makeTwinkleMaterial(env: THREE.Texture): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#fff4e2'),
    metalness: 1.0,
    roughness: 0.11,
    envMap: env,
    envMapIntensity: 2.3,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uTwinkleColor = { value: new THREE.Color('#fff1cf') };
    shader.uniforms.uTwinkleStrength = { value: 2.6 };

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aPhase;\nvarying float vPhase;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vPhase = aPhase;');

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uTime;\nuniform vec3 uTwinkleColor;\nuniform float uTwinkleStrength;\nvarying float vPhase;'
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
  float _slow = 0.5 + 0.5 * sin(uTime * 2.3 + vPhase * 6.2831853);
  _slow = pow(_slow, 9.0);
  float _fast = 0.5 + 0.5 * sin(uTime * 5.9 + vPhase * 21.7);
  _fast = pow(_fast, 18.0);
  totalEmissiveRadiance += uTwinkleColor * (_slow * 0.6 + _fast) * uTwinkleStrength;`
      );

    mat.userData.shader = shader;
  };

  return mat;
}

/* ─────────────────────────────────────────────────────────────────────────
   Warm amber rays + halo — one additive billboard behind the ball. Radial
   streaks in polar space, biased downward like the reference, graded core →
   inner → outer. depthTest on / depthWrite off so the ball silhouette
   occludes the core and the rays fan out from behind it.
   ───────────────────────────────────────────────────────────────────────── */
export function makeRayMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.SrcAlphaFactor,
    blendDst: THREE.OneFactor,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 1 },
      uColorCore: { value: new THREE.Color('#fff2d0') },
      uColorInner: { value: new THREE.Color('#ffb861') },
      uColorOuter: { value: new THREE.Color('#e8641a') },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uIntensity;
      uniform vec3 uColorCore;
      uniform vec3 uColorInner;
      uniform vec3 uColorOuter;

      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0;         // 0 center → ~1 at plane edge
        float a = atan(p.y, p.x);

        // Overlapping radial streak sets at different frequencies + drift.
        float rays = 0.0;
        rays += pow(0.5 + 0.5 * sin(a * 20.0 + uTime * 0.22), 5.0) * 0.62;
        rays += pow(0.5 + 0.5 * sin(a * 12.0 - uTime * 0.15 + 1.7), 7.0) * 0.52;
        rays += pow(0.5 + 0.5 * sin(a * 33.0 + uTime * 0.36 + 4.0), 9.0) * 0.38;

        // Reference fans the light strongly downward off the ball.
        float downBias = mix(0.45, 1.55, clamp(0.5 - p.y, 0.0, 1.0));
        rays *= downBias;

        // Slow radial falloff (0.8) → long shafts. The halo is kept tight so
        // the centre glow hugs the ball instead of washing the whole frame;
        // the streaks carry the length.
        float streaks = rays * pow(clamp(1.0 - r, 0.0, 1.0), 0.8);
        float halo = exp(-r * r * 4.2);              // tight glow ring around the ball
        float core = pow(clamp(1.0 - r, 0.0, 1.0), 3.0);
        float glow = (streaks * 1.1 + halo * 0.6 + core * 0.45) * uIntensity;

        vec3 col = uColorCore;
        col = mix(col, uColorInner, smoothstep(0.0, 0.35, r));
        col = mix(col, uColorOuter, smoothstep(0.35, 0.95, r));

        gl_FragColor = vec4(col, clamp(glow, 0.0, 1.0));
      }
    `,
  });
}

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
   Nightlife environment (equirect → PMREM). This IS the sparkle: the mirror
   plates are near-perfect reflectors, so each facet samples ONE point of this
   dome. To read like the reference photos — a bright ball densely peppered with
   warm+cool sparkle, not a black orb with six dim patches — the dome needs:

     • MANY smallish, BRIGHT spotlights spread all around, so lots of facets
       (whatever direction they face) land on a light → dense sparkle.
     • A soft, dim room-glow band lifting the whole thing off pure black, so the
       "dark" facets read as dim reflections, not dead voids.
     • Warm (amber/gold/white) dominant, with cool (cyan/blue/violet) crossing,
       so the palette reads warm-AND-cool like stage gels.
     • A few tiny near-white pinpoints for the hot flashes that make it twinkle.

   Higher res (1024×512) so the facet reflections stay crisp points, not smears.
   Brightness is meant to be REAL here now — the earlier "too dark" note came
   from starving this map. Exposure / envMapIntensity fine-tune from the scene.
   ───────────────────────────────────────────────────────────────────────── */
export function buildNightlifeEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // Dim room base with a warm floor + cool ceiling — lifted well off black so
  // away-facing facets keep a real low reflection (body), not a dead void.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0.0, '#161a24'); // cool dim ceiling
  g.addColorStop(0.45, '#1b1a18');
  g.addColorStop(0.62, '#2a2013'); // warm dim mid (dance-floor bounce)
  g.addColorStop(1.0, '#18120b'); // warm floor
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Broad soft room-glow so the whole ball reads bright, warm-dominant. Big low
  // blobs = the ambient bounce that lights the MANY facets between the spots.
  const soft = (x: number, y: number, r: number, col: string, a: number) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, col.replace('%A%', String(a)));
    rg.addColorStop(0.6, col.replace('%A%', String(a * 0.4)));
    rg.addColorStop(1, col.replace('%A%', '0'));
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  ctx.globalCompositeOperation = 'lighter';
  soft(380, 250, 500, 'rgba(190,138,84,%A%)', 0.95); // warm room bounce (dominant)
  soft(170, 300, 380, 'rgba(210,150,88,%A%)', 0.7); // warm left fill
  soft(760, 210, 420, 'rgba(88,122,178,%A%)', 0.6); // cool room bounce (accent)

  // Bright spotlights — the sparkle sources. Fuller, harder core (holds full
  // brightness out to ~55% of the radius) so a flat facet reflecting one reads
  // as a solid bright tile, with just a little bloom at the edge.
  const spot = (x: number, y: number, r: number, inner: string) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, inner);
    rg.addColorStop(0.55, inner.replace(')', ', 0.85)').replace('rgb', 'rgba'));
    rg.addColorStop(0.8, inner.replace(')', ', 0.3)').replace('rgb', 'rgba'));
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  // Warm-white keys spread across all longitudes + both hemispheres, so facets
  // facing ANY direction (rim AND the camera-facing centre) land on a light and
  // the whole ball sparkles — not just the grazing rim.
  spot(150, 150, 80, 'rgb(255,249,236)');
  spot(500, 180, 84, 'rgb(255,248,232)');
  spot(860, 150, 78, 'rgb(255,247,230)');
  spot(330, 350, 78, 'rgb(255,246,228)');
  spot(710, 360, 80, 'rgb(255,248,232)');
  // Gold / amber — the dominant colour, evenly distributed.
  spot(60, 270, 60, 'rgb(255,198,124)');
  spot(270, 210, 58, 'rgb(246,176,96)');
  spot(420, 110, 56, 'rgb(255,190,110)');
  spot(600, 290, 60, 'rgb(250,182,104)');
  spot(790, 230, 58, 'rgb(255,196,120)');
  spot(950, 320, 58, 'rgb(240,168,90)');
  spot(400, 430, 56, 'rgb(252,184,106)');
  spot(760, 90, 52, 'rgb(255,190,110)');
  // Cool cyan / blue accents (fewer & a touch smaller — warm stays dominant).
  spot(200, 410, 52, 'rgb(104,168,226)');
  spot(560, 420, 48, 'rgb(120,196,224)');
  spot(880, 415, 50, 'rgb(110,180,230)');
  spot(120, 350, 46, 'rgb(96,150,220)');
  // Violet + teal (70s aqua/purple undertone).
  spot(340, 80, 44, 'rgb(158,116,220)');
  spot(985, 180, 42, 'rgb(80,186,176)');
  // Tiny near-white pinpoints — the hot flashes that twinkle as the ball turns.
  spot(150, 150, 16, 'rgb(255,255,255)');
  spot(500, 182, 16, 'rgb(255,255,255)');
  spot(860, 152, 15, 'rgb(255,255,255)');
  spot(330, 350, 15, 'rgb(255,255,255)');
  spot(710, 360, 15, 'rgb(255,255,255)');
  spot(600, 290, 13, 'rgb(255,255,255)');
  spot(950, 320, 12, 'rgb(255,255,255)');
  spot(270, 210, 12, 'rgb(255,255,255)');
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

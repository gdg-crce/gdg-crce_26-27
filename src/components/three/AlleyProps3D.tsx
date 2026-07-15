'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════════
   1. WALL DECALS & ARCHITECTURAL WEATHERING (Clean, subtle, NO spiders)
   Breaks up brick repetition using soft organic plaster patches, vertical
   water runoff stains beneath pipes/windows, and authentic vintage poster remnants.
   ═══════════════════════════════════════════════════════════════════════════ */

export function WallDecalsAndGrime() {
  const [grimeTex, tornPosterTex, graffitiPatchTex, stickerBombTex, weedTex] = useMemo(() => {
    // 2. Vertical Rain Runoff Streaks
    const gCanvas = document.createElement('canvas');
    gCanvas.width = 256;
    gCanvas.height = 512;
    const gCtx = gCanvas.getContext('2d')!;
    const gGrad = gCtx.createLinearGradient(0, 0, 0, 512);
    gGrad.addColorStop(0, 'rgba(16, 13, 12, 0.65)');
    gGrad.addColorStop(0.45, 'rgba(20, 17, 15, 0.32)');
    gGrad.addColorStop(1, 'rgba(20, 17, 15, 0.0)');
    gCtx.fillStyle = gGrad;
    gCtx.fillRect(0, 0, 256, 512);
    const gTex = new THREE.CanvasTexture(gCanvas);

    // 3B. Second Poster: Dramatic Zigzag Torn Half-Poster Remnant
    const tCanvas = document.createElement('canvas');
    tCanvas.width = 512;
    tCanvas.height = 256;
    const tCtx = tCanvas.getContext('2d')!;
    tCtx.clearRect(0, 0, 512, 256);

    tCtx.beginPath();
    tCtx.moveTo(20, 20);
    tCtx.lineTo(260, 20);
    const ripPoints = [
      [350, 50],
      [215, 85],
      [340, 120],
      [210, 155],
      [325, 190],
      [230, 215],
      [270, 236],
    ];
    ripPoints.forEach(([rx, ry]) => tCtx.lineTo(rx, ry));
    tCtx.lineTo(20, 236);
    tCtx.closePath();

    tCtx.fillStyle = 'rgba(188, 180, 166, 0.94)';
    tCtx.fill();

    tCtx.strokeStyle = 'rgba(240, 232, 218, 0.98)';
    tCtx.lineWidth = 5;
    tCtx.stroke();

    tCtx.textAlign = 'left';
    tCtx.font = 'bold 30px "Courier New", monospace';
    tCtx.fillStyle = 'rgba(55, 48, 40, 0.88)';
    tCtx.fillText('GDG ARCH', 45, 85);

    tCtx.font = 'bold 21px monospace';
    tCtx.fillStyle = 'rgba(80, 70, 60, 0.84)';
    tCtx.fillText('SUNÉKHEIA /', 45, 135);

    tCtx.font = 'italic 17px monospace';
    tCtx.fillStyle = 'rgba(140, 45, 35, 0.8)';
    tCtx.fillText('[ TORN REM', 45, 182);

    const tornTex = new THREE.CanvasTexture(tCanvas);

    // 6. Middle Reference Panel: Peeling Stucco with Cyan & Rust Spray Tags
    const gpCanvas = document.createElement('canvas');
    gpCanvas.width = 512;
    gpCanvas.height = 256;
    const gpCtx = gpCanvas.getContext('2d')!;
    gpCtx.clearRect(0, 0, 512, 256);

    // Cyan spray tag (left)
    gpCtx.font = 'italic 900 58px Impact, sans-serif';
    gpCtx.fillStyle = '#00C8BA';
    gpCtx.fillText('CRCE 94', 40, 110);

    // Rust-red spray tag (right)
    gpCtx.font = 'italic 900 52px Impact, sans-serif';
    gpCtx.fillStyle = '#A83B2C';
    gpCtx.fillText('LEGACY', 270, 165);

    const gpTex = new THREE.CanvasTexture(gpCanvas);

    // 8. Authentic 90s Grunge Sticker Bombing & Flyer Scrap Cluster
    const sbCanvas = document.createElement('canvas');
    sbCanvas.width = 512;
    sbCanvas.height = 256;
    const sbCtx = sbCanvas.getContext('2d')!;
    sbCtx.clearRect(0, 0, 512, 256);

    // PARENTAL ADVISORY EXPLICIT CONTENT sticker
    sbCtx.fillStyle = '#111111';
    sbCtx.fillRect(25, 30, 180, 85);
    sbCtx.strokeStyle = '#FFFFFF';
    sbCtx.lineWidth = 3;
    sbCtx.strokeRect(30, 35, 170, 75);
    sbCtx.fillStyle = '#FFFFFF';
    sbCtx.font = '900 18px Impact, sans-serif';
    sbCtx.fillText('PARENTAL', 115, 60);
    sbCtx.fillText('ADVISORY', 115, 82);
    sbCtx.font = 'bold 11px monospace';
    sbCtx.fillText('EXPLICIT UNDERGROUND', 115, 100);

    // Yellowed barcoded 90s gig pass sticker
    sbCtx.fillStyle = '#E8DFB8';
    sbCtx.fillRect(225, 45, 160, 110);
    sbCtx.fillStyle = '#1A1412';
    sbCtx.font = 'bold 16px monospace';
    sbCtx.fillText('REC // 1994', 305, 75);
    // Barcode stripes
    for (let bx = 245; bx < 365; bx += 8) {
      sbCtx.fillRect(bx, 90, 4 + (bx % 3), 45);
    }

    // Muddy rain splatter over stickers
    sbCtx.fillStyle = 'rgba(32, 28, 24, 0.45)';
    for (let i = 0; i < 40; i++) {
      sbCtx.beginPath();
      sbCtx.arc(Math.random() * 512, Math.random() * 256, 2 + Math.random() * 8, 0, Math.PI * 2);
      sbCtx.fill();
    }

    const sbTex = new THREE.CanvasTexture(sbCanvas);

    // 9. Weed tuft alpha card — blades splaying from a common root, tapering to
    // a point, each bending a little further than the last. Drawn rather than
    // modelled because grass has no volume worth spending triangles on.
    const wCanvas = document.createElement('canvas');
    wCanvas.width = 256;
    wCanvas.height = 256;
    const wCtx = wCanvas.getContext('2d')!;
    wCtx.clearRect(0, 0, 256, 256);
    for (let i = 0; i < 17; i++) {
      const t = i / 16;
      const rootX = 108 + t * 40 + (Math.random() - 0.5) * 22;
      const lean = (t - 0.5) * 2.1 + (Math.random() - 0.5) * 0.5;
      const len = 120 + Math.random() * 105;
      const tipX = rootX + lean * 62;
      const tipY = 250 - len;
      const bulge = 5 + Math.random() * 4;
      // Each blade: a curved sliver, wide at the root, pinched at the tip
      wCtx.beginPath();
      wCtx.moveTo(rootX - bulge, 252);
      wCtx.quadraticCurveTo(rootX - bulge * 0.7 + lean * 20, 252 - len * 0.55, tipX, tipY);
      wCtx.quadraticCurveTo(rootX + bulge * 0.7 + lean * 20, 252 - len * 0.55, rootX + bulge, 252);
      wCtx.closePath();
      const shade = 150 + Math.floor(Math.random() * 105);
      wCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
      wCtx.fill();
    }
    const weedTex = new THREE.CanvasTexture(wCanvas);
    weedTex.colorSpace = THREE.SRGBColorSpace;

    return [gTex, tornTex, gpTex, sbTex, weedTex];
  }, []);

  const plasterPositions: [number, number, number][] = [
    [-21.0, 4.6, 0.004],
    [-15.5, 2.2, 0.004],
    [-9.0, 5.2, 0.004],
    [-3.2, 1.9, 0.004],
    [3.5, 5.0, 0.004],
    [9.5, 2.1, 0.004],
    [16.2, 5.2, 0.004],
    [21.5, 3.2, 0.004],
  ];

  /**
   * Runoff streaks, anchored to the features that actually shed water.
   *
   * These used to be ten quads evenly spaced along the wall at a constant
   * y = 4.4 — a metronome of identical stains at identical heights, none of
   * them near the drain pipes standing right there. Nothing said "this stain
   * has a cause", and evenly-spaced anything is the fastest way to read as
   * procedural.
   *
   * X now matches the drain pipes (AlleyIndustrialDetails, x = -24/-13/-2/9/21)
   * and the vent sills (x = -18/2/14). The pipes leak from high up and stain
   * long; the sills only catch what lands on them and stain short. The broad
   * soft version of this is baked into the wall's macro layer — these add the
   * sharper near-field detail on top of it.
   */
  const grimePositions: [number, number, number, number][] = [
    // [x, y, z, height] — pipes: long stains, offset slightly to one side
    [-23.7, 4.2, 0.005, 6.4],
    [-12.7, 4.4, 0.005, 6.8],
    [-1.7, 4.1, 0.005, 6.2],
    [9.3, 4.5, 0.005, 6.6],
    [21.3, 4.3, 0.005, 6.4],
    // sills: shorter, wider fans starting below the window
    [-18, 3.4, 0.005, 3.6],
    [2, 3.5, 0.005, 3.4],
    [14, 3.4, 0.005, 3.6],
  ];

  return (
    <group>
      
      {/* Gravity runoff beneath the pipes and sills that cause it */}
      {grimePositions.map(([gx, gy, gz, gh], i) => (
        <mesh key={`grime-${i}`} position={[gx, gy, gz]} receiveShadow>
          <planeGeometry args={[i < 5 ? 1.3 : 2.6, gh]} />
          <meshStandardMaterial
            map={grimeTex}
            transparent={true}
            opacity={0.85}
            depthWrite={false}
            roughness={0.95}
            metalness={0}
            envMapIntensity={0.3}
            polygonOffset={true}
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      ))}

      
      {/* Middle Reference Panel: Peeling Stucco with Cyan & Rust Graffiti Spray Tags */}
      <mesh position={[2.8, 2.1, 0.007]} receiveShadow>
        <planeGeometry args={[3.6, 1.8]} />
        <meshStandardMaterial
          map={graffitiPatchTex}
          transparent={true}
          depthWrite={false}
          roughness={0.88}
          polygonOffset={true}
          polygonOffsetFactor={-3}
          polygonOffsetUnits={-3}
        />
      </mesh>

      
      
      {/* 2nd Heritage Poster: Dramatic Zigzag Ripped Torn Half-Poster */}
      <mesh position={[13.2, 2.3, 0.008]} receiveShadow>
        <planeGeometry args={[2.6, 1.5]} />
        <meshStandardMaterial
          map={tornPosterTex}
          transparent={true}
          depthWrite={false}
          roughness={0.85}
          polygonOffset={true}
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* 90s Underground Sticker Bombing & Parental Advisory Stamp Clusters */}
      {[-11.8, 8.4, 21.2].map((sx, i) => (
        <mesh key={`sticker-bomb-${i}`} position={[sx, 2.15 + (i % 2) * 0.35, 0.016]} receiveShadow>
          <planeGeometry args={[2.4, 1.2]} />
          <meshStandardMaterial
            map={stickerBombTex}
            transparent={true}
            depthWrite={false}
            roughness={0.78}
            polygonOffset={true}
            polygonOffsetFactor={-3}
            polygonOffsetUnits={-3}
          />
        </mesh>
      ))}

      {/* Weeds in the wall/pavement joint.

          These were solid cones in #2E5A34 — which read, unmistakably, as
          traffic cones or little Christmas trees. Cones were never going to be
          weeds: a blade of grass has no volume, and any solid primitive at this
          scale announces itself as a primitive.

          Alpha cards instead. Two crossed quads per tuft with a drawn blade
          mask, so they read as foliage from every angle the camera walks
          through, at a third of the triangles. They also cast no shadow —
          grass this small contributes noise, not shape. */}
      {[-21, -15.4, -8.2, -1.3, 6.4, 12.1, 19.2].map((wx, idx) => (
        <group key={`weed-${idx}`} position={[wx + (idx % 3) * 0.3, 0.2, 0.14]}>
          {[0, Math.PI / 2.2].map((ry, k) => (
            <mesh key={k} rotation={[0, ry + idx * 0.5, (idx % 2 ? 1 : -1) * 0.06]} receiveShadow>
              <planeGeometry args={[0.5 + (idx % 3) * 0.1, 0.42 + (idx % 2) * 0.12]} />
              <meshStandardMaterial
                map={weedTex}
                transparent
                alphaTest={0.42}
                side={THREE.DoubleSide}
                color={idx % 2 ? '#4A5C34' : '#3C4E2C'}
                roughness={0.86}
                metalness={0}
                envMapIntensity={0.35}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. RIGHT-SIDE ARCHITECTURAL DETAIL & BALCONY (Clean, purposeful right-side balance)
   Adds authentic industrial fire-escape utility shelf and perpendicular street blade sign
   to perfectly balance the left-side neon sign without any clutter.
   ═══════════════════════════════════════════════════════════════════════════ */

export function RightSideAlleyDetail() {
  const ironMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#24211E', roughness: 0.65, metalness: 0.85 }),
    []
  );
  const gratingMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#181615', roughness: 0.8, metalness: 0.6 }),
    []
  );

  return (
    <group position={[15.5, 5.2, 0.4]}>
      {/* Structural C-Channel Outer Steel Perimeter Frame */}
      <mesh position={[0, 0, 0.44]} material={ironMat} castShadow receiveShadow>
        <boxGeometry args={[4.4, 0.16, 0.08]} />
      </mesh>
      <mesh position={[0, 0, -0.44]} material={ironMat} castShadow receiveShadow>
        <boxGeometry args={[4.4, 0.16, 0.08]} />
      </mesh>
      <mesh position={[-2.16, 0, 0]} material={ironMat} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.16, 0.96]} />
      </mesh>
      <mesh position={[2.16, 0, 0]} material={ironMat} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.16, 0.96]} />
      </mesh>

      {/* Perforated Industrial Walkway Deck Floor */}
      <mesh position={[0, 0.04, 0]} material={gratingMat} castShadow receiveShadow>
        <boxGeometry args={[4.24, 0.04, 0.82]} />
      </mesh>

      {/* Structural Under-Deck Cross Joists adding rich underside depth */}
      {[-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8].map((jx, idx) => (
        <mesh key={`joist-${idx}`} position={[jx, -0.04, 0]} material={ironMat} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.1, 0.84]} />
        </mesh>
      ))}

      {/* Wall Anchor Wallplates & Cantilever Support Struts */}
      <mesh position={[-1.7, -0.65, -0.46]} material={ironMat} castShadow receiveShadow>
        <boxGeometry args={[0.24, 0.48, 0.04]} />
      </mesh>
      <mesh position={[1.7, -0.65, -0.46]} material={ironMat} castShadow receiveShadow>
        <boxGeometry args={[0.24, 0.48, 0.04]} />
      </mesh>
      <mesh position={[-1.7, -0.42, -0.05]} rotation={[0.62, 0, 0]} material={ironMat} castShadow receiveShadow>
        <boxGeometry args={[0.08, 1.15, 0.08]} />
      </mesh>
      <mesh position={[1.7, -0.42, -0.05]} rotation={[0.62, 0, 0]} material={ironMat} castShadow receiveShadow>
        <boxGeometry args={[0.08, 1.15, 0.08]} />
      </mesh>

      {/* Steel Toe-Board Kickplate along edge */}
      <mesh position={[0, 0.14, 0.42]} material={ironMat} castShadow receiveShadow>
        <boxGeometry args={[4.36, 0.12, 0.03]} />
      </mesh>

      {/* Multi-Tier Safety Railing System */}
      <mesh position={[0, 0.52, 0.42]} rotation={[0, 0, Math.PI / 2]} material={ironMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.024, 0.024, 4.36, 8]} />
      </mesh>
      <mesh position={[0, 0.86, 0.42]} material={ironMat} castShadow receiveShadow>
        <boxGeometry args={[4.38, 0.05, 0.05]} />
      </mesh>
      {[-2.05, -1.35, -0.68, 0, 0.68, 1.35, 2.05].map((rx, i) => (
        <mesh key={`post-${i}`} position={[rx, 0.46, 0.42]} material={ironMat} castShadow receiveShadow>
          <cylinderGeometry args={[0.028, 0.028, 0.8, 8]} />
        </mesh>
      ))}

      {/* Vintage Industrial Caged Light Fixture underneath */}
      <mesh position={[0, -0.16, 0.1]} material={ironMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.15, 0.14, 12]} />
      </mesh>
      <mesh position={[0, -0.22, 0.1]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#FFB060" emissive="#FF8C30" emissiveIntensity={0.8} roughness={0.2} />
      </mesh>

      {/* Dimmed, Soft Atmospheric Industrial Amber Downlight */}
      <pointLight position={[0, -0.32, 0.1]} color="#FF9A40" intensity={25} distance={6.5} decay={2} />
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. ALLEY DEPTH LAYERS (Authentic Urban Z-Depth)
   Overhead utility cables and edge bollards.
   ═══════════════════════════════════════════════════════════════════════════ */

export function AlleyDepthLayers() {
  const cableMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1B1918', roughness: 0.7 }),
    []
  );

  return (
    <group>
      {/* Foreground Hanging Utility Cables / Pillars (Straight & Plumb) */}
      <mesh position={[-14, 6.4, 2.6]} rotation={[0, 0, 0]} material={cableMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.03, 0.03, 22, 8]} />
      </mesh>
      <mesh position={[4, 6.6, 2.9]} rotation={[0, 0, 0]} material={cableMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.028, 0.028, 24, 8]} />
      </mesh>
      <mesh position={[18, 6.3, 2.5]} rotation={[0, 0, 0]} material={cableMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.03, 0.03, 18, 8]} />
      </mesh>

      {/* Street Edge Safety Bollards */}
      {[-20, -8, 8, 20].map((x, i) => (
        <group key={`bollard-${i}`} position={[x, 0.45, 3.1]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.16, 0.18, 0.9, 12]} />
            <meshStandardMaterial color="#2D2926" roughness={0.7} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.26, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.165, 0.165, 0.1, 12]} />
            <meshStandardMaterial color="#D98A1E" roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. URBAN STREET FLOOR & CURB PUDDLES
   Clean sidewalk curb line with flush reflective rainwater pools and cast-iron manholes.
   ═══════════════════════════════════════════════════════════════════════════ */

export function UrbanStreetFloor() {
  const [puddleTex, manholeMat, ringMat, drainMat] = useMemo(() => {
    // Wet puddle texture with soft transparent edges blending into the grey asphalt
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 256;
    pCanvas.height = 256;
    const pCtx = pCanvas.getContext('2d')!;
    const grad = pCtx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(40, 44, 50, 0.78)');
    grad.addColorStop(0.6, 'rgba(48, 52, 58, 0.45)');
    grad.addColorStop(1, 'rgba(48, 52, 58, 0.0)');
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 256, 256);
    const pTex = new THREE.CanvasTexture(pCanvas);

    const mMat = new THREE.MeshStandardMaterial({ color: '#3A3E45', roughness: 0.52, metalness: 0.88 });
    const rMat = new THREE.MeshStandardMaterial({ color: '#2C3036', roughness: 0.75 });
    const dMat = new THREE.MeshStandardMaterial({ color: '#26292E', roughness: 0.55, metalness: 0.82 });

    return [pTex, mMat, rMat, dMat] as const;
  }, []);

  return (
    <group>
      {/* Flush Glossy Rain Puddles along Curb Line */}
      {[-18, -10, -1.0, 8, 16].map((x, i) => (
        <mesh
          key={`puddle-${i}`}
          position={[x, -0.21, i === 2 ? 5.5 : 6.0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[i === 2 ? 5.6 : 4.2, 2.4]} />
          {/* Water is a dielectric, not chrome. metalness 0.88 told the BRDF to
              tint reflections by the base colour and drop diffuse entirely —
              with no environment in the scene that resolved to a black smear.
              metalness 0 + low roughness gives the real thing: Fresnel, so the
              puddle is near-invisible underfoot and mirror-bright at a glancing
              angle, which is exactly how wet tarmac behaves as you walk past. */}
          <meshStandardMaterial
            map={puddleTex}
            transparent={true}
            depthWrite={false}
            roughness={0.09}
            metalness={0}
            envMapIntensity={1.35}
            polygonOffset={true}
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      ))}

      {/* Cast-Iron Embossed Street Manholes */}
      {[-16, -2, 13].map((x, i) => (
        <group key={`manhole-${i}`} position={[x, -0.21, 6.5]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={manholeMat} castShadow receiveShadow>
            <circleGeometry args={[0.65, 24]} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={ringMat} receiveShadow>
            <ringGeometry args={[0.66, 0.74, 24]} />
          </mesh>
        </group>
      ))}

      {/* Storm Drain Grates along Curb */}
      {[-21, -11, 0, 11, 21].map((x, i) => (
        <mesh key={`drain-${i}`} position={[x, -0.09, 3.28]} rotation={[-Math.PI / 2, 0, 0]} material={drainMat} receiveShadow>
          <planeGeometry args={[1.4, 0.45]} />
        </mesh>
      ))}
    </group>
  );
}

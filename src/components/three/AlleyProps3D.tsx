'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════════
   1. WALL DECALS & ARCHITECTURAL WEATHERING (Clean, subtle, NO spiders)
   Breaks up brick repetition using soft organic plaster patches, vertical
   water runoff stains beneath pipes/windows, and authentic vintage poster remnants.
   ═══════════════════════════════════════════════════════════════════════════ */

export function WallDecalsAndGrime() {
  const [
    plasterTex,
    grimeTex,
    fullPosterTex,
    tornPosterTex,
    wheatpasteCollage1,
    wheatpasteCollage2,
    graffitiPatchTex,
    crackedPatchTex,
    stickerBombTex,
  ] = useMemo(() => {
    // 1. Soft Organic Plaster & Aged Concrete Texture (Clean gradient)
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 512;
    pCanvas.height = 512;
    const pCtx = pCanvas.getContext('2d')!;
    pCtx.clearRect(0, 0, 512, 512);

    const grad = pCtx.createRadialGradient(256, 256, 30, 256, 256, 220);
    grad.addColorStop(0, 'rgba(118, 112, 104, 0.88)');
    grad.addColorStop(0.55, 'rgba(96, 90, 84, 0.65)');
    grad.addColorStop(1, 'rgba(96, 90, 84, 0.0)');
    pCtx.fillStyle = grad;
    pCtx.beginPath();
    pCtx.arc(256, 256, 220, 0, Math.PI * 2);
    pCtx.fill();

    pCtx.fillStyle = 'rgba(40, 36, 32, 0.12)';
    for (let i = 0; i < 600; i++) {
      pCtx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }
    const pTex = new THREE.CanvasTexture(pCanvas);

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

    // 3A. First Poster: Complete Intact Bright Archival Poster
    const fCanvas = document.createElement('canvas');
    fCanvas.width = 512;
    fCanvas.height = 256;
    const fCtx = fCanvas.getContext('2d')!;
    fCtx.clearRect(0, 0, 512, 256);

    fCtx.fillStyle = '#E8E0D2';
    fCtx.fillRect(16, 16, 480, 224);

    fCtx.strokeStyle = '#2A241E';
    fCtx.lineWidth = 6;
    fCtx.strokeRect(24, 24, 464, 208);

    fCtx.font = '900 36px "Courier New", monospace';
    fCtx.fillStyle = '#1A1612';
    fCtx.textAlign = 'center';
    fCtx.fillText('GDG CRCE ARCHIVE', 256, 85);

    fCtx.font = 'bold 22px monospace';
    fCtx.fillStyle = '#3E342B';
    fCtx.fillText('SUNÉKHEIA // EST. 1994', 256, 135);

    fCtx.font = 'bold 18px monospace';
    fCtx.fillStyle = '#8B261D';
    fCtx.fillText('COMPLETE ARCHIVAL COLLECTION', 256, 185);

    const fullTex = new THREE.CanvasTexture(fCanvas);

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

    // 4. Left Reference Panel: Layered Ripped Wheatpaste Poster Collage 1
    const wc1Canvas = document.createElement('canvas');
    wc1Canvas.width = 512;
    wc1Canvas.height = 512;
    const wc1Ctx = wc1Canvas.getContext('2d')!;
    wc1Ctx.clearRect(0, 0, 512, 512);

    // Bottom layer: distressed magenta/pink poster fragment
    wc1Ctx.fillStyle = '#C83B5A';
    wc1Ctx.fillRect(20, 40, 280, 420);
    wc1Ctx.fillStyle = '#111822';
    wc1Ctx.font = '900 38px Impact, sans-serif';
    wc1Ctx.fillText('LIVE 94', 40, 100);

    // Middle layer: ochre yellow flyer remnant
    wc1Ctx.fillStyle = '#DCA828';
    wc1Ctx.fillRect(160, 110, 320, 340);
    wc1Ctx.fillStyle = '#191512';
    wc1Ctx.font = 'bold 26px monospace';
    wc1Ctx.fillText('SYNDICATE // TOUR', 180, 160);

    // Top layer: torn cream wheatpaste overcoat with ripped jagged fringe
    wc1Ctx.beginPath();
    wc1Ctx.moveTo(40, 20);
    wc1Ctx.lineTo(470, 20);
    wc1Ctx.lineTo(460, 190);
    wc1Ctx.lineTo(380, 240);
    wc1Ctx.lineTo(440, 320);
    wc1Ctx.lineTo(310, 480);
    wc1Ctx.lineTo(60, 460);
    wc1Ctx.closePath();
    wc1Ctx.fillStyle = 'rgba(238, 232, 222, 0.94)';
    wc1Ctx.fill();

    wc1Ctx.font = '900 48px Impact, sans-serif';
    wc1Ctx.fillStyle = '#22252A';
    wc1Ctx.fillText('ALL ERAS', 80, 120);
    wc1Ctx.font = 'bold 24px monospace';
    wc1Ctx.fillText('CONTINUITY > EVOLUTION', 80, 165);

    const wc1Tex = new THREE.CanvasTexture(wc1Canvas);

    // 5. Left Reference Panel: Layered Ripped Wheatpaste Poster Collage 2
    const wc2Canvas = document.createElement('canvas');
    wc2Canvas.width = 512;
    wc2Canvas.height = 512;
    const wc2Ctx = wc2Canvas.getContext('2d')!;
    wc2Ctx.clearRect(0, 0, 512, 512);

    wc2Ctx.fillStyle = '#267C82'; // Teal poster underlayer
    wc2Ctx.fillRect(40, 30, 420, 440);
    wc2Ctx.fillStyle = '#F2E8D8';
    wc2Ctx.fillRect(80, 180, 360, 260);
    wc2Ctx.fillStyle = '#1A1A1A';
    wc2Ctx.font = '900 42px "Courier New", monospace';
    wc2Ctx.fillText('SUNÉKHEIA', 100, 240);
    wc2Ctx.font = 'bold 24px monospace';
    wc2Ctx.fillText('WHAT CONTINUES', 100, 285);
    wc2Ctx.fillText('BECOMES GREATER', 100, 320);

    const wc2Tex = new THREE.CanvasTexture(wc2Canvas);

    // 6. Middle Reference Panel: Peeling Stucco with Cyan & Rust Spray Tags
    const gpCanvas = document.createElement('canvas');
    gpCanvas.width = 512;
    gpCanvas.height = 256;
    const gpCtx = gpCanvas.getContext('2d')!;
    gpCtx.clearRect(0, 0, 512, 256);

    gpCtx.fillStyle = 'rgba(138, 145, 152, 0.88)';
    gpCtx.fillRect(10, 10, 492, 236);

    // Cyan spray tag (left)
    gpCtx.font = 'italic 900 58px Impact, sans-serif';
    gpCtx.fillStyle = '#00C8BA';
    gpCtx.fillText('CRCE 94', 40, 110);

    // Rust-red spray tag (right)
    gpCtx.font = 'italic 900 52px Impact, sans-serif';
    gpCtx.fillStyle = '#A83B2C';
    gpCtx.fillText('LEGACY', 270, 165);

    const gpTex = new THREE.CanvasTexture(gpCanvas);

    // 7. Right Reference Panel: Deep Cracked Concrete Wall Patch
    const cpCanvas = document.createElement('canvas');
    cpCanvas.width = 512;
    cpCanvas.height = 512;
    const cpCtx = cpCanvas.getContext('2d')!;
    cpCtx.clearRect(0, 0, 512, 512);

    cpCtx.fillStyle = 'rgba(92, 96, 104, 0.85)';
    cpCtx.fillRect(0, 0, 512, 512);

    // Deep jagged structural cracks
    cpCtx.strokeStyle = '#111418';
    cpCtx.lineWidth = 5;
    cpCtx.beginPath();
    cpCtx.moveTo(180, 0);
    cpCtx.lineTo(210, 140);
    cpCtx.lineTo(160, 260);
    cpCtx.lineTo(230, 410);
    cpCtx.lineTo(200, 512);
    cpCtx.stroke();

    cpCtx.beginPath();
    cpCtx.moveTo(160, 260);
    cpCtx.lineTo(410, 290);
    cpCtx.lineTo(512, 240);
    cpCtx.stroke();

    const cpTex = new THREE.CanvasTexture(cpCanvas);

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

    return [pTex, gTex, fullTex, tornTex, wc1Tex, wc2Tex, gpTex, cpTex, sbTex];
  }, []);

  const plasterPositions: [number, number, number][] = [
    [-21.0, 4.6, 0.090],
    [-15.5, 2.2, 0.090],
    [-9.0, 5.2, 0.090],
    [-3.2, 1.9, 0.090],
    [3.5, 5.0, 0.090],
    [9.5, 2.1, 0.090],
    [16.2, 5.2, 0.090],
    [21.5, 3.2, 0.090],
  ];

  const grimePositions: [number, number, number][] = [
    [-24, 4.4, 0.091],
    [-18, 4.1, 0.091],
    [-13, 4.5, 0.091],
    [-7.5, 4.3, 0.091],
    [-2, 4.4, 0.091],
    [2, 4.2, 0.091],
    [9, 4.5, 0.091],
    [14, 4.3, 0.091],
    [18.5, 4.4, 0.091],
    [21, 4.2, 0.091],
  ];

  return (
    <group>
      {/* Plaster & Weathering Patches breaking repetition */}
      {plasterPositions.map((pos, i) => (
        <mesh key={`plaster-${i}`} position={pos} castShadow receiveShadow>
          <planeGeometry args={[3.2 + (i % 2) * 0.5, 2.6 + (i % 2) * 0.4]} />
          <meshStandardMaterial
            map={plasterTex}
            transparent={true}
            depthWrite={false}
            roughness={0.92}
            polygonOffset={true}
            polygonOffsetFactor={-3}
            polygonOffsetUnits={-3}
          />
        </mesh>
      ))}

      {/* Vertical Weathering Streaks under pipes/windows */}
      {grimePositions.map((pos, i) => (
        <mesh key={`grime-${i}`} position={pos} receiveShadow>
          <planeGeometry args={[1.6, 5.2]} />
          <meshStandardMaterial
            map={grimeTex}
            transparent={true}
            depthWrite={false}
            roughness={0.9}
            polygonOffset={true}
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      ))}

      {/* Left Reference Panel: Layered Ripped Wheatpaste Poster Collages */}
      <mesh position={[-23.5, 3.4, 0.092]} castShadow receiveShadow>
        <planeGeometry args={[2.8, 2.8]} />
        <meshStandardMaterial
          map={wheatpasteCollage1}
          transparent={true}
          depthWrite={false}
          roughness={0.82}
          polygonOffset={true}
          polygonOffsetFactor={-3}
          polygonOffsetUnits={-3}
        />
      </mesh>
      <mesh position={[-6.2, 3.2, 0.092]} castShadow receiveShadow>
        <planeGeometry args={[2.6, 2.6]} />
        <meshStandardMaterial
          map={wheatpasteCollage2}
          transparent={true}
          depthWrite={false}
          roughness={0.82}
          polygonOffset={true}
          polygonOffsetFactor={-3}
          polygonOffsetUnits={-3}
        />
      </mesh>

      {/* Middle Reference Panel: Peeling Stucco with Cyan & Rust Graffiti Spray Tags */}
      <mesh position={[2.8, 2.1, 0.093]} castShadow receiveShadow>
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

      {/* Right Reference Panel: Deep Cracked Fissure Wall Patch */}
      <mesh position={[16.8, 3.6, 0.092]} castShadow receiveShadow>
        <planeGeometry args={[3.2, 3.2]} />
        <meshStandardMaterial
          map={crackedPatchTex}
          transparent={true}
          depthWrite={false}
          roughness={0.92}
          polygonOffset={true}
          polygonOffsetFactor={-3}
          polygonOffsetUnits={-3}
        />
      </mesh>

      {/* 1st Heritage Poster: Complete Full Archival Poster */}
      <mesh position={[-19.2, 3.3, 0.094]} castShadow receiveShadow>
        <planeGeometry args={[3.2, 1.6]} />
        <meshStandardMaterial
          map={fullPosterTex}
          transparent={true}
          depthWrite={false}
          roughness={0.7}
          polygonOffset={true}
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* 2nd Heritage Poster: Dramatic Zigzag Ripped Torn Half-Poster */}
      <mesh position={[13.2, 2.3, 0.094]} castShadow receiveShadow>
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
        <mesh key={`sticker-bomb-${i}`} position={[sx, 2.15 + (i % 2) * 0.35, 0.096]} castShadow receiveShadow>
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

      {/* Middle Reference Panel: Curb-side Green Street Weeds at Wall Base */}
      {[-21, -15, -8, -1, 6, 12, 19].map((wx, idx) => (
        <group key={`weed-${idx}`} position={[wx, 0.18, 0.12]}>
          <mesh rotation={[0.15, idx * 0.4, 0]} castShadow receiveShadow>
            <coneGeometry args={[0.14, 0.28, 5]} />
            <meshStandardMaterial color="#2E5A34" roughness={0.75} />
          </mesh>
          <mesh position={[0.08, 0.02, 0.04]} rotation={[0.2, -idx * 0.3, 0.1]} castShadow receiveShadow>
            <coneGeometry args={[0.11, 0.22, 5]} />
            <meshStandardMaterial color="#3A6C42" roughness={0.75} />
          </mesh>
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
          <meshStandardMaterial
            map={puddleTex}
            transparent={true}
            depthWrite={false}
            roughness={0.04}
            metalness={0.88}
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

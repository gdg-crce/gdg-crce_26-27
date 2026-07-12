'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════════
   1. WALL DECALS & ARCHITECTURAL WEATHERING (Clean, subtle, NO spiders)
   Breaks up brick repetition using soft organic plaster patches, vertical
   water runoff stains beneath pipes/windows, and authentic vintage poster remnants.
   ═══════════════════════════════════════════════════════════════════════════ */

export function WallDecalsAndGrime() {
  const [plasterTex, grimeTex, fullPosterTex, tornPosterTex] = useMemo(() => {
    // 1. Soft Organic Plaster & Aged Concrete Texture (Clean gradient, NO radial lines)
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

    // Subtle concrete grain noise inside patch
    pCtx.fillStyle = 'rgba(40, 36, 32, 0.12)';
    for (let i = 0; i < 600; i++) {
      pCtx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }
    const pTex = new THREE.CanvasTexture(pCanvas);

    // 2. Vertical Rain Runoff Streaks (Smooth vertical weathering under pipes & windows)
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

    // 3A. First Poster: Complete Intact Bright Archival Poster (Complete Light)
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

    // Deep, unmistakable zigzag teeth
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

    return [pTex, gTex, fullTex, tornTex];
  }, []);

  const plasterPositions: [number, number, number][] = [
    [-21.0, 4.6, 0.015],
    [-15.5, 2.2, 0.015],
    [-9.0, 5.2, 0.015],
    [-3.2, 1.9, 0.015],
    [3.5, 5.0, 0.015],
    [9.5, 2.1, 0.015],
    [16.2, 5.2, 0.015],
    [21.5, 3.2, 0.015],
  ];

  const grimePositions: [number, number, number][] = [
    [-24, 4.4, 0.018],
    [-18, 4.1, 0.018],
    [-13, 4.5, 0.018],
    [-7.5, 4.3, 0.018],
    [-2, 4.4, 0.018],
    [2, 4.2, 0.018],
    [9, 4.5, 0.018],
    [14, 4.3, 0.018],
    [18.5, 4.4, 0.018],
    [21, 4.2, 0.018],
  ];

  return (
    <group>
      {/* Plaster & Weathering Patches breaking brick tiling */}
      {plasterPositions.map((pos, i) => (
        <mesh key={`plaster-${i}`} position={pos}>
          <planeGeometry args={[3.2 + (i % 2) * 0.5, 2.6 + (i % 2) * 0.4]} />
          <meshStandardMaterial
            map={plasterTex}
            transparent={true}
            roughness={0.92}
            polygonOffset={true}
            polygonOffsetFactor={-3}
          />
        </mesh>
      ))}

      {/* Vertical Weathering Streaks under pipes/windows */}
      {grimePositions.map((pos, i) => (
        <mesh key={`grime-${i}`} position={pos}>
          <planeGeometry args={[1.6, 5.2]} />
          <meshStandardMaterial
            map={grimeTex}
            transparent={true}
            roughness={0.9}
            polygonOffset={true}
            polygonOffsetFactor={-2}
          />
        </mesh>
      ))}

      {/* 1st Heritage Poster: Complete Full Archival Poster with Complete Lighting */}
      <mesh position={[-19.2, 3.3, 0.012]}>
        <planeGeometry args={[3.2, 1.6]} />
        <meshStandardMaterial
          map={fullPosterTex}
          transparent={true}
          roughness={0.7}
          polygonOffset={true}
          polygonOffsetFactor={-2}
        />
      </mesh>

      {/* 2nd Heritage Poster: Dramatic Zigzag Ripped Torn Half-Poster */}
      <mesh position={[13.2, 2.3, 0.012]}>
        <planeGeometry args={[2.6, 1.5]} />
        <meshStandardMaterial
          map={tornPosterTex}
          transparent={true}
          roughness={0.85}
          polygonOffset={true}
          polygonOffsetFactor={-2}
        />
      </mesh>
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
      <mesh position={[0, 0, 0.44]} material={ironMat}>
        <boxGeometry args={[4.4, 0.16, 0.08]} />
      </mesh>
      <mesh position={[0, 0, -0.44]} material={ironMat}>
        <boxGeometry args={[4.4, 0.16, 0.08]} />
      </mesh>
      <mesh position={[-2.16, 0, 0]} material={ironMat}>
        <boxGeometry args={[0.08, 0.16, 0.96]} />
      </mesh>
      <mesh position={[2.16, 0, 0]} material={ironMat}>
        <boxGeometry args={[0.08, 0.16, 0.96]} />
      </mesh>

      {/* Perforated Industrial Walkway Deck Floor */}
      <mesh position={[0, 0.04, 0]} material={gratingMat}>
        <boxGeometry args={[4.24, 0.04, 0.82]} />
      </mesh>

      {/* Structural Under-Deck Cross Joists adding rich underside depth */}
      {[-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8].map((jx, idx) => (
        <mesh key={`joist-${idx}`} position={[jx, -0.04, 0]} material={ironMat}>
          <boxGeometry args={[0.05, 0.1, 0.84]} />
        </mesh>
      ))}

      {/* Wall Anchor Wallplates & Cantilever Support Struts */}
      <mesh position={[-1.7, -0.65, -0.46]} material={ironMat}>
        <boxGeometry args={[0.24, 0.48, 0.04]} />
      </mesh>
      <mesh position={[1.7, -0.65, -0.46]} material={ironMat}>
        <boxGeometry args={[0.24, 0.48, 0.04]} />
      </mesh>
      <mesh position={[-1.7, -0.42, -0.05]} rotation={[0.62, 0, 0]} material={ironMat}>
        <boxGeometry args={[0.08, 1.15, 0.08]} />
      </mesh>
      <mesh position={[1.7, -0.42, -0.05]} rotation={[0.62, 0, 0]} material={ironMat}>
        <boxGeometry args={[0.08, 1.15, 0.08]} />
      </mesh>

      {/* Steel Toe-Board Kickplate along edge */}
      <mesh position={[0, 0.14, 0.42]} material={ironMat}>
        <boxGeometry args={[4.36, 0.12, 0.03]} />
      </mesh>

      {/* Multi-Tier Safety Railing System */}
      <mesh position={[0, 0.52, 0.42]} rotation={[0, 0, Math.PI / 2]} material={ironMat}>
        <cylinderGeometry args={[0.024, 0.024, 4.36, 8]} />
      </mesh>
      <mesh position={[0, 0.86, 0.42]} material={ironMat}>
        <boxGeometry args={[4.38, 0.05, 0.05]} />
      </mesh>
      {[-2.05, -1.35, -0.68, 0, 0.68, 1.35, 2.05].map((rx, i) => (
        <mesh key={`post-${i}`} position={[rx, 0.46, 0.42]} material={ironMat}>
          <cylinderGeometry args={[0.028, 0.028, 0.8, 8]} />
        </mesh>
      ))}

      {/* Vintage Industrial Caged Light Fixture underneath */}
      <mesh position={[0, -0.16, 0.1]} material={ironMat}>
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
      <mesh position={[-14, 6.4, 2.6]} rotation={[0, 0, 0]} material={cableMat}>
        <cylinderGeometry args={[0.03, 0.03, 22, 8]} />
      </mesh>
      <mesh position={[4, 6.6, 2.9]} rotation={[0, 0, 0]} material={cableMat}>
        <cylinderGeometry args={[0.028, 0.028, 24, 8]} />
      </mesh>
      <mesh position={[18, 6.3, 2.5]} rotation={[0, 0, 0]} material={cableMat}>
        <cylinderGeometry args={[0.03, 0.03, 18, 8]} />
      </mesh>

      {/* Street Edge Safety Bollards */}
      {[-20, -8, 8, 20].map((x, i) => (
        <group key={`bollard-${i}`} position={[x, 0.45, 3.1]}>
          <mesh>
            <cylinderGeometry args={[0.16, 0.18, 0.9, 12]} />
            <meshStandardMaterial color="#2D2926" roughness={0.7} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.26, 0]}>
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
  const manholeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2B2E33', roughness: 0.45, metalness: 0.85 }),
    []
  );

  return (
    <group>
      {/* Flush Glossy Rain Puddles along Curb Line */}
      {[-18, -10, -1.0, 8, 16].map((x, i) => (
        <mesh
          key={`puddle-${i}`}
          position={[x, -0.21, i === 2 ? 5.5 : 6.0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[i === 2 ? 5.6 : 4.2, 2.4]} />
          <meshStandardMaterial
            color="#080B0F"
            roughness={0.04}
            metalness={0.92}
          />
        </mesh>
      ))}

      {/* Cast-Iron Embossed Street Manholes */}
      {[-16, -2, 13].map((x, i) => (
        <group key={`manhole-${i}`} position={[x, -0.21, 6.5]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={manholeMat}>
            <circleGeometry args={[0.65, 24]} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.66, 0.74, 24]} />
            <meshStandardMaterial color="#1E2024" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Storm Drain Grates along Curb */}
      {[-21, -11, 0, 11, 21].map((x, i) => (
        <mesh key={`drain-${i}`} position={[x, -0.09, 3.28]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.4, 0.45]} />
          <meshStandardMaterial color="#1B1C1F" roughness={0.5} metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

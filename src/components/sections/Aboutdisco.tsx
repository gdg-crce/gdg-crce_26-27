'use client';

import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Sparkles, Float, Html, Environment } from '@react-three/drei';
import { motion, useScroll, useTransform, useMotionValue, MotionValue } from 'framer-motion';
import * as THREE from 'three';
import { useEra } from '../ui/EraContext';
import { 
  fraunces, 
  jakarta, 
  righteous, 
  spaceGrotesk, 
  specialElite, 
  shareTechMono, 
  orbitron, 
  outfit 
} from '@/lib/fonts';

// Preload the disco ball model for smooth loading
useGLTF.preload('/models/disco_ball.glb');

interface SwirlingHtmlProps {
  t: MotionValue<number>;
  opacity: MotionValue<number>;
  targetPos: [number, number, number];
  isMobile: boolean;
  children: React.ReactNode;
}

function SwirlingHtml({ t, opacity, targetPos, isMobile, children }: SwirlingHtmlProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!groupRef.current) return;
    const progress = t.get();
    
    // Optimisation: Hide text group if it's completely inactive
    if (progress <= 0 || progress >= 2) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    const [targetX, targetY, targetZ] = targetPos;
    
    if (isMobile) {
      // Mobile: float and curve downwards from behind the bottom of the ball to its center position
      let y = -1.5;
      let z = 0;
      
      // Mobile ball Y center is 0.6. Starting Y is -0.7 (behind bottom horizon of ball)
      if (progress <= 1) {
        y = -0.7 + (-1.5 - (-0.7)) * progress;
        // Z comes from behind the ball (-1.5) to front (0)
        z = -1.5 * (1 - progress) + targetZ * progress;
      } else {
        // progress > 1 (exiting): float downwards and move closer to camera while fading
        const factor = progress - 1; // 0 to 1
        y = -1.5 - 0.45 * factor;
        z = targetZ + 1.2 * factor;
      }
      
      groupRef.current.position.set(0, y, z);
      return;
    }
    
    // Desktop: Cylinder-like motion orbiting around the Y-axis
    const R = Math.abs(targetX);
    
    let x = 0;
    let y = targetY;
    let z = targetZ;
    
    const isLeftCard = targetX < 0;
    
    if (progress <= 1) {
      // Curve in: progress goes 0 -> 1
      const factor = progress; // 0 to 1
      const ease = Math.sin(factor * Math.PI / 2); // ease out radius
      
      if (isLeftCard) {
        // Sweeps from 1.6*PI (behind-right) to PI (front-left resting)
        // Curves around the right-back, passes behind the ball, and emerges from the left horizon
        const theta = 1.6 * Math.PI - 0.6 * Math.PI * ease;
        x = R * Math.cos(theta);
        z = R * Math.sin(theta);
      } else {
        // Sweeps from 1.4*PI (behind-left) to 2.0*PI (front-right resting)
        // Curves around the left-back, passes behind the ball, and emerges from the right horizon
        const theta = 1.4 * Math.PI + 0.6 * Math.PI * ease;
        x = R * Math.cos(theta);
        z = R * Math.sin(theta);
      }
      // Y curves from targetY * 0.5 to targetY
      y = targetY * (0.5 + 0.5 * ease);
    } else {
      // Curve out: progress goes 1 -> 2
      const factor = progress - 1; // 0 to 1
      const ease = Math.sin(factor * Math.PI / 2);
      
      if (isLeftCard) {
        // Continue orbiting from PI to 0.7*PI (moving further left and forward)
        const theta = Math.PI - 0.3 * Math.PI * ease;
        const currentR = R * (1.0 + ease * 0.35);
        x = currentR * Math.cos(theta);
        z = currentR * Math.sin(theta) + 1.5 * ease; // pull closer to camera
      } else {
        // Continue orbiting from 2*PI (or 0) to 0.3*PI (moving further right and forward)
        const theta = 2.0 * Math.PI + 0.3 * Math.PI * ease;
        const currentR = R * (1.0 + ease * 0.35);
        x = currentR * Math.cos(theta);
        z = currentR * Math.sin(theta) + 1.5 * ease; // pull closer to camera
      }
      y = targetY + targetY * 0.15 * ease;
    }
    
    groupRef.current.position.set(x, y, z);
  });
  
  return (
    <group ref={groupRef}>
      <Html transform distanceFactor={4.5}>
        <motion.div style={{ opacity }}>
          {children}
        </motion.div>
      </Html>
    </group>
  );
}

function DiscoBall({ scrollProgress, activeEra, isMobile }: { scrollProgress: MotionValue<number>; activeEra: string; isMobile: boolean }) {
  const { scene } = useGLTF('/models/disco_ball.glb');
  const ballRef = useRef<THREE.Group>(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  
  // Calculate bounding box on mount to auto-fit any size GLB into a visible sphere
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Fit the model to ~3.4 units wide initially so the initial ball is much more bigger.
    // This leaves plenty of space on left/right for text, keeping it fully visible as a centered sphere.
    const factor = 3.4 / (maxDim || 1);
    setScaleFactor(factor);
    
    // Enable shadow casting on all meshes
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);
  
  // Consolidated useFrame loop to prevent any frame accumulation glitches
  useFrame((state) => {
    if (!ballRef.current) return;
    const scroll = scrollProgress.get();
    const time = state.clock.getElapsedTime();
    
    // 1. Rotation (automated spin + scroll spin)
    const autoSpin = time * 0.16;
    const scrollSpin = scroll * Math.PI * 8;
    ballRef.current.rotation.y = autoSpin + scrollSpin;
    
    // 2. Y position dangle: descends from Y = 8 to 0 (or 0.6 on mobile) between 0.0 and 0.15 scroll
    let yOffset = 0;
    if (scroll < 0.15) {
      const t = scroll / 0.15;
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
      yOffset = 8 * (1 - ease);
    }
    
    // Offset the ball Y coordinate on mobile to make room for text below it
    const baseBallY = isMobile ? 1.0 : 0;
    
    // 3. Continuous Zoom-in Logic (Linear/gradual zoom -> rapid zoom)
    let currentScale = scaleFactor;
    let zOffset = 0;
    
    if (scroll <= 0.75) {
      // Gradual zoom: t goes 0 -> 0.75. Grows only up to 1.35x base scale to prevent overlapping text.
      const factor = scroll / 0.75;
      currentScale = scaleFactor * (1.0 + factor * 0.35); 
      zOffset = factor * 0.3; // subtle forward drift
    } else {
      // Rapid final zoom: t goes 0.75 -> 1.0
      const t = (scroll - 0.75) / 0.25;
      const ease = Math.pow(t, 4); // steep easeIn curve
      currentScale = scaleFactor * 1.35 + (scaleFactor * 36 - scaleFactor * 1.35) * ease; // zoom to 36x
      zOffset = 0.3 + (4.9 - 0.3) * ease; // zoom past camera
    }
    
    // 4. Pendulum swing (dampens as we zoom in)
    const swingFactor = scroll > 0.75 ? Math.max(0, 1 - (scroll - 0.75) / 0.2) : 1;
    const swingX = Math.sin(time * 0.9) * 0.13 * swingFactor;
    const bobY = Math.cos(time * 1.8) * 0.04 * swingFactor;
    const swingZ = Math.sin(time * 0.9) * 0.04 * swingFactor;
    
    // Directly assign position and scale (never accumulate!)
    ballRef.current.position.set(swingX, yOffset + bobY + baseBallY, zOffset);
    ballRef.current.rotation.z = swingZ;
    ballRef.current.scale.set(currentScale, currentScale, currentScale);
  });
  
  return (
    <group ref={ballRef}>
      <primitive object={scene} />
      
      {/* Hanging Wire: connects the chain/ball to the top ceiling of the canvas */}
      <mesh position={[0, 4.0, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 8.0, 8]} />
        <meshStandardMaterial 
          color="#e0e0e0" 
          metalness={1.0} 
          roughness={0.05} 
        />
      </mesh>
    </group>
  );
}

function DiscoLights({ activeEra }: { activeEra: string }) {
  const light1 = useRef<THREE.DirectionalLight>(null);
  const light2 = useRef<THREE.DirectionalLight>(null);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    // Rotate directional spotlights in orbit around the ball
    if (light1.current) {
      light1.current.position.x = Math.sin(time * 0.6) * 6;
      light1.current.position.z = Math.cos(time * 0.6) * 6;
    }
    if (light2.current) {
      light2.current.position.x = Math.sin(time * 0.8 + Math.PI) * 6;
      light2.current.position.z = Math.cos(time * 0.8 + Math.PI) * 6;
    }
  });
  
  // Light colors matching the active theme's primary, secondary, and text colors
  let c1 = '#E8412A'; // 1970s Colors
  let c2 = '#E0A526';
  let c3 = '#E8D29F';
  
  if (activeEra === '1980s') {
    c1 = '#FF2E7E';
    c2 = '#5A4FFF';
    c3 = '#00E5C7';
  } else if (activeEra === '1990s') {
    c1 = '#028A8A';
    c2 = '#7B2FBF';
    c3 = '#E85D26';
  } else if (activeEra === '2000s') {
    c1 = '#00D4E8';
    c2 = '#B4E600';
    c3 = '#FF3D9A';
  }
  
  return (
    <>
      <directionalLight ref={light1} position={[6, 5, 0]} intensity={4.5} color={c1} />
      <directionalLight ref={light2} position={[-6, 5, 0]} intensity={4.5} color={c2} />
      <pointLight position={[0, -4, 4]} intensity={3.5} color={c3} />
      <pointLight position={[0, 4, -4]} intensity={2.0} color={c2} />
    </>
  );
}

// Child Canvas component to update scroll progress on requestAnimationFrame
function ScrollTracker({ 
  containerRef, 
  localScrollProgress 
}: { 
  containerRef: React.RefObject<HTMLDivElement | null>; 
  localScrollProgress: MotionValue<number>; 
}) {
  useFrame(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = -rect.top;
    const scrollHeight = rect.height - window.innerHeight;
    const progress = Math.max(0, Math.min(1, scrollTop / (scrollHeight || 1)));
    localScrollProgress.set(progress);
  });
  return null;
}

export default function Aboutdisco() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const { activeEra, activeConfig } = useEra();

  useEffect(() => {
    setIsMounted(true);
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Bulletproof custom scroll tracker to replace flaky Framer Motion scroll ref bindings.
  // Updates on requestAnimationFrame inside the ScrollTracker child component.
  const localScrollProgress = useMotionValue(0);

  // Calculate panel animations (fades & translations) relative to localScrollProgress
  const ideateOpacity = useTransform(localScrollProgress, [0.15, 0.20, 0.30, 0.35], [0, 1, 1, 0]);
  const ideateY = useTransform(localScrollProgress, [0.15, 0.20, 0.30, 0.35], [30, 0, 0, -30]);
  const ideateT = useTransform(localScrollProgress, [0.15, 0.20, 0.30, 0.35], [0, 1, 1, 2]);

  const createOpacity = useTransform(localScrollProgress, [0.35, 0.40, 0.50, 0.55], [0, 1, 1, 0]);
  const createY = useTransform(localScrollProgress, [0.35, 0.40, 0.50, 0.55], [30, 0, 0, -30]);
  const createT = useTransform(localScrollProgress, [0.35, 0.40, 0.50, 0.55], [0, 1, 1, 2]);

  const collabOpacity = useTransform(localScrollProgress, [0.55, 0.60, 0.70, 0.75], [0, 1, 1, 0]);
  const collabY = useTransform(localScrollProgress, [0.55, 0.60, 0.70, 0.75], [30, 0, 0, -30]);
  const collabT = useTransform(localScrollProgress, [0.55, 0.60, 0.70, 0.75], [0, 1, 1, 2]);

  // Section header animations
  const headerOpacity = useTransform(localScrollProgress, [0, 0.12, 0.75, 0.80], [0, 1, 1, 0]);
  const headerY = useTransform(localScrollProgress, [0, 0.12, 0.75, 0.80], [-25, 0, 0, -25]);

  // Transition cover overlay at the end of the scroll (fades to active bg color)
  const overlayOpacity = useTransform(localScrollProgress, [0.93, 0.98], [0, 1]);

  // Choose the font family based on active era for the header title
  const headerFontClass = 
    activeEra === '1970s' ? fraunces.className : 
    activeEra === '1980s' ? righteous.className : 
    activeEra === '1990s' ? specialElite.className : 
    orbitron.className;

  // Set card font properties depending on active era
  const cardFontClass = 
    activeEra === '1970s' ? fraunces.className : 
    activeEra === '1980s' ? righteous.className : 
    activeEra === '1990s' ? specialElite.className : 
    orbitron.className;

  const cardBodyFont = 
    activeEra === '1970s' ? jakarta.className : 
    activeEra === '1980s' ? spaceGrotesk.className : 
    activeEra === '1990s' ? shareTechMono.className : 
    outfit.className;

  // Responsive positions in 3D space: spaced left/right on desktop, centered below ball on mobile
  const ideatePos: [number, number, number] = isMobile ? [0, -1.8, 0] : [-3.3, 0.5, 0];
  const createPos: [number, number, number] = isMobile ? [0, -1.8, 0] : [3.3, -0.1, 0];
  const collabPos: [number, number, number] = isMobile ? [0, -1.8, 0] : [-3.1, -0.7, 0];

  return (
    <section 
      ref={containerRef} 
      id="about" 
      className="relative h-[300vh] w-full"
    >
      {/* Sticky container that locks the viewport */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-era-bg transition-colors duration-300">
        
        {/* Dynamic scanlines, noise, or patterns overlay depending on era */}
        <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden">
          {activeEra === '1970s' && <div className="film-grain opacity-[0.045]" />}
          {activeEra === '1980s' && <div className="crt-scanlines opacity-[0.08]" />}
          {activeEra === '1990s' && <div className="absolute inset-0 dither-pattern opacity-[0.07]" />}
          {activeEra === '2000s' && (
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_center,var(--primary)_0%,transparent_70%)]" />
          )}
        </div>

        {/* Floating Title Header */}
        <motion.div
          style={{ opacity: headerOpacity, y: headerY }}
          className="absolute top-12 sm:top-16 lg:top-24 left-0 right-0 z-30 flex flex-col items-center text-center px-6 pointer-events-none"
        >
          <span
            className={`text-[10px] sm:text-xs tracking-[0.4em] uppercase font-bold text-[var(--primary)] ${spaceGrotesk.className}`}
          >
            Who We Are
          </span>
          <h2 
            className={`text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mt-1 text-[var(--text)] ${headerFontClass}`}
          >
            Bridging Tech Eras
          </h2>
        </motion.div>

        {/* 3D Scene Viewport */}
        <div className="absolute inset-0 w-full h-full z-20">
          {isMounted ? (
            <Canvas 
              camera={{ position: [0, 0, 5], fov: 65 }}
              shadows
            >
              <ScrollTracker containerRef={containerRef} localScrollProgress={localScrollProgress} />

              {/* Softer lighting base to let glistening environment map shine through */}
              <ambientLight intensity={0.4} />
              
              {/* Softer front camera light to prevent model color blowouts */}
              <directionalLight position={[0, 0, 5]} intensity={1.5} color="#ffffff" />
              
              <Suspense fallback={null}>
                {/* Drei Environment Map: Presets like "studio" reflect abstract lightboxes for clean, glistening chrome renders */}
                <Environment preset="studio" />

                <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.2}>
                  <DiscoBall scrollProgress={localScrollProgress} activeEra={activeEra} isMobile={isMobile} />
                </Float>
                
                {/* 3D Text Components projected in WebGL space with cylinder orbit animation */}
                <SwirlingHtml t={ideateT} opacity={ideateOpacity} targetPos={ideatePos} isMobile={isMobile}>
                  <div className={`pointer-events-none select-none text-center flex flex-col gap-0.5 ${
                    isMobile ? 'items-center text-center' : 'items-start text-left'
                  }`}>
                    <span className={`text-[9px] sm:text-[10px] font-bold tracking-[0.35em] text-[var(--secondary)] ${spaceGrotesk.className}`}>
                      01. IDEATION
                    </span>
                    <h3 
                      className={`text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-wider text-[var(--primary)] ${cardFontClass}`}
                      style={{ textShadow: '0 0 15px color-mix(in srgb, var(--primary) 50%, transparent), 0 2px 10px rgba(0,0,0,0.95)' }}
                    >
                      We Ideate
                    </h3>
                    <p className={`text-xs sm:text-sm text-[var(--text)] opacity-85 max-w-[280px] lg:max-w-[320px] mt-1.5 leading-relaxed ${cardBodyFont}`} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.95)' }}>
                      We brainstorm original ideas, explore emerging technologies, and cultivate creative thinking to solve real-world problems. From weekend hackathons to structured design sprints.
                    </p>
                  </div>
                </SwirlingHtml>

                <SwirlingHtml t={createT} opacity={createOpacity} targetPos={createPos} isMobile={isMobile}>
                  <div className={`pointer-events-none select-none text-center flex flex-col gap-0.5 ${
                    isMobile ? 'items-center text-center' : 'items-end text-right'
                  }`}>
                    <span className={`text-[9px] sm:text-[10px] font-bold tracking-[0.35em] text-[var(--secondary)] ${spaceGrotesk.className}`}>
                      02. CREATION
                    </span>
                    <h3 
                      className={`text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-wider text-[var(--primary)] ${cardFontClass}`}
                      style={{ textShadow: '0 0 15px color-mix(in srgb, var(--primary) 50%, transparent), 0 2px 10px rgba(0,0,0,0.95)' }}
                    >
                      We Create
                    </h3>
                    <p className={`text-xs sm:text-sm text-[var(--text)] opacity-85 max-w-[280px] lg:max-w-[320px] mt-1.5 leading-relaxed ${cardBodyFont}`} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.95)' }}>
                      We turn concepts into reality. From clean frontends to robust APIs, we engineer interfaces and software stacks that bridge analog warmth with digital speed.
                    </p>
                  </div>
                </SwirlingHtml>

                <SwirlingHtml t={collabT} opacity={collabOpacity} targetPos={collabPos} isMobile={isMobile}>
                  <div className={`pointer-events-none select-none text-center flex flex-col gap-0.5 ${
                    isMobile ? 'items-center text-center' : 'items-start text-left'
                  }`}>
                    <span className={`text-[9px] sm:text-[10px] font-bold tracking-[0.35em] text-[var(--secondary)] ${spaceGrotesk.className}`}>
                      03. COLLABORATION
                    </span>
                    <h3 
                      className={`text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-wider text-[var(--primary)] ${cardFontClass}`}
                      style={{ textShadow: '0 0 15px color-mix(in srgb, var(--primary) 50%, transparent), 0 2px 10px rgba(0,0,0,0.95)' }}
                    >
                      We Collaborate
                    </h3>
                    <p className={`text-xs sm:text-sm text-[var(--text)] opacity-85 max-w-[280px] lg:max-w-[320px] mt-1.5 leading-relaxed ${cardBodyFont}`} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.95)' }}>
                      We work side by side on projects that matter — open source contributions, campus-wide apps, and community-driven tools. Our teams span every discipline, united by a passion for building what's next.
                    </p>
                  </div>
                </SwirlingHtml>

              </Suspense>
              
              <DiscoLights activeEra={activeEra} />
              
              {/* Dynamic reflective specs particle system */}
              <Sparkles 
                count={isMobile ? 35 : 85} 
                scale={isMobile ? 5 : 7} 
                size={isMobile ? 1.5 : 2.5} 
                speed={0.4} 
                color={activeConfig.colors.primary} 
              />
            </Canvas>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1A1512]/10 z-20">
              <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white/80 animate-spin" />
            </div>
          )}
        </div>

        {/* Smooth transition cover blending into the next section background */}
        <motion.div 
          style={{ opacity: overlayOpacity }} 
          className="absolute inset-0 bg-era-bg pointer-events-none z-45 transition-colors duration-300" 
        />
        
      </div>
    </section>
  );
}

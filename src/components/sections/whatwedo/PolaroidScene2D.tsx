'use client';

import React, { useEffect, useRef } from 'react';
import { ik } from '@/lib/imagekit';

/* ══════════════════════════════════════════════════════════════════════════
   PolaroidScene2D — the flat (DOM) Polaroid wall (Act 2.5)

   A 2D replacement for the R3F PolaroidScene: a wooden table, the Polaroid
   camera dead-centre, and the section's caption photos fanned around it (the
   photos are pre-designed PNGs — title + caption + stickers baked in). Same
   contract as the 3D scene — one mutable `progressRef` drives everything, no
   React state on the frame path — so it drops straight into WhatWeDoSection
   behind the unchanged seam flash. As scroll advances, the photos "print" in
   one at a time (fade + rise + un-spin), echoing the camera ejecting them.
   ══════════════════════════════════════════════════════════════════════════ */

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 2.4);

type Photo = {
  src: string;
  alt: string;
  /** centre, in % of the stage */
  left: number;
  top: number;
  z: number;
  /** progress at which this print starts developing */
  start: number;
  /** extra rotation it un-spins from as it settles (deg) */
  spin: number;
};

/** Layout mirrors the reference: camera centre, captions at the four corners.
 *  (The reference's fifth "Technical / IBM" print isn't in public/whatwedo yet —
 *  drop it in and add one row here to place it, e.g. centre-bottom.) */
const PHOTOS: Photo[] = [
  {
    src: ik('/whatwedo/content.webp'),
    alt: 'Content — engaging technical content and educational resources, from blog posts to video tutorials, making complex topics accessible for everyone.',
    left: 17,
    top: 20,
    z: 5,
    start: 0.2,
    spin: -12,
  },
  {
    src: ik('/whatwedo/community.webp'),
    alt: 'Community — organizing workshops, hackathons, and tech talks that foster innovation and collaboration among tech enthusiasts.',
    left: 83,
    top: 25,
    z: 4,
    start: 0.33,
    spin: 11,
  },
  {
    src: ik('/whatwedo/ml-android.webp'),
    alt: 'ML & Android — smart Android apps powered by machine learning, built with TensorFlow, Kotlin, and Google ML Kit to learn and adapt to user behavior.',
    left: 18,
    top: 67,
    z: 6,
    start: 0.46,
    spin: -9,
  },
  {
    src: ik('/whatwedo/design.webp'),
    alt: 'Design — intuitive interfaces, compelling visuals, designed with Figma, Adobe Creative Suite, and design thinking to create experiences users love.',
    left: 82,
    top: 70,
    z: 7,
    start: 0.59,
    spin: 12,
  },
  {
    src: ik('/whatwedo/techinical.PNG'),
    alt: 'Technical — Scalable web, mobile, and cloud solutions built with React, Node.js, Flutter, and modern DevOps, engineered for performance and digital transformation.',
    left: 50,
    top: 69,
    z: 8,
    start: 0.72,
    spin: -4,
  },
];

const REVEAL_DUR = 0.16;

type MobilePhoto = {
  src: string;
  alt: string;
  z: number;
  start: number;
  rot: number;
  offsetX: number;
  offsetY: number;
};

const MOBILE_PHOTOS: MobilePhoto[] = [
  {
    src: ik('/whatwedo/mobile/technical.png'),
    alt: 'Technical — Scalable web, mobile, and cloud solutions built with React, Node.js, Flutter, and modern DevOps, engineered for performance and digital transformation.',
    z: 16,
    start: 0.20,
    rot: -1.5,
    offsetX: -5,
    offsetY: 3,
  },
  {
    src: ik('/whatwedo/mobile/content.png'),
    alt: 'Content — engaging technical content and educational resources, from blog posts to video tutorials, making complex topics accessible for everyone.',
    z: 17,
    start: 0.32,
    rot: 3,
    offsetX: 6,
    offsetY: -3,
  },
  {
    src: ik('/whatwedo/mobile/coomunity.png'),
    alt: 'Community — organizing workshops, hackathons, and tech talks that foster innovation and collaboration among tech enthusiasts.',
    z: 18,
    start: 0.44,
    rot: -3.5,
    offsetX: -6,
    offsetY: -6,
  },
  {
    src: ik('/whatwedo/mobile/ml&andro.png'),
    alt: 'ML & Android — smart Android apps powered by machine learning, built with TensorFlow, Kotlin, and Google ML Kit to learn and adapt to user behavior.',
    z: 19,
    start: 0.56,
    rot: 2,
    offsetX: 4,
    offsetY: 3,
  },
  {
    src: ik('/whatwedo/mobile/design.png'),
    alt: 'Design — intuitive interfaces, compelling visuals, designed with Figma, Adobe Creative Suite, and design thinking to create experiences users love.',
    z: 20,
    start: 0.68,
    rot: -2,
    offsetX: -3,
    offsetY: 1,
  },
];

const REVEAL_DUR_MOBILE = 0.12;

export default function PolaroidScene2D({ progressRef }: { progressRef: React.RefObject<number> }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLImageElement>(null);
  const photoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mobileCameraRef = useRef<HTMLImageElement>(null);
  const mobilePhotoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mobileCameraWrapperRef = useRef<HTMLDivElement>(null);
  const mobileCameratopRef = useRef<HTMLImageElement>(null);
  const mobileTitleRef = useRef<HTMLHeadingElement>(null);
  const mobileFlashRef = useRef<HTMLDivElement>(null);
  const prevPRef = useRef<number>(-1);

  useEffect(() => {
    let raf = 0;
    let running = false;

    let containerWidth = 0;
    let containerHeight = 0;
    let cachedScale = 1;
    let cachedTitleTop = 0;
    let cachedCameraTop = 0;
    let cachedCameraWidth = 0;
    let cachedCameraHeight = 0;
    let cachedPhotoWidth = 0;
    let cachedPhotoHeight = 0;
    let cachedStartCenterY = 0;
    let cachedRestingCenterY = 0;
    let isMobile = false;

    const measureLayout = () => {
      isMobile = window.innerWidth < 768;
      if (!isMobile) return;

      const container = rootRef.current;
      if (container) {
        containerHeight = container.offsetHeight || window.innerHeight;
        containerWidth = container.offsetWidth || window.innerWidth;

        const topOffset = 62;
        const availableHeight = containerHeight - topOffset - 12;
        const baseGroupHeight = 560;
        const heightScale = availableHeight / baseGroupHeight;
        const widthScale = (containerWidth * 0.90) / 340;
        cachedScale = Math.max(0.3, Math.min(1.0, Math.min(heightScale, widthScale)));

        const titleHeight = 28 * cachedScale;
        const gap = 8 * cachedScale;

        cachedCameraWidth = 235 * cachedScale;
        cachedCameraHeight = cachedCameraWidth * 1.5015;

        cachedPhotoWidth = Math.min(containerWidth * 0.88, 340 * cachedScale);
        cachedPhotoHeight = cachedPhotoWidth * 1.25;

        cachedTitleTop = topOffset;
        cachedCameraTop = cachedTitleTop + titleHeight + gap;

        const slotY = cachedCameraTop + cachedCameraHeight * 0.791;
        cachedStartCenterY = slotY - (0.4 * cachedPhotoHeight) / 2;
        cachedRestingCenterY = cachedCameraTop + (containerHeight - 12 - cachedCameraTop) / 2;
      }
    };

    measureLayout();
    window.addEventListener('resize', measureLayout, { passive: true });

    const draw = () => {
      const p = progressRef.current ?? 0;
      if (p === prevPRef.current) return;
      prevPRef.current = p;

      if (isMobile) {
        // camera: no transform animation — must stay identical size to cameratop overlay
        const scale = cachedScale;
        const cameraWidth = cachedCameraWidth;
        const cameraTop = cachedCameraTop;
        const titleTop = cachedTitleTop;
        const photoWidth = cachedPhotoWidth;
        const startCenterY = cachedStartCenterY;
        const restingCenterY = cachedRestingCenterY;

        // Exit transition into events: from p=0.86 to 1.0, gently lift and soften
        let exitY = 0;
        let exitScale = 1;
        if (p > 0.86) {
          const exitT = clamp01((p - 0.86) / 0.12);
          exitY = -exitT * 28;
          exitScale = 1 - exitT * 0.04;
        }

        if (mobileTitleRef.current) {
          mobileTitleRef.current.style.top = `${titleTop}px`;
          mobileTitleRef.current.style.fontSize = `calc(1.8rem * ${scale})`;
          mobileTitleRef.current.style.transform = `translateY(${exitY}px) scale(${exitScale})`;
        }

        if (mobileCameraWrapperRef.current) {
          mobileCameraWrapperRef.current.style.top = `${cameraTop}px`;
          mobileCameraWrapperRef.current.style.width = `${cameraWidth}px`;
          mobileCameraWrapperRef.current.style.transform = `translateX(-50%) translateY(${exitY}px) scale(${exitScale})`;
        }
        if (mobileCameratopRef.current) {
          mobileCameratopRef.current.style.top = `${cameraTop}px`;
          mobileCameratopRef.current.style.width = `${cameraWidth}px`;
          mobileCameratopRef.current.style.transform = `translateX(-50%) translateY(${exitY}px) scale(${exitScale})`;
        }

        // photos: stack on top of each other fanned out
        for (let i = 0; i < MOBILE_PHOTOS.length; i++) {
          const el = mobilePhotoRefs.current[i];
          if (!el) continue;
          const ph = MOBILE_PHOTOS[i];

            const t = easeOut(smooth(ph.start, ph.start + REVEAL_DUR_MOBILE, p));
            const opacity = smooth(ph.start, ph.start + 0.05, p);
            el.style.opacity = opacity.toFixed(3);
            el.style.width = `${photoWidth}px`;

            // Interpolate the actual center Y position
            const currentCenterY = lerp(startCenterY, restingCenterY, t);

            const sc = lerp(0.4, 1.0, t) * exitScale;
            const rot = lerp(-10, ph.rot, t);
            
            // We apply translate(left, top) relative to the container.
            const currentOffsetX = ph.offsetX * scale;
            el.style.transform = `translate(-50%, -50%) translate(${currentOffsetX}px, calc(${currentCenterY.toFixed(1)}px + ${ph.offsetY * scale + exitY}px)) scale(${sc.toFixed(3)}) rotate(${rot.toFixed(2)}deg)`;
          }

          // Calculate flash opacity based on proximity to photo reveal starts
          let flashOpacity = 0;
          const flashThresholds = [0.18, 0.30, 0.42, 0.54, 0.66];
          const flashDuration = 0.03;
          
          for (const tVal of flashThresholds) {
            if (p >= tVal && p <= tVal + flashDuration) {
              const progressInFlash = (p - tVal) / flashDuration;
              flashOpacity = 0.85 * (1 - progressInFlash);
              break;
            }
          }
          if (mobileFlashRef.current) {
            const cameraLeft = containerWidth * 0.5 - cachedCameraWidth * 0.5;
            const flashCenterX = cameraLeft + cachedCameraWidth * 0.73;
            const flashCenterY = cameraTop + cachedCameraHeight * 0.215;

            const bgGradient = `radial-gradient(circle ${80 * scale}px at ${flashCenterX.toFixed(1)}px ${flashCenterY.toFixed(1)}px, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.9) 30%, rgba(255, 255, 255, 0) 100%), radial-gradient(circle 1000px at ${flashCenterX.toFixed(1)}px ${flashCenterY.toFixed(1)}px, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0) 100%)`;

            mobileFlashRef.current.style.left = '0';
            mobileFlashRef.current.style.top = '0';
            mobileFlashRef.current.style.width = '100%';
            mobileFlashRef.current.style.height = '100%';
            mobileFlashRef.current.style.background = bgGradient;
            mobileFlashRef.current.style.opacity = flashOpacity.toFixed(3);
          }
      } else {
        // camera: revealed in place by the flash, with a gentle settle
        if (cameraRef.current) {
          const s = lerp(1.05, 1, smooth(0, 0.22, p));
          cameraRef.current.style.transform = `translate(-50%, -50%) scale(${s.toFixed(3)})`;
        }

        // photos: each develops + rises + un-spins into its resting pose
        for (let i = 0; i < PHOTOS.length; i++) {
          const el = photoRefs.current[i];
          if (!el) continue;
          const ph = PHOTOS[i];
          const t = easeOut(smooth(ph.start, ph.start + REVEAL_DUR, p));
          el.style.opacity = smooth(ph.start, ph.start + 0.06, p).toFixed(3);
          const ty = (1 - t) * 36;
          const sc = lerp(0.84, 1, t);
          const rot = (1 - t) * ph.spin;
          el.style.transform = `translate(-50%, -50%) translateY(${ty.toFixed(1)}px) scale(${sc.toFixed(3)}) rotate(${rot.toFixed(2)}deg)`;
        }
      }

      prevPRef.current = p;
    };

    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    start();
    return () => {
      window.removeEventListener('resize', measureLayout);
      stop();
    };
  }, [progressRef]);

  return (
    <div ref={rootRef} className="wwd2d-root">
      {/* --- DESKTOP VIEW --- */}
      <div className="wwd2d-desktop">
        <div className="wwd2d-table" />
        <div className="wwd2d-vignette" />

        {PHOTOS.map((ph, i) => (
          <div
            key={ph.src}
            ref={(el) => {
              photoRefs.current[i] = el;
            }}
            className="wwd2d-photo-wrapper"
            style={{ left: `${ph.left}%`, top: `${ph.top}%`, zIndex: ph.z, opacity: 0 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative pre-rendered polaroid inside a GSAP stage; next/image adds no value */}
            <img
              src={ph.src}
              alt={ph.alt}
              draggable={false}
            />
          </div>
        ))}

        {/* eslint-disable-next-line @next/next/no-img-element -- decorative camera cutout */}
        <img ref={cameraRef} src={ik('/whatwedo/camera.webp')} alt="A Polaroid One Step camera" className="wwd2d-camera" draggable={false} />
      </div>

      {/* --- MOBILE VIEW --- */}
      <div className="wwd2d-mobile">
        <div ref={mobileFlashRef} className="wwd2d-mobile-flash" />
        <h2 ref={mobileTitleRef} className="wwd2d-mobile-title">What We Do</h2>
        <div className="wwd2d-vignette" />

        {/* Camera body wrapper — z:15, sits BEHIND the polaroids */}
        <div ref={mobileCameraWrapperRef} className="wwd2d-mobile-camera-wrapper">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative camera cutout */}
          <img
            ref={mobileCameraRef}
            src={ik('/whatwedo/mobile/camera.png')}
            alt="A Polaroid One Step camera"
            className="wwd2d-mobile-camera"
            draggable={false}
          />
        </div>

        {/* Polaroids — z-index 16-20, between camera body (15) and cameratop (30) */}
        {MOBILE_PHOTOS.map((ph, i) => (
          <div
            key={ph.src}
            ref={(el) => {
              mobilePhotoRefs.current[i] = el;
            }}
            className="wwd2d-mobile-photo-wrapper"
            style={{ zIndex: ph.z, opacity: 0 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative pre-rendered polaroid inside a GSAP stage */}
            <img
              src={ph.src}
              alt={ph.alt}
              draggable={false}
            />
          </div>
        ))}

        {/* Camera top overlay — z:30, sits ON TOP of polaroids.
            Positioned identically to the wrapper so it overlaps camera.png perfectly. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative overlay */}
        <img
          ref={mobileCameratopRef}
          src={ik('/whatwedo/mobile/cameratop.png')}
          alt=""
          className="wwd2d-mobile-cameratop"
          draggable={false}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

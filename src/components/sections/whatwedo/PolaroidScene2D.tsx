'use client';

import React, { useEffect, useRef } from 'react';

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
    src: '/whatwedo/content.webp',
    alt: 'Content — engaging technical content and educational resources, from blog posts to video tutorials, making complex topics accessible for everyone.',
    left: 17,
    top: 20,
    z: 5,
    start: 0.2,
    spin: -12,
  },
  {
    src: '/whatwedo/community.webp',
    alt: 'Community — organizing workshops, hackathons, and tech talks that foster innovation and collaboration among tech enthusiasts.',
    left: 83,
    top: 25,
    z: 4,
    start: 0.33,
    spin: 11,
  },
  {
    src: '/whatwedo/ml-android.webp',
    alt: 'ML & Android — smart Android apps powered by machine learning, built with TensorFlow, Kotlin, and Google ML Kit to learn and adapt to user behavior.',
    left: 18,
    top: 75,
    z: 6,
    start: 0.46,
    spin: -9,
  },
  {
    src: '/whatwedo/design.webp',
    alt: 'Design — intuitive interfaces, compelling visuals, designed with Figma, Adobe Creative Suite, and design thinking to create experiences users love.',
    left: 82,
    top: 78,
    z: 7,
    start: 0.59,
    spin: 12,
  },
  {
    src: '/whatwedo/techinical.PNG',
    alt: 'Technical — Scalable web, mobile, and cloud solutions built with React, Node.js, Flutter, and modern DevOps, engineered for performance and digital transformation.',
    left: 50,
    top: 77,
    z: 8,
    start: 0.72,
    spin: -4,
  },
];

const REVEAL_DUR = 0.16;

export default function PolaroidScene2D({ progressRef }: { progressRef: React.RefObject<number> }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLImageElement>(null);
  const photoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevPRef = useRef<number>(-1);

  useEffect(() => {
    let raf = 0;
    let running = false;

    const draw = () => {
      const p = progressRef.current ?? 0;

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

      // shutter whir on each forward crossing (never on scrub-back)
      const prev = prevPRef.current;
      if (prev >= 0) {
        // for (const ph of PHOTOS) if (prev < ph.start && p >= ph.start) playWhir(0.85);
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

    // only spin the frame loop while the scene is actually on screen
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && document.visibilityState !== 'hidden') start();
        else stop();
      },
      { threshold: 0 }
    );
    if (rootRef.current) io.observe(rootRef.current);
    const onVis = () => {
      if (document.visibilityState === 'hidden') stop();
    };
    document.addEventListener('visibilitychange', onVis);

    draw();
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  }, [progressRef]);

  return (
    <div ref={rootRef} className="wwd2d-root">
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
      <img ref={cameraRef} src="/whatwedo/camera.webp" alt="A Polaroid One Step camera" className="wwd2d-camera" draggable={false} />
    </div>
  );
}

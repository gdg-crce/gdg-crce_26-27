'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { whatWeDoItems } from './whatWeDoData';
import { unlockPolaroidAudio, playShutter, playWhir } from './polaroidAudio';
import './whatwedo.css';

/* The R3F lens-portal scene — no SSR for WebGL (same contract as WallScene). */
const PolaroidScene = dynamic(() => import('@/components/three/PolaroidScene'), {
  ssr: false,
  loading: () => (
    <div className="wwd-loading">
      <span>DEVELOPING…</span>
    </div>
  ),
});

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ramp = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Pinned scroll length. Matches the Events act's density (~ one screen of
 *  scroll per beat: flash, pan-out, three prints, handoff). */
const SCROLL_END = 8000;

/** Print choreography — kept in sync with PolaroidScene. */
const CONTENT_A = 0.42;
const CONTENT_B = 0.9;

/**
 * WhatWeDoSection — the Polaroid lens-portal (Act 2.5).
 *
 * A ScrollTrigger-pinned host that scrubs one 0→1 progress into a mutable
 * `progressRef`, read by the R3F scene's camera rig and printing photos (no
 * React state on the frame path — same contract as EventsAndCouncilSection).
 * The white flash + shutter fire on entry (masking the seam out of the About
 * turntable), then the camera dollies out of the lens and prints the sections.
 */
export default function WhatWeDoSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<number>(0);
  const flashRef = useRef<HTMLDivElement>(null);
  const exitDimRef = useRef<HTMLDivElement>(null);
  const prevPRef = useRef<number>(-1);
  const reducedRef = useRef(false);

  const N = whatWeDoItems.length;

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      pin: containerRef.current,
      start: 'top top',
      end: `+=${SCROLL_END}`,
      scrub: 0.6,
      onUpdate: (self) => {
        const p = self.progress;
        progressRef.current = p;

        // FLASH — full-white on entry, clearing to reveal the lens interior
        if (flashRef.current) {
          const peak = reducedRef.current ? 0.26 : 0.95;
          const fall = 1 - ramp(0.02, 0.15, p);
          flashRef.current.style.opacity = (fall * fall * peak).toFixed(3);
        }

        // HANDOFF — darken into the Events street
        if (exitDimRef.current) {
          exitDimRef.current.style.opacity = (ramp(0.93, 1.0, p) * 0.85).toFixed(3);
        }

        // SOUND — fired on forward crossings only (never on scrub-back)
        const prev = prevPRef.current;
        if (prev >= 0) {
          if (prev < 0.03 && p >= 0.03) playShutter();
          const seg = (CONTENT_B - CONTENT_A) / N;
          for (let i = 0; i < N; i++) {
            const start = CONTENT_A + i * seg;
            if (prev < start && p >= start) playWhir(0.9);
          }
        }
        prevPRef.current = p;
      },
    });

    // Unlock audio on the first real gesture (the visitor has already clicked
    // the preloader and is scrolling to reach here).
    const unlock = () => {
      unlockPolaroidAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('wheel', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    window.addEventListener('wheel', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });

    const to = setTimeout(() => ScrollTrigger.refresh(), 160);
    return () => {
      clearTimeout(to);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('wheel', unlock);
      window.removeEventListener('touchstart', unlock);
      trigger.kill();
    };
  }, [N]);

  return (
    <section ref={sectionRef} id="what-we-do" className="whatwedo-section" aria-label="What GDG CRCE does">
      <div ref={containerRef} className="wwd-pin">
        {/* the 3D lens-portal */}
        <div className="wwd-canvas-wrap">
          <PolaroidScene progressRef={progressRef} />
        </div>

        {/* the shutter flash + the exit fade to Events */}
        <div ref={flashRef} className="wwd-flash" />
        <div ref={exitDimRef} className="wwd-exit-dim" />
      </div>
    </section>
  );
}

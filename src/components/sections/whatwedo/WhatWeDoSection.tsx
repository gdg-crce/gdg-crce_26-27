'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { unlockPolaroidAudio, playShutter } from './polaroidAudio';
import './whatwedo.css';

/* The interactive Polaroid album — dynamically imported (ssr:false) so its
   IntersectionObserver + rAF frame loop only ever runs client-side. */
const PolaroidAlbumScene = dynamic(() => import('./PolaroidAlbumScene'), {
  ssr: false,
  loading: () => (
    <div className="wwd-loading">
      <span>REVISITING MEMORIES…</span>
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
const SCROLL_END = 4000;

/**
 * WhatWeDoSection — the Polaroid wall (Act 2.5).
 *
 * This section perfectly freezes the turntable exactly where it is by pinning at 'top bottom'.
 * The globally fixed wrapper then flawlessly morphs the screenshot into a 3D book,
 * stretched over 4000px of scrolling for an incredibly smooth and deliberate unraveling experience!
 */
export default function WhatWeDoSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<number>(0);
  const flashRef = useRef<HTMLDivElement>(null);
  const reducedRef = useRef(false);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── MAIN PIN & TRANSITION ───────────────────────────────────────────────
    // By starting at 'top bottom', we instantly take over the screen the moment
    // AboutSection finishes. The entire 4000px scroll is now dedicated to the animation,
    // giving us a beautifully slow, controlled unraveling experience without scroll gaps!
    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      pin: containerRef.current,
      start: 'top bottom', // INSTANT handoff from AboutSection
      end: `+=${SCROLL_END}`,
      scrub: true,
      onUpdate: (self) => {
        progressRef.current = self.progress;
        if (flashRef.current) {
          // Keep it perfectly visible during the section
          flashRef.current.style.opacity = self.progress > 0 ? '1' : '0';
          // Enable pointer events ONLY after the morph is mostly done, 
          // to ensure scroll isn't hijacked during the critical morph phase
          flashRef.current.style.pointerEvents = self.progress > 0.15 ? 'auto' : 'none';
        }
      }
    });

    // Unlock audio on the first real gesture
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
  }, []);

  return (
    <>
      {/* The globally fixed wrapper that prevents the scroll-up and holds the 3D scene */}
      <div ref={flashRef} className="fixed-album-wrapper">
        <div className="wwd-solid-bg" />
        <PolaroidAlbumScene progressRef={progressRef} />
      </div>

      <section ref={sectionRef} id="what-we-do" className="whatwedo-section" aria-label="What GDG CRCE does">
        {/* Height 0 prevents empty scroll gap after unpinning */}
        <div ref={containerRef} style={{ height: 0 }} />
      </section>
    </>
  );
}

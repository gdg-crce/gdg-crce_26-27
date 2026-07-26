'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { unlockPolaroidAudio } from './polaroidAudio';
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

/** Pinned scroll length — 4000px gives one full, luxurious unraveling experience. */
const SCROLL_END = 4000;

/**
 * WhatWeDoSection — the Polaroid wall (Act 2.5).
 *
 * Architecture:
 *  - A `position: fixed` overlay sits above the entire DOM at z-index 99990.
 *    It is invisible (opacity: 0, pointerEvents: none) by default.
 *  - A spacer `<section>` in normal document flow is 4000px tall. GSAP pins a
 *    0-height sentinel inside it.
 *  - ScrollTrigger starts at 'top bottom' (the moment the About section exits
 *    the bottom of the viewport). At progress > 0 the fixed overlay instantly
 *    snaps to opacity 1, giving a seamless screenshot→album morph with NO
 *    scroll-up gap.
 *  - At progress === 1 (end of the 4000px spacer) the overlay fades back to
 *    opacity 0 so everything underneath (TearTransition → Events) flows
 *    normally again.
 */
export default function WhatWeDoSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<number>(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      // Pin a 0-height sentinel so GSAP uses the section as the scroll region
      // but does NOT push the page down with a pin-spacer of its own.
      pin: sentinelRef.current,
      start: 'top bottom',   // Instant handoff — fires the moment About exits
      end: `+=${SCROLL_END}`,
      scrub: true,
      onUpdate: (self) => {
        progressRef.current = self.progress;

        if (overlayRef.current) {
          if (self.progress > 0 && self.progress < 1) {
            // Snap visible immediately — no fade-in so morph feels instant
            overlayRef.current.style.opacity = '1';
            overlayRef.current.style.pointerEvents = 'auto';
          } else {
            // Hidden before section starts and after section ends
            overlayRef.current.style.opacity = '0';
            overlayRef.current.style.pointerEvents = 'none';
          }
        }
      },
      // Also hide on leave so it doesn't persist after scrolling past
      onLeave: () => {
        if (overlayRef.current) {
          overlayRef.current.style.opacity = '0';
          overlayRef.current.style.pointerEvents = 'none';
        }
      },
      onEnterBack: () => {
        if (overlayRef.current) {
          overlayRef.current.style.opacity = '1';
          overlayRef.current.style.pointerEvents = 'auto';
        }
      },
      onLeaveBack: () => {
        if (overlayRef.current) {
          overlayRef.current.style.opacity = '0';
          overlayRef.current.style.pointerEvents = 'none';
        }
      },
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
      {/* ── Fixed overlay: sits above the entire DOM, invisible until activated ── */}
      <div ref={overlayRef} className="fixed-album-wrapper">
        <div className="wwd-solid-bg" />
        <PolaroidAlbumScene progressRef={progressRef} />
      </div>

      {/* ── Normal-flow spacer: gives GSAP 4000px of scroll to scrub against ── */}
      <section
        ref={sectionRef}
        id="what-we-do"
        className="whatwedo-section"
        aria-label="What GDG CRCE does"
        style={{ height: `${SCROLL_END}px` }}
      >
        {/* 0-height sentinel that GSAP pins without adding its own spacer */}
        <div ref={sentinelRef} style={{ height: 0 }} />
      </section>
    </>
  );
}

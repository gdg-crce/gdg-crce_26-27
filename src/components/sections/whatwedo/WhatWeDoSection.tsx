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

/** Pinned scroll length — 5000px gives one full, luxurious unraveling experience + deep dive zoom. */
const SCROLL_END = 5000;

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
  const flashRef = useRef<HTMLDivElement>(null);
  const REVEAL_PX = 800;

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      // Pin a 0-height sentinel so GSAP uses the section as the scroll region
      // but does NOT push the page down with a pin-spacer of its own.
      pin: sentinelRef.current,
      start: 'top bottom',   // Instant handoff — fires the moment About exits
      end: 'bottom top',     // Extended to scrub perfectly until EventsAndCouncilSection is at top top
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

    const getRevealPx = () => (window.innerWidth < 768 ? 500 : REVEAL_PX);

    // ── SEAM FLASH ──────────────────────────────────────────────────────────
    // The fixed whiteout that masks the About→WhatWeDo hand-off. It lives
    // OUTSIDE the pinned stage (position:fixed), so it blankets the viewport
    // across the seam where the two pinned sections swap. Rises to solid white
    // over the tail of the About turntable, HOLDS white while the sections slide
    // behind it, then clears once we are pinned — so the lens is revealed
    // through the flash and never visibly scrolls up.
    //
    // Not pinned, and its end is a pixel length, so it scrubs straight through
    // the seam and on into the start of the pin without touching the pin's own
    // scrub math. Function start/end re-resolve against innerHeight on refresh.
    let flashPrev = -1;
    const flash = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: () => `top bottom+=${Math.round(window.innerHeight * 0.6)}`,
      end: () => `+=${Math.round(window.innerHeight * 1.6 + getRevealPx())}`,
      scrub: 1.5,
      onUpdate: (self) => {
        const p = self.progress;
        const vh = window.innerHeight;
        const revealPx = getRevealPx();
        const total = vh * 1.6 + revealPx;
        const riseEnd = (vh * 0.6) / total; // solid white by the start of the seam
        const holdEnd = (vh * 1.6) / total; // hold white until the pin engages
        let op: number;
        
        // Custom ramp function for smooth fading
        const ramp = (start: number, end: number, val: number) => clamp01((val - start) / (end - start));
        
        if (p <= riseEnd) op = ramp(0, riseEnd, p);
        else if (p <= holdEnd) op = 1;
        else op = 1 - ramp(holdEnd, 1, p);
        if (flashRef.current) flashRef.current.style.opacity = op.toFixed(3);

        // shutter click fires once, on the forward crossing into full white
        // if (flashPrev >= 0 && flashPrev < riseEnd && p >= riseEnd) playShutter();
        flashPrev = p;
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
      <div ref={flashRef} className="wwd-seam-flash" />
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

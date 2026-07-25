'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { unlockPolaroidAudio, playShutter } from './polaroidAudio';
import './whatwedo.css';

/* The flat (2D DOM) Polaroid wall — dynamically imported (ssr:false) so its
   IntersectionObserver + rAF frame loop only ever runs client-side. */
const PolaroidScene2D = dynamic(() => import('./PolaroidScene2D'), {
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
const SCROLL_END = 4000;

/** Scroll distance, measured from the pin's start, over which the seam flash
 *  clears back down to reveal the scene behind it. */
const REVEAL_PX = 1400;

/**
 * WhatWeDoSection — the Polaroid wall (Act 2.5).
 *
 * A ScrollTrigger-pinned host that scrubs one 0→1 progress into a mutable
 * `progressRef`, read by the 2D scene to develop its prints (no React state on
 * the frame path — same contract as EventsAndCouncilSection).
 *
 * The About turntable and this section are two adjacent pinned sections, so the
 * scrollbar has to hand off between them — a ~100vh window where About slides
 * up and out while this section slides up and in. We never want that slide to
 * be *seen*: a fixed, full-viewport white flash (`.wwd-seam-flash`, driven by
 * its own trigger below) blankets the viewport across the seam, rising to solid
 * white over the tail of About, holding white while the sections swap behind
 * it, then clearing once we are pinned — so the scene is revealed *through* the
 * flash rather than scrolling up. From there the prints develop in one by one.
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

    // Reduced motion swaps the bright flash for a gentle dark blink — same seam
    // mask, no strobe — because a full-viewport white flash is exactly the kind
    // of thing that setting asks us not to do.
    if (flashRef.current) {
      flashRef.current.style.background = reducedRef.current ? '#050409' : '#ffffff';
    }

    // ── MAIN PIN ────────────────────────────────────────────────────────────
    // Scrubs 0→1 into progressRef, read by the 2D scene (camera settle + the
    // prints developing in). The print whir is fired from PolaroidScene2D, which
    // owns the reveal schedule.
    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      pin: containerRef.current,
      start: 'top top',
      end: `+=${SCROLL_END}`,
      scrub: 1.5,
      onUpdate: (self) => {
        const p = self.progress;
        progressRef.current = p;

        // HANDOFF removed for tear transition
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
        if (p <= riseEnd) op = ramp(0, riseEnd, p);
        else if (p <= holdEnd) op = 1;
        else op = 1 - ramp(holdEnd, 1, p);
        if (flashRef.current) flashRef.current.style.opacity = op.toFixed(3);

        // shutter click fires once, on the forward crossing into full white
        if (flashPrev >= 0 && flashPrev < riseEnd && p >= riseEnd) playShutter();
        flashPrev = p;
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
      flash.kill();
    };
  }, []);

  return (
    <section ref={sectionRef} id="what-we-do" className="whatwedo-section" aria-label="What GDG CRCE does">
      {/* Seam flash — OUTSIDE the pinned stage, position:fixed, so it blankets
          the whole viewport during the About→WhatWeDo hand-off and hides the
          scroll seam. Driven by its own trigger (see the effect above). */}
      <div ref={flashRef} className="wwd-seam-flash" aria-hidden="true" />

      <div ref={containerRef} className="wwd-pin">
        {/* the flat Polaroid wall (table + camera + caption prints) */}
        <div className="wwd-canvas-wrap">
          <PolaroidScene2D progressRef={progressRef} />
        </div>

      </div>
    </section>
  );
}

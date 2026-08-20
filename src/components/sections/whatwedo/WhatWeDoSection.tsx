'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { unlockPolaroidAudio, playShutter } from './polaroidAudio';
import './whatwedo.css';

/* The interactive Polaroid album — dynamically imported (ssr:false) so its
   IntersectionObserver + rAF frame loop only ever runs client-side. Desktop. */
const PolaroidAlbumScene = dynamic(() => import('./PolaroidAlbumScene'), {
  ssr: false,
  loading: () => (
    <div className="wwd-loading">
      <span>REVISITING MEMORIES…</span>
    </div>
  ),
});

/* The lighter 2D Polaroid camera scene (camera body + prints developing out) —
   the intended MOBILE experience. Kept off desktop; also far cheaper than the
   3D album, which is why mobile must not run the album. Same progressRef
   contract, so it drops into the same overlay. */
const PolaroidScene2D = dynamic(() => import('./PolaroidScene2D'), {
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

  // Which scene to mount. `mounted` gates the ssr:false scenes until we know the
  // real viewport (no hydration mismatch); `isMobile` picks the 2D camera scene
  // on phones and the 3D album on desktop. Re-evaluated on breakpoint change.
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    /* One switch for "the album is on screen", written straight to the DOM.
       `opacity: 0` alone left ten stacked full-viewport layers — photographic
       backgrounds, gloss gradients, a 50px blur, a blended grain plate — being
       laid out, painted and composited on every frame of the whole page, and
       left the book's 8s float animation running from first paint to last.
       The class drives `visibility`, `animation-play-state` and `will-change`
       from the stylesheet, so all of that stops when the act is not playing.
       No React state: this runs on the scroll hot path. */
    let activeNow: boolean | null = null;

    /* Smooth pure function of progress.
       From p=0.86 to p=0.98, WhatWeDo seamlessly crossfades out into Events,
       preventing any abrupt cuts or popping. */
    const applyAlbumState = (progress: number) => {
      progressRef.current = progress;
      const el = overlayRef.current;
      if (!el) return;

      if (progress <= 0 || progress >= 1) {
        if (activeNow !== false) {
          activeNow = false;
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          el.classList.remove('is-active');
        }
        return;
      }

      activeNow = true;
      el.classList.add('is-active');

      // Smooth exit ramp into Events
      const FADE_START = 0.86;
      const FADE_END = 0.98;
      let opacity = 1;
      if (progress > FADE_START) {
        opacity = Math.max(0, 1 - (progress - FADE_START) / (FADE_END - FADE_START));
      }

      el.style.opacity = opacity.toFixed(3);
      el.style.pointerEvents = opacity > 0.3 ? 'auto' : 'none';
    };

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      // Pin a 0-height sentinel so GSAP uses the section as the scroll region
      // but does NOT push the page down with a pin-spacer of its own.
      pin: sentinelRef.current,
      start: 'top bottom',   // Instant handoff — fires the moment About exits
      end: 'bottom top',     // Extended to scrub perfectly until EventsAndCouncilSection is at top top
      scrub: true,
      onUpdate: (self) => applyAlbumState(self.progress),
      onRefresh: (self) => applyAlbumState(self.progress),
      // Also hide on leave so it doesn't persist after scrolling past
      onLeave: () => applyAlbumState(1),
      onEnterBack: () => applyAlbumState(0.99),
      onLeaveBack: () => applyAlbumState(0),
    });

    applyAlbumState(trigger.progress);

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
    /* Same treatment as the album overlay above, for the same reason: this is
       another fixed, full-viewport sheet — and this one is SOLID WHITE at the
       top of its ramp. Desktop short-circuits it to 0 on the next line so it
       cannot strand there, but on mobile a refresh landing inside the hold
       would leave a white screen over the events act with no tick coming to
       clear it. `playShutter` is deliberately NOT reachable from the refresh
       path: it is an edge-triggered sound, and re-running it on a re-measure
       would fire the camera click at nothing. */
    const applyFlash = (p: number, allowSound: boolean) => {
        if (window.innerWidth >= 768) {
          if (flashRef.current) flashRef.current.style.opacity = '0';
          return;
        }

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
        if (allowSound && flashPrev >= 0 && flashPrev < riseEnd && p >= riseEnd) playShutter();
        flashPrev = p;
    };

    const flash = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: () => `top bottom+=${Math.round(window.innerHeight * 0.6)}`,
      end: () => `+=${Math.round(window.innerHeight * 1.6 + getRevealPx())}`,
      scrub: 1.5,
      onUpdate: (self) => applyFlash(self.progress, true),
      onRefresh: (self) => applyFlash(self.progress, false),
    });

    applyFlash(flash.progress, false);

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
      // The seam flash was created and never killed. Every remount — StrictMode
      // in dev, any HMR edit to this file — left another live ScrollTrigger
      // behind, each one running its callback on every scroll event for the
      // rest of the session.
      flash.kill();
    };
  }, []);

  return (
    <>
      <div ref={flashRef} className="wwd-seam-flash" />
      {/* ── Fixed overlay: sits above the entire DOM, invisible until activated ── */}
      <div ref={overlayRef} className="fixed-album-wrapper">
        <div className="wwd-solid-bg" />
        {mounted &&
          (isMobile ? (
            <PolaroidScene2D progressRef={progressRef} />
          ) : (
            <PolaroidAlbumScene progressRef={progressRef} observeRef={sectionRef} />
          ))}
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

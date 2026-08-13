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
  const shutterPlayedRef = useRef(false);

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
    const setActive = (on: boolean) => {
      const el = overlayRef.current;
      if (!el || on === activeNow) return;
      activeNow = on;
      if (!on) {
        el.style.opacity = '0';
        el.style.transform = '';
      }
      el.style.pointerEvents = on ? 'auto' : 'none';
      el.classList.toggle('is-active', on);
    };

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      // Pin a 0-height sentinel so GSAP uses the section as the scroll region
      // but does NOT push the page down with a pin-spacer of its own.
      pin: sentinelRef.current,
      start: 'top bottom',   // Instant handoff — fires the moment About exits
      end: 'bottom top',     // Extended to scrub perfectly until EventsAndCouncilSection is at top top
      scrub: 1.5,
      onUpdate: (self) => {
        progressRef.current = self.progress;
        const active = self.progress > 0 && self.progress < 1;
        setActive(active);

        if (active) {
          const el = overlayRef.current;
          if (el) {
            const isMobile = window.innerWidth < 768;
            if (isMobile) {
              // On mobile, scroll the What We Do section upwards (translateY) out of the viewport
              const vh = window.innerHeight;
              const scrollCurrent = self.progress * SCROLL_END;
              const transitionStart = SCROLL_END - vh;
              
              let translateY = 0;
              if (scrollCurrent > transitionStart) {
                translateY = -(scrollCurrent - transitionStart);
              }
              el.style.transform = `translateY(${translateY}px)`;
              el.style.opacity = '1';

              // Synchronized seam flash fade-out
              const flashEl = flashRef.current;
              if (flashEl) {
                let flashOp = 1;
                if (self.progress > 0) {
                  flashOp = 1 - clamp01(self.progress / 0.10);
                }
                flashEl.style.opacity = flashOp.toFixed(3);
              }

              // Play shutter sound exactly once when entering WhatWeDoSection
              if (self.progress > 0 && self.progress < 0.10 && !shutterPlayedRef.current) {
                playShutter();
                shutterPlayedRef.current = true;
              } else if (self.progress === 0) {
                shutterPlayedRef.current = false;
              }
            } else {
              // Desktop version uses the original opacity fade
              let opacity = 1;
              if (self.progress > 0.90) {
                opacity = 1 - (self.progress - 0.90) / 0.10;
              }
              el.style.opacity = opacity.toFixed(3);
              el.style.transform = '';
            }
          }
        }
      },
      // Also hide on leave so it doesn't persist after scrolling past
      onLeave: () => setActive(false),
      onEnterBack: () => setActive(true),
      onLeaveBack: () => setActive(false),
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

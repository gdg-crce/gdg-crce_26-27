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

    // ── TRANSITION MASK ─────────────────────────────────────────────────────
    // Instantly covers the screen at the exact moment the scroll-up begins.
    // Maps the 100vh physical scroll-up directly to the first 15% of the book shrinking!
    const transition = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top bottom',
      end: 'top top',
      scrub: true,
      onUpdate: (self) => {
        if (flashRef.current) {
          flashRef.current.style.opacity = self.progress > 0 ? '1' : '0';
          flashRef.current.style.pointerEvents = self.progress > 0.5 ? 'auto' : 'none';
        }
        // Drive the morph phase!
        progressRef.current = self.progress * 0.15;
      }
    });

    // ── MAIN PIN ────────────────────────────────────────────────────────────
    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      pin: containerRef.current,
      start: 'top top',
      end: `+=${SCROLL_END}`,
      scrub: true,
      onUpdate: (self) => {
        // Drive the page flips!
        progressRef.current = 0.15 + self.progress * 0.85;
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
      transition.kill();
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
        {/* The pin spacer just dictates the physical scroll height */}
        <div ref={containerRef} className="wwd-pin-spacer" />
      </section>
    </>
  );
}

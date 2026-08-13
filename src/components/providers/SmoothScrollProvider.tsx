'use client';

import React, { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register ScrollTrigger to be safe, though likely registered elsewhere
    gsap.registerPlugin(ScrollTrigger);

    // Initialize Lenis with cinematic "butter-smooth" settings.
    // autoRaf:false is CRITICAL — GSAP's ticker drives lenis.raf below. Without
    // it, Lenis ALSO runs its own rAF, so lenis.raf fires twice per frame and
    // scroll double-advances/desyncs against the pinned ScrollTriggers — the
    // source of the intermittent scroll-lock across About/WhatWeDo/Events.
    const lenis = new Lenis({
      autoRaf: false,
      duration: 1.5, // slightly longer duration for buttery smooth momentum
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // default expo-out, very smooth
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      syncTouch: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    // Wire Lenis's scroll event directly to GSAP's ScrollTrigger update.
    // This ensures pinning and scrub animations recalculate instantly.
    lenis.on('scroll', ScrollTrigger.update);

    // Single ticker callback drives Lenis. Kept in a stable ref so cleanup can
    // remove THIS exact function — the previous code passed a fresh arrow to
    // gsap.ticker.remove(), which removed nothing and let callbacks + Lenis
    // instances stack on every remount (dev StrictMode / HMR), fighting scroll.
    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);

    // Disable GSAP's default lag smoothing because Lenis handles delta timing internally.
    // This prevents sudden animation jumps if a frame drops.
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}

'use client';

import React, { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register ScrollTrigger to be safe, though likely registered elsewhere
    gsap.registerPlugin(ScrollTrigger);

    // Initialize Lenis with cinematic "butter-smooth" settings
    const lenis = new Lenis({
      duration: 1.5, // slightly longer duration for buttery smooth momentum
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // default expo-out, very smooth
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    // Wire Lenis's scroll event directly to GSAP's ScrollTrigger update.
    // This ensures pinning and scrub animations recalculate instantly.
    lenis.on('scroll', ScrollTrigger.update);

    // Sync Lenis's requestAnimationFrame loop with GSAP's internal ticker.
    // This is CRITICAL for preventing visual jitter on pinned elements.
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    // Disable GSAP's default lag smoothing because Lenis handles delta timing internally.
    // This prevents sudden animation jumps if a frame drops.
    gsap.ticker.lagSmoothing(0);

    return () => {
      // Cleanup on unmount
      gsap.ticker.remove((time) => {
        lenis.raf(time * 1000);
      });
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}

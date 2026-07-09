'use client';

import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const FilmTape = dynamic(() => import('../../../models/reactComponent/FilmTape'), {
  ssr: false,
  loading: () => null,
});

const VHSTape = dynamic(() => import('../../../models/reactComponent/VHSTape'), {
  ssr: false,
  loading: () => null,
});

interface PreloaderProps {
  onComplete: () => void;
}

type FilmFrame = '2000x' | '90s' | '80s' | '70s';

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function frameForProgress(progress: number): FilmFrame {
  if (progress < 0.26) return '2000x';
  if (progress < 0.46) return '90s';
  if (progress < 0.64) return '80s';
  return '70s';
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const completedRef = useRef(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollTrackRef = useRef<HTMLDivElement | null>(null);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setCompleted(true);
    window.setTimeout(() => {
      document.body.style.overflow = '';
      onComplete();
    }, 620);
  }, [onComplete]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const track = scrollTrackRef.current;
    if (!scroller || !track) return;

    document.body.style.overflow = 'hidden';
    gsap.registerPlugin(ScrollTrigger);

    const trigger = ScrollTrigger.create({
      trigger: track,
      scroller,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.45,
      onUpdate: (self) => {
        const next = clamp(self.progress);
        setProgress(next);
        if (next > 0.992) complete();
      },
    });

    requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      trigger.kill();
      document.body.style.overflow = '';
    };
  }, [complete]);

  const visual = useMemo(() => {
    const p = clamp(progress);
    const intro = clamp(p / 0.1);
    const zoomOut = clamp((p - 0.08) / 0.36);
    const rewind = clamp((p - 0.18) / 0.56);
    const filmExit = clamp((p - 0.68) / 0.16);
    const pullForce = clamp((p - 0.61) / 0.11) * (1 - clamp((p - 0.84) / 0.08));
    const pullTexture = clamp((p - 0.62) / 0.08) * (1 - clamp((p - 0.82) / 0.07)) * 0.22;
    const tapeIn = clamp((p - 0.74) / 0.16);
    const finalZoom = clamp((p - 0.9) / 0.09);
    const exitLock = 1 - filmExit;
    const jitter = Math.sin(p * 165) * rewind * exitLock * (1 - finalZoom) * 1.15;

    return {
      p,
      activeFrame: frameForProgress(p),
      rewind,
      filmOpacity: intro * (1 - clamp((p - 0.82) / 0.08)),
      filmX: 54 - zoomOut * 54 - rewind * 56 + filmExit * 124 + pullForce * 18 + jitter,
      filmY: -2.5 + zoomOut * 1.8,
      filmScale: 3.38 - zoomOut * 1.78 - filmExit * 0.18,
      filmScaleX: 1 + pullForce * 0.11,
      filmFilter: 'blur(' + pullForce * 0.7 + 'px) contrast(' + (1 + pullForce * 0.06) + ') brightness(' + (1 + pullForce * 0.02) + ')',
      filmRotate: -0.35 + rewind * -0.55,
      filmSkew: rewind * exitLock * -0.75,
      tapeOpacity: tapeIn,
      tapeX: 116 - tapeIn * 116,
      tapeY: -1,
      tapeScale: 1.02 + finalZoom * 0.14,
      tapeRotate: 0,
      scanOpacity: 0.09 + rewind * 0.16 + pullTexture * 0.12,
      glitchOpacity: rewind * (1 - finalZoom * 0.75) * 0.22 + pullTexture * 0.68,
      logoScale: 0.94 + finalZoom * 0.1,
      pullTexture,
    };
  }, [progress]);

  return (
    <AnimatePresence>
      {!completed && (
        <motion.div
          key="rewind-preloader"
          ref={scrollerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(16px)', transition: { duration: 0.62, ease: [0.76, 0, 0.24, 1] } }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] isolate overflow-y-auto overflow-x-hidden bg-black text-neutral-200 overscroll-contain"
          role="status"
          aria-label="GDG CRCE rewind loader"
        >
          <div ref={scrollTrackRef} className="relative h-[470vh]">
            <div className="sticky top-0 h-screen overflow-hidden">
              <div className="absolute inset-0 bg-black" />
              <div className="loader-black-grain" />
              <div className="loader-crt-green-wash" />
              <div className="preloader-vignette" />
              <div className="preloader-scanlines" style={{ opacity: visual.scanOpacity }} />
              <div className="loader-rewind-smear" style={{ opacity: visual.glitchOpacity }} />
              <div className="loader-rewind-pull" style={{ opacity: visual.pullTexture }} />

              <motion.div
                className="absolute left-1/2 top-[47%] w-[min(2780px,238vw)] -translate-x-1/2 -translate-y-1/2 will-change-transform"
                style={{
                  x: `${visual.filmX}%`,
                  y: `${visual.filmY}vh`,
                  scale: visual.filmScale,
                  scaleX: visual.filmScaleX,
                  rotate: visual.filmRotate,
                  skewX: visual.filmSkew,
                  opacity: visual.filmOpacity,
                  transformOrigin: '50% 50%',
                  filter: visual.filmFilter,
                }}
              >
                <FilmTape activeFrame={visual.activeFrame} rewindIntensity={visual.rewind} />
              </motion.div>

              <motion.div
                className="absolute left-1/2 top-[52%] w-[min(1180px,96vw)] -translate-x-1/2 -translate-y-1/2 will-change-transform"
                style={{
                  x: `${visual.tapeX}%`,
                  y: `${visual.tapeY}vh`,
                  scale: visual.tapeScale,
                  rotate: visual.tapeRotate,
                  opacity: visual.tapeOpacity,
                }}
              >
                <VHSTape reelRotation={visual.p * 1360} logoScale={visual.logoScale} />
              </motion.div>

              <div className="absolute bottom-7 left-1/2 h-px w-[min(360px,66vw)] -translate-x-1/2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-neutral-300 shadow-[0_0_18px_rgba(255,255,255,0.45)]" style={{ width: `${visual.p * 100}%` }} />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

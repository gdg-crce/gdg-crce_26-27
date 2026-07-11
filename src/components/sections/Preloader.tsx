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

import { usePreloaderAudio } from '@/hooks/usePreloaderAudio';

interface PreloaderProps {
  onComplete: () => void;
}

type FilmFrame = '2020s' | '90s' | '80s' | '70s';

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function frameForProgress(progress: number): FilmFrame {
  if (progress < 0.26) return '2020s';
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
  const prevProgressRef = useRef(0);

  const { soundEnabled, toggleSound, stopAllAudio, updateVelocity, playInsertClick } = usePreloaderAudio();

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setCompleted(true);
    stopAllAudio();
    window.setTimeout(() => {
      document.body.style.overflow = '';
      onComplete();
    }, 620);
  }, [onComplete, stopAllAudio]);

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
      scrub: 0.75,
      onUpdate: (self) => {
        const next = clamp(self.progress);
        setProgress(next);

        // Scrub mechanical rewind audio velocity
        updateVelocity(self.getVelocity() / 1500);

        // Trigger mechanical cassette insert click once when cassette locks into center (progress >= 0.93)
        if (next >= 0.93 && prevProgressRef.current < 0.93) {
          playInsertClick();
        }
        prevProgressRef.current = next;

        if (next > 0.992) complete();
      },
    });

    requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      trigger.kill();
      stopAllAudio();
      document.body.style.overflow = '';
    };
  }, [complete, stopAllAudio, updateVelocity, playInsertClick]);

  const visual = useMemo(() => {
    const p = clamp(progress);
    const intro = clamp(p / 0.1);
    const zoomOut = clamp((p - 0.08) / 0.36);
    const rewind = clamp((p - 0.18) / 0.56);
    const filmExit = clamp((p - 0.62) / 0.13);
    const pullForce = clamp((p - 0.61) / 0.11) * (1 - clamp((p - 0.84) / 0.08));
    const pullTexture = clamp((p - 0.62) / 0.08) * (1 - clamp((p - 0.82) / 0.07)) * 0.22;
    const tapeIn = clamp((p - 0.63) / 0.32);
    const tapeEased = 1 - Math.pow(1 - tapeIn, 4);
    const finalZoom = clamp((p - 0.94) / 0.05);
    const revealProgress = clamp((p - 0.86) / 0.12);
    const exitLock = 1 - filmExit;
    const jitter = Math.sin(p * 165) * rewind * exitLock * (1 - finalZoom) * 1.15;

    return {
      p,
      activeFrame: frameForProgress(p),
      rewind,
      filmOpacity: intro * (1 - clamp((p - 0.72) / 0.06)),
      filmX: 54 - zoomOut * 54 - rewind * 56 + filmExit * 154 + pullForce * 18 + jitter,
      filmY: -2.5 + zoomOut * 1.8,
      filmScale: 3.38 - zoomOut * 1.78 - filmExit * 0.18,
      filmScaleX: 1 + pullForce * 0.11,
      filmFilter: 'blur(' + pullForce * 0.18 + 'px) contrast(' + (1 + pullForce * 0.04) + ') brightness(' + (1 + pullForce * 0.02) + ')',
      filmRotate: 0,
      filmSkew: 0,
      tapeOpacity: Math.min(tapeIn * 3.5, 1),
      tapeX: 100 * (1 - tapeEased),
      tapeScale: 1 + finalZoom * 0.06,
      scanOpacity: 0.16 + rewind * 0.16 + pullTexture * 0.12,
      glitchOpacity: rewind * (1 - finalZoom * 0.75) * 0.22 + pullTexture * 0.68,
      logoScale: 0.96 + finalZoom * 0.08,
      revealProgress,
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
          exit={{ opacity: 0, filter: 'blur(8px)', transition: { duration: 0.62, ease: [0.76, 0, 0.24, 1] } }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] isolate overflow-y-auto overflow-x-hidden bg-[#0a0807] text-neutral-200 overscroll-contain"
          role="status"
          aria-label="GDG FRCRCE rewind loader"
        >
          <div ref={scrollTrackRef} className="relative h-[540vh]">
            <div className="sticky top-0 h-screen overflow-hidden">
              <div className="absolute inset-0 bg-[#080706]" />
              {/* Subtle analog cinema projector beam illuminating the negative space */}
              <div className="loader-projector-beam" />
              <div className="loader-black-grain" />
              <div className="loader-crt-green-wash" />
              {/* Subtle 24fps projector flicker */}
              <div className="loader-projector-flicker" />
              {/* Subtle floating projector dust particles */}
              <div className="loader-floating-dust pointer-events-none absolute inset-0 overflow-hidden z-[4]">
                {Array.from({ length: 16 }).map((_, i) => (
                  <span key={i} className={`loader-dust-mote loader-dust-mote-${i + 1}`} />
                ))}
              </div>
              <div className="preloader-vignette" />
              <div className="preloader-scanlines" style={{ opacity: visual.scanOpacity }} />
              <div className="loader-rewind-smear" style={{ opacity: visual.glitchOpacity }} />

              {/* HUD framing the viewport — fixed opacity so it stays visible when tape slides in */}
              <div
                className="loader-archive-hud pointer-events-none absolute inset-5 sm:inset-8 z-[15] flex flex-col justify-between"
                style={{ opacity: 0.88 }}
              >
                <div className="flex items-center justify-between font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-neutral-400/65">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500/85 animate-pulse" />
                    <span>GDG FRCRCE // &gt;&gt; REWIND</span>
                  </div>
                </div>
                <div className="flex items-center justify-between font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-neutral-400/65">
                  <div className="flex items-center gap-2 pl-11 sm:pl-0">
                    <span className="text-neutral-500">ACTIVE ERA:</span>
                    <span className="text-amber-400/90 font-semibold">{visual.activeFrame}</span>
                  </div>
                  <div className="hidden sm:block text-neutral-400/50">
                    <span>PROJ. SYNC 24FPS</span>
                  </div>
                </div>
              </div>
              <motion.div
                className="absolute left-1/2 top-[47%] w-[min(3340px,282vw)] -translate-x-1/2 -translate-y-1/2 will-change-transform"
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

              {/* ── Bitfalk-style clipped reveal ──
                   Outer: FULL VIEWPORT clip boundary (inset-0 overflow-hidden).
                   Inner: centered tape that slides from off-screen right to center.
                   The tape emerges from the actual right edge of the screen. */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                  className="absolute left-1/2 top-1/2 -translate-y-1/2 will-change-transform pointer-events-auto"
                  style={{
                    width: 'min(1080px, 92vw)',
                    height: '53vw',
                    maxHeight: '574px',
                    x: `calc(-50% + ${visual.tapeX}vw)`,
                    opacity: visual.tapeOpacity,
                    scale: visual.tapeScale,
                  }}
                >
                  <VHSTape reelRotation={visual.p * 1360} logoScale={visual.logoScale} revealProgress={visual.revealProgress} />
                </motion.div>
              </div>

              <div className="absolute bottom-7 left-1/2 h-px w-[min(360px,66vw)] -translate-x-1/2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-neutral-300 shadow-[0_0_18px_rgba(255,255,255,0.45)]" style={{ width: `${visual.p * 100}%` }} />
              </div>

              {/* Retro audio opt-in toggle button — highest z-index layer so clicks are never blocked */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSound();
                }}
                className="absolute top-6 right-6 z-[999999] pointer-events-auto cursor-pointer flex items-center gap-2 rounded-full border border-white/25 bg-black/70 px-4 py-2.5 text-xs font-mono uppercase tracking-wider text-neutral-200 shadow-lg backdrop-blur-md transition hover:border-white hover:bg-white/15 hover:text-white"
              >
                <span>{soundEnabled ? '🔊 SOUND ON' : '🔇 SOUND OFF'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

'use client';

import dynamic from 'next/dynamic';
// Aliased: this module also uses the browser's global `new Image()` for
// preloading, which a bare `Image` import from next/image would shadow.
import NextImage from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ik } from '@/lib/imagekit';
import { HERO_VIDEO_SRC } from '@/lib/media';
import './xp-loader.css';

const FilmTape = dynamic(() => import('../../../models/reactComponent/FilmTape'), {
  ssr: false,
  loading: () => null,
});

interface PreloaderProps {
  onComplete: () => void;
  onStartTransition?: () => void;
}

type FilmFrame = '2020s' | '90s' | '80s' | '70s';

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function frameForProgress(progress: number): FilmFrame {
  if (progress < 0.35) return '2020s';
  if (progress < 0.55) return '90s';
  if (progress < 0.70) return '80s';
  return '70s';
}

/**
 * Infinite Film Tape Centering Math:
 * Total cells = 25 (4 empty lead-in + 17 core + 4 empty lead-out).
 * Width of cells = 100% of tape inner wrapper (left/right inline 0 overrides stylesheet).
 * With flex gaps at 0.6%, each cell consumes 3.424% of tape width, and each gap consumes 0.6%.
 * Exact center fraction of cell N (0-indexed) = N * 4.024% + 1.712%.
 * - Start Frame (Genesis image at Index 4) center fraction = 4 * 0.04024 + 0.01712 = 0.17808 (17.808%).
 * - Reveal Frame (Reveal Window at Index 18) center fraction = 18 * 0.04024 + 0.01712 = 0.74144 (74.144%).
 * When stripX = (0.50 - currentFraction) * 100 (% of strip width):
 * - At p=0 (currentFraction = 0.17808), Genesis sits DEAD CENTER on screen, with 4 empty lead-in cells covering the left edge.
 * - At TRANSLATE_END (currentFraction = 0.74144), Reveal sits DEAD CENTER on screen, with 4 empty lead-out cells covering the right edge!
 */
const fStart = 0.17808;
const fReveal = 0.74144;

// Timeline progress markers (0 -> 1):
// 0.00 -> 0.35: Phase 1 — Initial Pause (Genesis Image dead-centered for 10.0s)
// 0.35 -> 0.75: Phase 2 — Slow, smooth rewind translation from Genesis to Reveal Window (9.0s)
// 0.75 -> 0.88: Phase 3 — HARD STOP & HOLD on Reveal Window dead-centered (1.2s pause beat)
// 0.88 -> 1.00: Phase 4 — Zoom into dead-centered Reveal Window to reveal video (1.6s)
const HOLD_END = 0.35;
const TRANSLATE_END = 0.75;
const HOLD_FRAME21_END = 0.88;
const REVEAL_END = 1.0;

export default function Preloader({ onComplete, onStartTransition }: PreloaderProps) {
  const [completed, setCompleted] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);

  const completedRef = useRef(false);
  const activeFrameRef = useRef<FilmFrame>('2020s');

  // Direct DOM refs — zero React state re-renders during animation ticks
  const filmWrapRef = useRef<HTMLDivElement | null>(null);
  const filmTapeInnerRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const hudEraRef = useRef<HTMLSpanElement | null>(null);
  const bgLayersRef = useRef<HTMLDivElement | null>(null);

  // Preload intro video + all 7 preloader event images
  useEffect(() => {
    let loaded = 0;
    const preloaderImages = [
      ik('/preloader/genesis.jpg'),
      ik('/preloader/unplug.png'),
      ik('/preloader/pitchperf.png'),
      ik('/preloader/bnb.png'),
      ik('/preloader/whatif.png'),
      ik('/preloader/ideacafe1.png'),
      ik('/preloader/futureforge.png'),
    ];
    const totalItems = preloaderImages.length + 1; // +1 for hero video

    // The boot screen's bar is a canned XP marquee, not a real progress read —
    // there is nothing to hand a percentage to. Counting into state anyway
    // re-rendered the whole loader eight times during the heaviest part of
    // startup, so the count stays a local.
    function checkReady() {
      loaded++;
      if (loaded >= totalItems) {
        setTimeout(() => setAssetsReady(true), 1600);
      }
    }

    preloaderImages.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = img.onerror = checkReady;
    });

    // Pull the hero film into cache before the sequence starts. It is one
    // local 1.1 MB file and the film strip's reveal cell plays the SAME url,
    // so this single fetch serves the loader, the zoom-through and the hero.
    const vid = document.createElement('video');
    vid.src = HERO_VIDEO_SRC;
    vid.preload = 'auto';
    vid.muted = true;
    vid.onloadeddata = vid.oncanplay = checkReady;
    vid.onerror = checkReady;
    vid.load();
  }, []);

  const onStartTransitionRef = useRef(onStartTransition);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onStartTransitionRef.current = onStartTransition;
    onCompleteRef.current = onComplete;
  }, [onStartTransition, onComplete]);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    // SKIP short-circuits the loader, not the film. Waking the hero here means
    // the video is always playing by the time the loader is off screen — and
    // therefore that there is always a real last frame for the iris to close
    // over, instead of a black rectangle irising into a black screen.
    onStartTransitionRef.current?.();
    setCompleted(true);
    window.scrollTo(0, 0);
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    if (!assetsReady) return;
    document.body.style.overflow = 'hidden';

    const animObj = { val: 0 };
    let heroWoken = false;

    const tl = gsap.timeline({
      onUpdate: () => {
        const p = clamp(animObj.val);
        applyFrame(p);
      },
      onComplete: () => {
        window.setTimeout(complete, 120);
      },
    });

    // 1. Initial pause (Genesis image dead-centered in viewport) for 0.8s
    tl.to(animObj, {
      val: HOLD_END,
      duration: 0.8,
      ease: 'none',
    });

    // 2. Smooth rewind translation from Genesis to Reveal Window over 5.0s
    tl.to(animObj, {
      val: TRANSLATE_END,
      duration: 5.0,
      ease: 'power1.inOut',
    });

    // 3. HARD STOP & HOLD on the Reveal Window dead-centered for 1.5s
    tl.to(animObj, {
      val: HOLD_FRAME21_END,
      duration: 1.5,
      ease: 'none',
    });

    // 4. Zoom dead-centered Reveal Window outwards over 0.7s to reveal hero video
    tl.to(animObj, {
      val: REVEAL_END,
      duration: 0.7,
      ease: 'power2.inOut',
    });

    function applyFrame(p: number) {
      const era = frameForProgress(p);
      if (era !== activeFrameRef.current) {
        activeFrameRef.current = era;
        if (hudEraRef.current) hudEraRef.current.textContent = era;
      }

      const rewind = clamp((p - 0.1) / 0.7);

      // Phase A (0 -> TRANSLATE_END): Slide strip from Genesis (Index 10) to Reveal Window (Index 26)
      // Clamped to 1.0 at TRANSLATE_END so translation HARD STOPS cleanly on the Reveal Window
      const slideP = clamp((p - HOLD_END) / (TRANSLATE_END - HOLD_END));
      const currentFraction = fStart + slideP * (fReveal - fStart);
      const stripX = (0.50 - currentFraction) * 100; // translateX in % of strip width

      // Phase B (HOLD_FRAME21_END -> REVEAL_END): Zoom dead-centered Reveal Window outwards into full screen
      const zoomP = clamp((p - HOLD_FRAME21_END) / (REVEAL_END - HOLD_FRAME21_END));
      const easedZoom = zoomP * zoomP * (3 - 2 * zoomP);
      const zoomScale = 1 + easedZoom * 18;

      if (filmTapeInnerRef.current) {
        filmTapeInnerRef.current.style.transform = `translate3d(${stripX}%, 0, 0)`;
        filmTapeInnerRef.current.style.setProperty('--rewind', String(rewind));
      }

      if (filmWrapRef.current) {
        filmWrapRef.current.style.transform = `translate3d(-50%, -50%, 0) scale(${zoomScale})`;
        filmWrapRef.current.style.opacity = String(1 - clamp(easedZoom / 0.45));
      }

      if (bgLayersRef.current) {
        bgLayersRef.current.style.opacity = String(1 - clamp(easedZoom / 0.45));
      }

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${p * 100}%`;
      }



      if (!heroWoken && p > TRANSLATE_END) {
        heroWoken = true;
        onStartTransitionRef.current?.();
      }
    }

    return () => {
      tl.kill();
      document.body.style.overflow = '';
    };
  }, [assetsReady, complete]);

  return (
    <AnimatePresence>
      {!completed && (
        <motion.div
          key="rewind-preloader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeOut' } }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] isolate overflow-hidden text-neutral-200"
          role="status"
          aria-label="GDG FRCRCE rewind loader"
        >
          <AnimatePresence>
            {!assetsReady && (
              <motion.div
                key="xp-asset-buffer-loader"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeInOut' } }}
                className="xp-boot-screen"
              >
                <div className="xp-center-content">
                  {/* GDSC Logo */}
                  <div className="xp-logo-container">
                    <NextImage src="/logo.png" className="xp-logo-image" alt="GDG CRCE Logo" width={612} height={408} sizes="140px" priority draggable={false} />
                  </div>

                  {/* Typography */}
                  <div className="xp-brand">
                    <span className="xp-title">Sunékheia</span>
                    <span className="xp-subtitle">xp</span>
                  </div>
                  <div className="xp-role">GDG CRCE</div>

                  {/* Blue Sliding Loading Bar */}
                  <div className="xp-loading-bar-container">
                    <div className="xp-loading-bar">
                      <div className="xp-loading-segment" />
                      <div className="xp-loading-segment" />
                      <div className="xp-loading-segment" />
                    </div>
                  </div>
                </div>

                <div className="xp-bottom-text">
                  For the best experience<br />
                  Enter Full Screen (F11)
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative h-screen w-full">
            <div ref={bgLayersRef}>
              <div className="absolute inset-0 bg-[#080706]" />
              <div className="loader-projector-beam" />
              <div className="loader-crt-green-wash" />
              <div className="preloader-vignette" />
              <div className="preloader-scanlines" style={{ opacity: 0.2 }} />
            </div>

            <div
              className="loader-archive-hud pointer-events-none absolute inset-5 sm:inset-8 z-[15] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-neutral-400/65">
                <div className="flex items-center gap-2.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500/85 animate-pulse" />
                  <span>GDG FRCRCE // &gt;&gt; REWIND ARCHIVE</span>
                </div>
              </div>
              <div className="flex items-center justify-between font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-neutral-400/65">
                <div className="flex items-center gap-2 pl-11 sm:pl-0">
                  <span className="text-neutral-500">ACTIVE ERA:</span>
                  <span ref={hudEraRef} className="text-amber-400/90 font-semibold">2020s</span>
                </div>
              </div>
            </div>

            {/* Infinite film strip container — vertically prominent at 50% top with 500vw width for exactly 5 visible cells on screen */}
            <div
              ref={filmWrapRef}
              className="absolute left-1/2 pointer-events-none flex items-center justify-center"
              style={{
                top: '50%',
                width: 'max(4000px, 500vw)',
                height: 'clamp(180px, 18vw, 350px)',
                transformOrigin: '50% 50%',
                transform: 'translate3d(-50%, -50%, 0) scale(1)',
                willChange: 'transform, opacity',
              }}
            >
              <div
                ref={filmTapeInnerRef}
                className="w-full h-full"
                style={{
                  willChange: 'transform',
                  transform: `translate3d(${(0.50 - fStart) * 100}%, 0, 0)`,
                }}
              >
                <FilmTape />
              </div>
            </div>

            <div className="absolute bottom-7 left-1/2 h-px w-[min(360px,66vw)] -translate-x-1/2 overflow-hidden rounded-full bg-white/10">
              <div ref={progressBarRef} className="h-full rounded-full bg-neutral-300 shadow-[0_0_18px_rgba(255,255,255,0.45)]" style={{ width: '0%' }} />
            </div>

            <div className="absolute top-6 right-6 z-[999999] pointer-events-auto flex items-center gap-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  complete();
                }}
                className="cursor-pointer flex items-center gap-2 rounded-full border border-amber-400/35 bg-black/70 px-4 py-2.5 text-xs font-mono uppercase tracking-wider text-amber-300/90 shadow-lg backdrop-blur-md transition hover:border-amber-400 hover:bg-amber-400/20 hover:text-white"
              >
                <span>SKIP &gt;&gt;</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


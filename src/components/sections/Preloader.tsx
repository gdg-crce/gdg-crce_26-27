'use client';

import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './xp-loader.css';

const FilmTape = dynamic(() => import('../../../models/reactComponent/FilmTape'), {
  ssr: false,
  loading: () => null,
});

import { REVEAL_FRAME_INDEX, START_FRAME_INDEX, TOTAL_FRAME_COUNT } from '../../../models/reactComponent/FilmTape';

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
 * - Reveal Frame (Reveal Window at Index 14) center fraction = 14 * 0.04024 + 0.01712 = 0.58048 (58.048%).
 * When stripX = (0.50 - currentFraction) * 100 (% of strip width):
 * - At p=0 (currentFraction = 0.17808), Genesis sits DEAD CENTER on screen, with 4 empty lead-in cells covering the left edge.
 * - At TRANSLATE_END (currentFraction = 0.58048), Reveal sits DEAD CENTER on screen, with 4 empty lead-out cells covering the right edge!
 */
const fStart = 0.17808;
const fReveal = 0.58048;

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
  const [bufferProgress, setBufferProgress] = useState(0);

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
      '/preloader/genesis.jpg',
      '/preloader/unplug.png',
      '/preloader/pitchperf.png',
      '/preloader/bnb.png',
      '/preloader/whatif.png',
      '/preloader/ideacafe1.png',
      '/preloader/futureforge.png',
    ];
    const totalItems = preloaderImages.length + 1; // +1 for hero video

    function checkReady() {
      loaded++;
      const pct = Math.min(100, Math.floor((loaded / totalItems) * 100));
      setBufferProgress(pct);
      if (loaded >= totalItems) {
        setTimeout(() => setAssetsReady(true), 100);
      }
    }

    preloaderImages.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = img.onerror = checkReady;
    });

    const vid = document.createElement('video');
    vid.src = '/videos/intro.mp4';
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

    // 1. Initial 2.0s pause on Genesis image dead-centered in viewport
    tl.to(animObj, {
      val: HOLD_END,
      duration: 2.0,
      ease: 'none',
    });

    // 2. Slow, smooth rewind translation from Genesis (Index 10) to Reveal Window (Index 20) over 9.0s
    tl.to(animObj, {
      val: TRANSLATE_END,
      duration: 9.0,
      ease: 'power1.inOut',
    });

    // 3. HARD STOP & HOLD on the Reveal Window dead-centered for 3.0s
    tl.to(animObj, {
      val: HOLD_FRAME21_END,
      duration: 3.0,
      ease: 'none',
    });

    // 4. Zoom dead-centered Reveal Window outwards over 1.6s to reveal hero video
    tl.to(animObj, {
      val: REVEAL_END,
      duration: 1.6,
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
        if (zoomScale > 1.001) {
          filmWrapRef.current.style.transform = `translate3d(-50%, -50%, 0) scale(${zoomScale})`;
        } else {
          filmWrapRef.current.style.transform = '';
        }
        filmWrapRef.current.style.opacity = String(1 - clamp((easedZoom - 0.2) / 0.8));
      }

      if (bgLayersRef.current) {
        bgLayersRef.current.style.opacity = String(1 - easedZoom);
      }

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${p * 100}%`;
      }

      const debugEl = document.getElementById('preloader-debug');
      if (debugEl) {
        const wrapW = filmWrapRef.current ? filmWrapRef.current.clientWidth : 0;
        const innerW = filmTapeInnerRef.current ? filmTapeInnerRef.current.clientWidth : 0;
        const transformStr = filmTapeInnerRef.current ? filmTapeInnerRef.current.style.transform : '';
        debugEl.textContent = `P:${p.toFixed(3)} | SX:${stripX.toFixed(1)}% | T:${transformStr} | wW:${wrapW}px | wI:${innerW}px | FS:${fStart.toFixed(3)} | FR:${fReveal.toFixed(3)}`;
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" className="xp-logo-image" alt="GDG CRCE Logo" draggable={false} />
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
              <div className="loader-projector-flicker" />
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
                <div id="preloader-debug" className="text-amber-500/90 font-semibold" style={{ marginLeft: '12px' }} />
              </div>
            </div>

            {/* Infinite film strip container — vertically prominent at 62% top with 500vw width for exactly 5 visible cells on screen */}
            <div
              ref={filmWrapRef}
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 will-change-transform pointer-events-none flex items-center justify-center"
              style={{
                top: '62%',
                width: 'max(4000px, 500vw)',
                height: 'clamp(180px, 18vw, 350px)',
                transformOrigin: '50% 50%',
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


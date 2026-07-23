'use client';

import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './xp-loader.css';

const FilmTape = dynamic(() => import('../../../models/reactComponent/FilmTape'), {
  ssr: false,
  loading: () => null,
});

const VHSTape = dynamic(() => import('../../../models/reactComponent/VHSTape'), {
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

// Desktop timeline uses 0.26, 0.46, 0.64 thresholds
function frameForProgressDesktop(progress: number): FilmFrame {
  if (progress < 0.26) return '2020s';
  if (progress < 0.46) return '90s';
  if (progress < 0.64) return '80s';
  return '70s';
}

// Mobile timeline uses 0.35, 0.55, 0.70 thresholds
function frameForProgressMobile(progress: number): FilmFrame {
  if (progress < 0.35) return '2020s';
  if (progress < 0.55) return '90s';
  if (progress < 0.70) return '80s';
  return '70s';
}

const fStart = 0.17808;
const fReveal = 0.74144;

const HOLD_END = 0.35;
const TRANSLATE_END = 0.75;
const HOLD_FRAME21_END = 0.88;
const REVEAL_END = 1.0;

export default function Preloader({ onComplete, onStartTransition }: PreloaderProps) {
  const [progress, setProgress] = useState(0); // Desktop progress
  const [completed, setCompleted] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [bufferProgress, setBufferProgress] = useState(0);

  const completedRef = useRef(false);
  const autoPlayingRef = useRef(false);
  
  // Desktop refs
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollTrackRef = useRef<HTMLDivElement | null>(null);
  const prevProgressRef = useRef(0);
  const zoomThroughRef = useRef(0);

  // Mobile refs
  const activeFrameRef = useRef<FilmFrame>('2020s');
  const filmWrapRef = useRef<HTMLDivElement | null>(null);
  const filmTapeInnerRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const hudEraRef = useRef<HTMLSpanElement | null>(null);
  const bgLayersRef = useRef<HTMLDivElement | null>(null);

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
        setTimeout(() => setAssetsReady(true), 250);
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
    onStartTransitionRef.current?.();
    window.setTimeout(() => {
      window.scrollTo(0, 0);
      onCompleteRef.current?.();
    }, 450);
  }, []);

  useEffect(() => {
    if (!assetsReady) return;
    document.body.style.overflow = 'hidden';

    let mm = gsap.matchMedia();

    // Desktop Timeline
    mm.add("(min-width: 768px)", () => {
      const animObj = { val: 0 };
      const tl = gsap.timeline({
        onUpdate: () => {
          const p = clamp(animObj.val);
          zoomThroughRef.current = clamp((p - 0.80) / 0.20);
          setProgress(p);
        },
        onComplete: () => {
          complete();
        },
      });

      tl.to(animObj, {
        val: 0.60,
        duration: 2.7,
        ease: 'power1.inOut',
      });

      tl.to(animObj, {
        val: 0.80,
        duration: 1.25,
        ease: 'power1.inOut',
        onComplete: () => {
          window.scrollTo(0, 0);
          onStartTransitionRef.current?.();
        },
      });

      tl.to(animObj, {
        val: 1.0,
        duration: 1.6,
        ease: 'power2.inOut',
      });

      return () => tl.kill();
    });

    // Mobile Timeline
    mm.add("(max-width: 767px)", () => {
      const animObj = { val: 0 };
      let heroWoken = false;

      function applyFrame(p: number) {
        const era = frameForProgressMobile(p);
        if (era !== activeFrameRef.current) {
          activeFrameRef.current = era;
          if (hudEraRef.current) hudEraRef.current.textContent = era;
        }

        const rewind = clamp((p - 0.1) / 0.7);
        const slideP = clamp((p - HOLD_END) / (TRANSLATE_END - HOLD_END));
        const currentFraction = fStart + slideP * (fReveal - fStart);
        const stripX = (0.50 - currentFraction) * 100;

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

        const debugEl = document.getElementById('preloader-debug-mobile');
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

      const tl = gsap.timeline({
        onUpdate: () => {
          const p = clamp(animObj.val);
          applyFrame(p);
        },
        onComplete: () => {
          window.setTimeout(complete, 120);
        },
      });

      tl.to(animObj, { val: HOLD_END, duration: 2.0, ease: 'none' });
      tl.to(animObj, { val: TRANSLATE_END, duration: 9.0, ease: 'power1.inOut' });
      tl.to(animObj, { val: HOLD_FRAME21_END, duration: 3.0, ease: 'none' });
      tl.to(animObj, { val: REVEAL_END, duration: 1.6, ease: 'power2.inOut' });

      return () => tl.kill();
    });

    return () => {
      mm.revert();
      document.body.style.overflow = '';
    };
  }, [assetsReady, complete]);

  // Desktop visual calculations
  const visual = useMemo(() => {
    const p = clamp(progress);
    const intro = clamp(p / 0.1);
    const zoomOut = clamp((p - 0.08) / 0.36);
    const rewind = clamp((p - 0.18) / 0.56);
    const filmExit = clamp((p - 0.60) / 0.12);
    const pullForce = clamp((p - 0.61) / 0.11) * (1 - clamp((p - 0.84) / 0.08));
    const pullTexture = clamp((p - 0.62) / 0.08) * (1 - clamp((p - 0.82) / 0.07)) * 0.22;

    const tapeIn = clamp((p - 0.60) / 0.20);
    const tapeEased = 3 * tapeIn * tapeIn - 2 * tapeIn * tapeIn * tapeIn;

    const zoomThrough = clamp((p - 0.80) / 0.20);
    const tapeOpacity = clamp(tapeIn * 3.5, 0, 1) * (1 - clamp((zoomThrough - 0.65) / 0.33));
    const bgOpacity = 1 - clamp((zoomThrough - 0.15) / 0.70);

    const revealProgress = clamp((p - 0.86) / 0.12);
    const exitLock = 1 - filmExit;
    const jitter = Math.sin(p * 165) * rewind * exitLock * (1 - zoomThrough) * 1.15;

    const filmOpacity = intro * (1 - clamp((p - 0.58) / 0.09));
    const showFilmTape = p < 0.68;

    return {
      p,
      activeFrame: frameForProgressDesktop(p),
      rewind,
      showFilmTape,
      filmOpacity,
      filmX: 54 - zoomOut * 54 - rewind * 56 + filmExit * 154 + pullForce * 18 + jitter,
      filmY: -2.5 + zoomOut * 1.8,
      filmScale: 3.38 - zoomOut * 1.78 - filmExit * 0.18,
      filmScaleX: 1 + pullForce * 0.11,
      filmFilter: 'blur(' + pullForce * 0.18 + 'px) contrast(' + (1 + pullForce * 0.04) + ') brightness(' + (1 + pullForce * 0.02) + ')',
      tapeOpacity,
      tapeX: 100 * (1 - tapeEased),
      zoomThrough,
      scanOpacity: (0.16 + rewind * 0.16 + pullTexture * 0.12) * bgOpacity,
      glitchOpacity: (rewind * (1 - zoomThrough * 0.75) * 0.22 + pullTexture * 0.68) * bgOpacity,
      logoScale: 0.96 + zoomThrough * 0.12,
      revealProgress,
      pullTexture,
      bgOpacity,
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
          exit={{ opacity: 0, transition: { duration: 0.45, ease: 'easeOut' } }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] isolate overflow-hidden text-neutral-200"
          role="status"
          aria-label="GDG FRCRCE rewind loader"
        >
          {/* ASSET PRE-BUFFERING LOADER SCREEN */}
          <AnimatePresence>
            {!assetsReady && (
              <motion.div
                key="asset-buffer-loader"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeInOut' } }}
                className="absolute inset-0 z-[100000]"
              >
                {/* Desktop Pre-buffer */}
                <div className="hidden md:flex absolute inset-0 flex-col items-center justify-center bg-[#080706] text-neutral-200 p-6 select-none">
                  <div className="loader-crt-green-wash" />
                  <div className="preloader-scanlines opacity-40" />

                  <div className="relative z-10 w-full max-w-md space-y-6 text-center font-mono">
                    <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-[0.3em] text-amber-400/90 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      <span>GDG FRCRCE ARCHIVE SYSTEM</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs sm:text-sm tracking-widest text-neutral-300">
                        SYNCING 35MM REEL &amp; PRE-BUFFERING CINEMA STREAM...
                      </div>
                      <div className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                        {Math.floor(bufferProgress)}%
                      </div>
                    </div>

                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                        style={{ width: `${bufferProgress}%` }}
                        transition={{ ease: 'linear' }}
                      />
                    </div>

                    <div className="flex flex-col gap-1 text-[9px] sm:text-[11px] text-neutral-400/75 tracking-wider">
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span>35MM CELL CONTINUITY</span>
                        <span className="text-emerald-400">[ READY ]</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span>VHS GLTF CASSETTE</span>
                        <span className="text-emerald-400">[ READY ]</span>
                      </div>
                      <div className="flex justify-between">
                        <span>VIDEO BUFFER (10s LOCK)</span>
                        <span className={bufferProgress > 60 ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}>
                          {bufferProgress > 60 ? '[ STREAMING ]' : '[ SYNCING ]'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Pre-buffer */}
                <div className="flex md:hidden absolute inset-0 xp-boot-screen">
                  <div className="xp-center-content">
                    <div className="xp-logo-container">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo.png" className="xp-logo-image" alt="GDG CRCE Logo" draggable={false} />
                    </div>

                    <div className="xp-brand">
                      <span className="xp-title">Sunékheia</span>
                      <span className="xp-subtitle">xp</span>
                    </div>
                    <div className="xp-role">GDG CRCE</div>

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
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* =========================================================================
              DESKTOP MAIN LOADER (visible on md and up)
              ========================================================================= */}
          <div ref={scrollTrackRef} className="hidden md:block relative h-[100dvh] md:h-screen w-full">
            <div className="absolute inset-0 bg-[#080706]" style={{ opacity: visual.bgOpacity }} />
            <div className="loader-projector-beam" style={{ opacity: visual.bgOpacity }} />
            <div className="loader-crt-green-wash" style={{ opacity: visual.bgOpacity }} />
            <div className="loader-projector-flicker" style={{ opacity: visual.bgOpacity }} />
            <div className="loader-floating-dust pointer-events-none absolute inset-0 overflow-hidden z-[4]" style={{ opacity: visual.bgOpacity }}>
              {Array.from({ length: 16 }).map((_, i) => (
                <span key={i} className={`loader-dust-mote loader-dust-mote-${i + 1}`} />
              ))}
            </div>
            <div className="preloader-vignette" style={{ opacity: visual.bgOpacity }} />
            <div className="preloader-scanlines" style={{ opacity: visual.scanOpacity }} />
            <div className="loader-rewind-smear" style={{ opacity: visual.glitchOpacity }} />

            <div
              className="loader-archive-hud pointer-events-none absolute inset-5 sm:inset-8 z-[15] flex flex-col justify-between"
              style={{ 
                opacity: 0.88 * visual.bgOpacity,
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)'
              }}
            >
              <div className="flex items-center justify-between font-mono text-[9px] sm:text-xs uppercase tracking-wider sm:tracking-[0.25em] text-neutral-400/65">
                <div className="flex items-center gap-2.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500/85 animate-pulse" />
                  <span>GDG FRCRCE // &gt;&gt; REWIND ARCHIVE</span>
                </div>
              </div>
              <div className="flex items-center justify-between font-mono text-[9px] sm:text-xs uppercase tracking-wider sm:tracking-[0.25em] text-neutral-400/65">
                <div className="flex items-center gap-2 pl-11 sm:pl-0">
                  <span className="text-neutral-500">ACTIVE ERA:</span>
                  <span className="text-amber-400/90 font-semibold">{visual.activeFrame}</span>
                </div>
                <div className="hidden sm:block text-neutral-400/50">
                  <span>CINEMA STREAM 24FPS</span>
                </div>
              </div>
            </div>

            {visual.showFilmTape && (
              <motion.div
                className="absolute left-1/2 top-[47%] w-[min(3340px,400vw)] md:w-[min(3340px,282vw)] -translate-x-1/2 -translate-y-1/2 will-change-transform"
                style={{
                  x: `${visual.filmX}%`,
                  y: `${visual.filmY}vh`,
                  scale: visual.filmScale,
                  scaleX: visual.filmScaleX,
                  opacity: visual.filmOpacity,
                  transformOrigin: '50% 50%',
                  filter: visual.filmFilter,
                }}
              >
                <FilmTape activeFrame={visual.activeFrame} rewindIntensity={visual.rewind} />
              </motion.div>
            )}

            <div className="absolute inset-0 pointer-events-none">
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-y-1/2 will-change-transform pointer-events-auto"
                style={{
                  width: 'min(1080px, 92vw)',
                  height: '53vw',
                  maxHeight: '574px',
                  x: `calc(-50% + ${visual.tapeX}vw)`,
                  opacity: visual.tapeOpacity,
                }}
              >
                <VHSTape
                  reelRotation={visual.p * 1360}
                  logoScale={visual.logoScale}
                  revealProgress={visual.revealProgress}
                  zoomThroughRef={zoomThroughRef}
                />
              </motion.div>
            </div>

            <div className="absolute bottom-7 left-1/2 h-px w-[min(360px,66vw)] -translate-x-1/2 overflow-hidden rounded-full bg-white/10" style={{ opacity: visual.bgOpacity }}>
              <div className="h-full rounded-full bg-neutral-300 shadow-[0_0_18px_rgba(255,255,255,0.45)]" style={{ width: `${visual.p * 100}%` }} />
            </div>

            <div 
              className="absolute z-[999999] pointer-events-auto flex items-center gap-2.5"
              style={{ 
                top: 'max(1.5rem, env(safe-area-inset-top))', 
                right: 'max(1.5rem, env(safe-area-inset-right))' 
              }}
            >
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

          {/* =========================================================================
              MOBILE MAIN LOADER (visible on below md)
              ========================================================================= */}
          <div className="block md:hidden relative h-[100dvh] md:h-screen w-full">
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
              style={{ 
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)'
              }}
            >
              <div className="flex items-center justify-between font-mono text-[9px] sm:text-xs uppercase tracking-wider sm:tracking-[0.25em] text-neutral-400/65">
                <div className="flex items-center gap-2.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500/85 animate-pulse" />
                  <span>GDG FRCRCE // &gt;&gt; REWIND ARCHIVE</span>
                </div>
              </div>
              <div className="flex items-center justify-between font-mono text-[9px] sm:text-xs uppercase tracking-wider sm:tracking-[0.25em] text-neutral-400/65">
                <div className="flex items-center gap-2 pl-11 sm:pl-0">
                  <span className="text-neutral-500">ACTIVE ERA:</span>
                  <span ref={hudEraRef} className="text-amber-400/90 font-semibold">2020s</span>
                </div>
                <div id="preloader-debug-mobile" className="text-amber-500/90 font-semibold" style={{ marginLeft: '12px' }} />
              </div>
            </div>

            <div
              ref={filmWrapRef}
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 will-change-transform pointer-events-none flex items-center justify-center"
              style={{
                top: '50%',
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

            <div 
              className="absolute z-[999999] pointer-events-auto flex items-center gap-2.5"
              style={{ 
                top: 'max(1.5rem, env(safe-area-inset-top))', 
                right: 'max(1.5rem, env(safe-area-inset-right))' 
              }}
            >
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

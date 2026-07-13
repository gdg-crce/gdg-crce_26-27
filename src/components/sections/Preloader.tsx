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
  onStartTransition?: () => void;
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

export default function Preloader({ onComplete, onStartTransition }: PreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [bufferProgress, setBufferProgress] = useState(0);

  const completedRef = useRef(false);
  const autoPlayingRef = useRef(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollTrackRef = useRef<HTMLDivElement | null>(null);
  const prevProgressRef = useRef(0);
  // Ref updated every GSAP tick — lets VHSTape's useFrame read latest value without React render lag
  const zoomThroughRef = useRef(0);

  // Pre-buffer 3D models & intro video so scrolling and video transitions are 100% smooth
  useEffect(() => {
    let current = 0;
    let videoReady = false;

    const vid = document.createElement('video');
    vid.src = '/videos/intro.mp4';
    vid.preload = 'auto';
    vid.muted = true;
    vid.onloadeddata = () => { videoReady = true; };
    vid.oncanplay = () => { videoReady = true; };
    vid.load();

    const interval = setInterval(() => {
      current += videoReady ? 16 : 6;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setTimeout(() => setAssetsReady(true), 250);
      }
      setBufferProgress(current);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const onStartTransitionRef = useRef(onStartTransition);
  onStartTransitionRef.current = onStartTransition;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setCompleted(true);
    window.scrollTo(0, 0);
    onStartTransitionRef.current?.();
    window.setTimeout(() => {
      window.scrollTo(0, 0);
      onCompleteRef.current();
    }, 450);
  }, []);

  useEffect(() => {
    if (!assetsReady) return;

    document.body.style.overflow = 'hidden';

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

    // Phase 1: Film Tape rolls smoothly through the decades (2020s -> 90s -> 80s -> 70s)
    tl.to(animObj, {
      val: 0.60,
      duration: 2.7,
      ease: 'power1.inOut',
    });

    // Phase 2: Film Tape slides out, VHS Cassette glides smoothly into center
    tl.to(animObj, {
      val: 0.80,
      duration: 1.25,
      ease: 'power1.inOut',
      onComplete: () => {
        window.scrollTo(0, 0);
        onStartTransitionRef.current?.(); // Wakes up hero video early for seamless 0-gap handoff
      },
    });

    // Phase 3: Cinematic Zoom-Through straight into the center of the VHS cassette
    tl.to(animObj, {
      val: 1.0,
      duration: 1.6,
      ease: 'power2.inOut',
    });

    return () => {
      tl.kill();
    };
  }, [assetsReady, complete]);

  const visual = useMemo(() => {
    const p = clamp(progress);
    const intro = clamp(p / 0.1);
    const zoomOut = clamp((p - 0.08) / 0.36);
    const rewind = clamp((p - 0.18) / 0.56);
    const filmExit = clamp((p - 0.60) / 0.12);
    const pullForce = clamp((p - 0.61) / 0.11) * (1 - clamp((p - 0.84) / 0.08));
    const pullTexture = clamp((p - 0.62) / 0.08) * (1 - clamp((p - 0.82) / 0.07)) * 0.22;

    // Tape slides in smoothly between p=0.60 and p=0.80
    const tapeIn = clamp((p - 0.60) / 0.20);
    const tapeEased = 3 * tapeIn * tapeIn - 2 * tapeIn * tapeIn * tapeIn;

    // Phase 3: p=0.80→1.0 — 3D camera drives the zoom, no CSS scale (canvas scaling = pixelated)
    const zoomThrough = clamp((p - 0.80) / 0.20);

    // VHS tape stays fully opaque until zoomThrough=0.65, then fades cleanly
    const tapeOpacity = clamp(tapeIn * 3.5, 0, 1) * (1 - clamp((zoomThrough - 0.65) / 0.33));

    // Background starts fading at zoomThrough=0.15 → fully transparent at zoomThrough=0.85
    // This reveals the video that's already playing behind the preloader
    const bgOpacity = 1 - clamp((zoomThrough - 0.15) / 0.70);

    const revealProgress = clamp((p - 0.86) / 0.12);
    const exitLock = 1 - filmExit;
    const jitter = Math.sin(p * 165) * rewind * exitLock * (1 - zoomThrough) * 1.15;

    const filmOpacity = intro * (1 - clamp((p - 0.58) / 0.09));
    const showFilmTape = p < 0.68;

    return {
      p,
      activeFrame: frameForProgress(p),
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
                className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-[#080706] text-neutral-200 p-6 select-none"
              >
                <div className="loader-crt-green-wash" />
                <div className="preloader-scanlines opacity-40" />

                <div className="relative z-10 w-full max-w-md space-y-6 text-center font-mono">
                  <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-amber-400/90 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span>GDG FRCRCE ARCHIVE SYSTEM</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-sm tracking-widest text-neutral-300">
                      SYNCING 35MM REEL &amp; PRE-BUFFERING CINEMA STREAM...
                    </div>
                    <div className="text-2xl font-bold tracking-tight text-white">
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

                  <div className="flex flex-col gap-1 text-[11px] text-neutral-400/75 tracking-wider">
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
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={scrollTrackRef} className="relative h-screen w-full">
            {/* Background layers — individually faded via bgOpacity so z-indices stay intact */}
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
              style={{ opacity: 0.88 * visual.bgOpacity }}
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
                  <span className="text-amber-400/90 font-semibold">{visual.activeFrame}</span>
                </div>
                <div className="hidden sm:block text-neutral-400/50">
                  <span>CINEMA STREAM 24FPS</span>
                </div>
              </div>
            </div>

            {visual.showFilmTape && (
              <motion.div
                className="absolute left-1/2 top-[47%] w-[min(3340px,282vw)] -translate-x-1/2 -translate-y-1/2 will-change-transform"
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

            {/* No overflow-hidden here — zoom is 3D camera-driven, no CSS scale needed */}
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

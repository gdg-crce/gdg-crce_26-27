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

  const { soundEnabled, toggleSound, stopAllAudio, updateVelocity, playInsertClick } = usePreloaderAudio();

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

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setCompleted(true);
    stopAllAudio();
    window.scrollTo(0, 0);
    onStartTransition?.();
    window.setTimeout(() => {
      window.scrollTo(0, 0);
      onComplete();
    }, 450);
  }, [onComplete, onStartTransition, stopAllAudio]);

  useEffect(() => {
    if (!assetsReady) return;
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
        if (autoPlayingRef.current) return;
        const next = clamp(self.progress);
        setProgress(next);

        // Scrub mechanical rewind audio velocity
        updateVelocity(self.getVelocity() / 1500);

        // When VHS tape reaches center (progress >= 0.80), stop listening to user scroll
        // and automatically animate the zoom-in through center of logo + fade-out from our end.
        if (next >= 0.80 && !autoPlayingRef.current) {
          autoPlayingRef.current = true;
          playInsertClick();
          window.scrollTo(0, 0);
          onStartTransition?.(); // Immediately wake up and play HeroVideo underneath so there is 0 gap!
          try {
            trigger.disable();
          } catch {}

          const animObj = { val: next };
          gsap.to(animObj, {
            val: 1.0,
            duration: 2.4, // Slow, elegant, cinematic zoom-in
            ease: 'power2.inOut',
            onUpdate: () => {
              setProgress(clamp(animObj.val));
            },
            onComplete: () => {
              complete();
            },
          });
        }
      },
    });

    requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      trigger.kill();
      stopAllAudio();
    };
  }, [assetsReady, complete, stopAllAudio, updateVelocity, playInsertClick, onStartTransition]);

  const visual = useMemo(() => {
    const p = clamp(progress);
    const intro = clamp(p / 0.1);
    const zoomOut = clamp((p - 0.08) / 0.36);
    const rewind = clamp((p - 0.18) / 0.56);
    const filmExit = clamp((p - 0.60) / 0.12);
    const pullForce = clamp((p - 0.61) / 0.11) * (1 - clamp((p - 0.84) / 0.08));
    const pullTexture = clamp((p - 0.62) / 0.08) * (1 - clamp((p - 0.82) / 0.07)) * 0.22;

    // Tape slides in smoothly and naturally between p=0.60 and p=0.80
    const tapeIn = clamp((p - 0.60) / 0.20);
    const tapeEased = 3 * tapeIn * tapeIn - 2 * tapeIn * tapeIn * tapeIn;

    // From p=0.80 to p=1.0, camera zooms slowly and elegantly through center of logo
    const zoomThrough = clamp((p - 0.80) / 0.20);
    const tapeScale = 1 + Math.pow(zoomThrough, 2.5) * 44;
    // Soft fade-out on VHS tape and background revealing the video already playing behind it
    const tapeOpacity = clamp(tapeIn * 3.5, 0, 1) * (1 - clamp((zoomThrough - 0.55) / 0.42));
    const bgOpacity = 1 - clamp((zoomThrough - 0.40) / 0.58);

    const revealProgress = clamp((p - 0.86) / 0.12);
    const exitLock = 1 - filmExit;
    const jitter = Math.sin(p * 165) * rewind * exitLock * (1 - zoomThrough) * 1.15;

    // Soft fade-out on FilmTape so it hands off cleanly without choppy overlap
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
      filmRotate: 0,
      filmSkew: 0,
      tapeOpacity,
      tapeX: 100 * (1 - tapeEased),
      tapeScale,
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
          className="fixed inset-0 z-[9999] isolate overflow-y-auto overflow-x-hidden bg-[#0a0807] text-neutral-200 overscroll-contain"
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
                <div className="loader-black-grain" />
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

          <div ref={scrollTrackRef} className="relative h-[540vh]">
            <div className="sticky top-0 h-screen overflow-hidden">
              <div className="absolute inset-0 bg-[#080706]" style={{ opacity: visual.bgOpacity }} />
              <div className="loader-projector-beam" />
              <div className="loader-black-grain" />
              <div className="loader-crt-green-wash" />
              <div className="loader-projector-flicker" />
              <div className="loader-floating-dust pointer-events-none absolute inset-0 overflow-hidden z-[4]" style={{ opacity: visual.bgOpacity }}>
                {Array.from({ length: 16 }).map((_, i) => (
                  <span key={i} className={`loader-dust-mote loader-dust-mote-${i + 1}`} />
                ))}
              </div>
              <div className="preloader-vignette" />
              <div className="preloader-scanlines" style={{ opacity: visual.scanOpacity }} />
              <div className="loader-rewind-smear" style={{ opacity: visual.glitchOpacity }} />

              <div
                className="loader-archive-hud pointer-events-none absolute inset-5 sm:inset-8 z-[15] flex flex-col justify-between"
                style={{ opacity: 0.88 * visual.bgOpacity }}
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

              {visual.showFilmTape && (
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
              )}

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
                  <VHSTape
                    reelRotation={visual.p * 1360}
                    logoScale={visual.logoScale}
                    revealProgress={visual.revealProgress}
                    zoomThrough={visual.zoomThrough}
                  />
                </motion.div>
              </div>

              <div className="absolute bottom-7 left-1/2 h-px w-[min(360px,66vw)] -translate-x-1/2 overflow-hidden rounded-full bg-white/10" style={{ opacity: visual.bgOpacity }}>
                <div className="h-full rounded-full bg-neutral-300 shadow-[0_0_18px_rgba(255,255,255,0.45)]" style={{ width: `${visual.p * 100}%` }} />
              </div>

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

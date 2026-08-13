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
import { councilMembers } from '@/components/sections/council/councilData';
import { mobileEvents } from '@/components/sections/events/eventData';
import './xp-loader.css';

const FilmTape = dynamic(() => import('../../../models/reactComponent/FilmTape'), {
  ssr: false,
  loading: () => null,
});

interface PreloaderProps {
  onComplete: () => void;
  /** Play the hero film. Fired the instant the zoom-through begins. */
  onStartTransition?: () => void;
  /**
   * Decode the hero's first frame without playing it, ~2s ahead of the zoom.
   *
   * Split out from `onStartTransition` so the two jobs stop fighting. A cold
   * `play()` can take 100ms+ to put a frame on screen, so waking the hero at
   * the moment of handover risks a black flash; but waking it *early* meant it
   * was already seconds into the film when the strip finally opened onto it,
   * and the loader's own copy was somewhere else again — two clips of the same
   * footage, cut together at two unrelated timestamps. That mismatch was the
   * visible "glitch" at the end of the loader. Now the hero is primed here and
   * every copy is restarted together at the zoom.
   */
  onPrimeHero?: () => void;
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

/**
 * How hard the film strip itself flies at the camera during the zoom-through,
 * and how much of the zoom it survives. The two are coupled on purpose — see
 * the `filmWrapRef` block in `applyFrame`.
 *
 * 2.6 is a budget, not a taste. The strip is `max(4000px, 500vw)` wide, so its
 * layer is ~17k px across at this scale; Chrome tiles that and only rasterises
 * the tiles the viewport touches. The 18× this replaced put the layer past
 * 115k px, which is where tiling stops saving you.
 */
const STRIP_SCALE = 2.6;
const STRIP_FADE = 0.5;

export default function Preloader({ onComplete, onStartTransition, onPrimeHero }: PreloaderProps) {
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
  const portalRef = useRef<HTMLDivElement | null>(null);
  const portalVideoRef = useRef<HTMLVideoElement | null>(null);
  /** The reveal cell's screen rect, measured once during the hold. */
  const revealRectRef = useRef<DOMRect | null>(null);

  // Preload intro video + all 7 preloader event images + critical mobile assets
  useEffect(() => {
    let loaded = 0;
    
    // Core preloader images
    const coreImages = [
      ik('/preloader/genesis.jpg'),
      ik('/preloader/unplug.png'),
      ik('/preloader/pitchperf.png'),
      ik('/preloader/bnb.png'),
      ik('/preloader/whatif.png'),
      ik('/preloader/ideacafe1.png'),
      ik('/preloader/futureforge.png'),
    ];

    // Build list of critical mobile assets to preload
    const criticalMobileAssets = [
      // About Section Turntable Player
      ik('/record player/base.png'),
      ik('/record player/disc.png'),
      ik('/record player/toneram.png'),
      'https://ik.imagekit.io/9yzb99hnu/gdg-crce/record-player/Orange_record.png?tr=f-auto,q-auto',
      'https://ik.imagekit.io/9yzb99hnu/gdg-crce/record-player/Red_record.png?tr=f-auto,q-auto',
      'https://ik.imagekit.io/9yzb99hnu/gdg-crce/record-player/Yellow_record.png?tr=f-auto,q-auto',
      
      // What We Do Mobile Camera & Prints
      ik('/whatwedo/mobile/camera.png'),
      ik('/whatwedo/mobile/cameratop.png'),
      ik('/whatwedo/mobile/technical.png'),
      ik('/whatwedo/mobile/content.png'),
      ik('/whatwedo/mobile/coomunity.png'),
      ik('/whatwedo/mobile/ml&andro.png'),
      ik('/whatwedo/mobile/design.png'),

      // Events Section Mobile Background & Logo
      ik('/events/eventsmobbg.png'),
      '/_next/image?url=%2Flogo.png&w=96&q=75',
      '/_next/image?url=%2Flogo.png&w=128&q=75',
      '/_next/image?url=%2Flogo.png&w=640&q=75',
    ];

    // Mobile Event Posters
    mobileEvents.forEach((evt) => {
      // Next.js optimized responsive sizes
      criticalMobileAssets.push(`/_next/image?url=${encodeURIComponent(evt.posterImage)}&w=640&q=75`);
      criticalMobileAssets.push(`/_next/image?url=${encodeURIComponent(evt.posterImage)}&w=750&q=75`);
      criticalMobileAssets.push(`/_next/image?url=${encodeURIComponent(evt.posterImage)}&w=828&q=75`);
    });

    // Council Members portraits
    councilMembers.forEach((member) => {
      criticalMobileAssets.push(member.photo);
      criticalMobileAssets.push(member.photoThumb);
    });

    const allImagesToLoad = [...coreImages, ...criticalMobileAssets];
    
    // Total items: images + 1 (hero video) + 1 (GLB file)
    const totalItems = allImagesToLoad.length + 2;

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

    allImagesToLoad.forEach((src) => {
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

    // Prefetch GLB file
    fetch('/models/myModel-v1-transformed.glb')
      .then(checkReady)
      .catch(checkReady);
  }, []);

  const onStartTransitionRef = useRef(onStartTransition);
  const onCompleteRef = useRef(onComplete);
  const onPrimeHeroRef = useRef(onPrimeHero);

  useEffect(() => {
    onStartTransitionRef.current = onStartTransition;
    onCompleteRef.current = onComplete;
    onPrimeHeroRef.current = onPrimeHero;
  }, [onStartTransition, onComplete, onPrimeHero]);

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
    let heroPrimed = false;
    let zoomStarted = false;
    let cellVideoParked = false;

    /** The loader's copy of the film, living inside the strip's reveal cell. */
    const cellVideo = () =>
      filmWrapRef.current?.querySelector<HTMLVideoElement>('.loader-film-cell-reveal video') ?? null;

    const tl = gsap.timeline({
      onUpdate: () => {
        const p = clamp(animObj.val);
        applyFrame(p);
      },
      onComplete: () => {
        // Wait for the hero video to have a painted frame before the
        // preloader unmounts. Without this, on slow decode or cold cache
        // the preloader's z-9999 layer disappears BEFORE the video has
        // rendered its first frame, so the user sees the HomeSection's
        // "GDG CRCE" directly instead of the video.
        const heroVideo = document.querySelector<HTMLVideoElement>(
          'section[aria-label="Storytelling Cinematic Intro"] video'
        );
        if (heroVideo && heroVideo.readyState >= 3) {
          // Already has a frame painted — go immediately
          window.setTimeout(complete, 80);
        } else if (heroVideo) {
          // Wait for the first painted frame
          const onReady = () => {
            heroVideo.removeEventListener('canplay', onReady);
            heroVideo.removeEventListener('playing', onReady);
            clearTimeout(fallback);
            window.setTimeout(complete, 80);
          };
          heroVideo.addEventListener('canplay', onReady);
          heroVideo.addEventListener('playing', onReady);
          // Fallback: never stall longer than 600ms
          const fallback = setTimeout(() => {
            heroVideo.removeEventListener('canplay', onReady);
            heroVideo.removeEventListener('playing', onReady);
            complete();
          }, 600);
        } else {
          // No video element found (shouldn't happen) — proceed
          window.setTimeout(complete, 200);
        }
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

      if (filmTapeInnerRef.current) {
        filmTapeInnerRef.current.style.transform = `translate3d(${stripX}%, 0, 0)`;
        filmTapeInnerRef.current.style.setProperty('--rewind', String(rewind));
      }

      // Measure the reveal cell exactly once, during the hold. This is the only
      // layout read in the whole timeline, and it is taken in the one stretch
      // where nothing on screen is moving — so it costs a frame nobody can see.
      if (!revealRectRef.current && p >= TRANSLATE_END) {
        const cell = filmWrapRef.current?.querySelector('.loader-film-cell-reveal');
        const r = cell?.getBoundingClientRect();
        if (r && r.width > 1 && r.height > 1) revealRectRef.current = r;
      }

      // Prime the hero's decoder while the strip is still holding, so `play()`
      // at the zoom is instant rather than a cold start. It stays PAUSED on its
      // first frame until the handover below.
      if (!heroPrimed && p > 0.55) {
        heroPrimed = true;
        onPrimeHeroRef.current?.();
      }

      // ── Phase B: the zoom-through ─────────────────────────────────────────
      // Nothing is scaled 18× any more. The strip drifts forward a little and
      // fades; the reveal is a clip-path window opening out of the cell's
      // measured rect. See `.loader-reveal-portal` in globals.css for why.
      const zoomP = clamp((p - HOLD_FRAME21_END) / (REVEAL_END - HOLD_FRAME21_END));
      const eased = zoomP * zoomP * (3 - 2 * zoomP);

      if (zoomP > 0 && !zoomStarted) {
        zoomStarted = true;
        // Every copy of the film restarts on this one tick — the loader's cell,
        // the portal, and the hero. That is what makes the handover invisible:
        // three elements showing frame 0 of the same file at the same instant.
        // It is also the replay the strip has been promising, since the cell
        // only ever showed a cropped sliver of the frame.
        for (const v of [cellVideo(), portalVideoRef.current]) {
          if (!v) continue;
          try {
            v.currentTime = 0;
          } catch {}
          v.play().catch(() => {});
        }
        onStartTransitionRef.current?.();
      }

      // Once the portal is opaque it fully covers the cell, so the loader's
      // copy is painting nothing and only costs a decoder. Park it.
      if (!cellVideoParked && zoomP > 0.16) {
        cellVideoParked = true;
        cellVideo()?.pause();
      }

      applyPortal(zoomP, eased);

      if (filmWrapRef.current) {
        // The strip flies at you too, so the shot reads as going INTO the film
        // rather than as a window opening in front of a still one.
        //
        // Every bit of that growth is growth you can see, which is the whole
        // trick: the scale is driven by `min(eased, STRIP_FADE)` rather than by
        // `eased`, so it reaches its maximum at the exact frame the strip
        // becomes invisible and stops there. Scaling on past that would be
        // rasterising a 6,400px-wide subtree at ever-larger sizes to show
        // nobody anything — which, at 18×, is what the original zoom did.
        const fade = clamp(eased / STRIP_FADE);
        const grow = Math.min(eased, STRIP_FADE);
        filmWrapRef.current.style.transform =
          `translate3d(-50%, -50%, 0) scale(${(1 + grow * (STRIP_SCALE - 1) / STRIP_FADE).toFixed(4)})`;
        filmWrapRef.current.style.opacity = (1 - fade).toFixed(4);
        // Fully transparent is still fully composited. Take it out of the tree.
        filmWrapRef.current.style.visibility = fade >= 1 ? 'hidden' : 'visible';
      }

      if (bgLayersRef.current) {
        bgLayersRef.current.style.opacity = (1 - clamp(eased / 0.55)).toFixed(4);
      }

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${p * 100}%`;
      }
    }

    /** Open the reveal window from the cell's rect out to the viewport edges. */
    function applyPortal(zoomP: number, eased: number) {
      const portal = portalRef.current;
      if (!portal) return;

      if (zoomP <= 0) {
        portal.style.visibility = 'hidden';
        portal.style.opacity = '0';
        return;
      }

      portal.style.visibility = 'visible';
      // Fast, and while the window is still cell-sized — by the time it is big
      // enough to read, the crossfade with the strip is long over.
      portal.style.opacity = clamp(zoomP / 0.1).toFixed(4);

      const r = revealRectRef.current;
      if (!r) {
        // Measurement never landed (a zero-sized viewport, a hidden tab). Fall
        // back to a straight fade rather than clipping against garbage.
        portal.style.clipPath = 'none';
        return;
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const k = 1 - eased;

      portal.style.clipPath =
        `inset(${(r.top * k).toFixed(1)}px ${((vw - r.right) * k).toFixed(1)}px ` +
        `${((vh - r.bottom) * k).toFixed(1)}px ${(r.left * k).toFixed(1)}px ` +
        `round ${(5 * k).toFixed(1)}px)`;

      // The window is a clip, not a resize — so on its own it would open on a
      // tiny centre crop of a full-size frame and pull back to reveal the rest.
      // That is a zoom OUT, and the opposite of the shot. The video is shrunk
      // to the cell's size to start with, so the content inside the window at
      // zoomP 0 is the whole frame at exactly the size the cell was showing it,
      // and it grows to full screen with the window.
      //
      // `max` rather than `min`: the video must cover the window at every step,
      // the same rule `object-fit: cover` follows inside the cell itself.
      const video = portalVideoRef.current;
      if (video) {
        const fit = Math.max(r.width / vw, r.height / vh);
        video.style.transform = `scale(${(fit + (1 - fit) * eased).toFixed(4)})`;
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
                    <span className="xp-title">Synécheia</span>
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

            {/* The reveal portal: the hero film at its final size and aspect
                from the first frame, with a clip-path window opening out of
                the strip's reveal cell. Same local url as the cell and the
                hero, so it is still one download for all three. */}
            <div ref={portalRef} className="loader-reveal-portal" aria-hidden="true">
              <video
                ref={portalVideoRef}
                className="loader-reveal-portal-video"
                src={HERO_VIDEO_SRC}
                preload="auto"
                autoPlay
                muted
                playsInline
                disablePictureInPicture
                disableRemotePlayback
              />
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


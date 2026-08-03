'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HERO_VIDEO_SRC } from '@/lib/media';
import { clamp01, currentIntroPhases } from '@/lib/introTimeline';

interface HeroVideoSectionProps {
  startPlaying?: boolean;
  /**
   * Decode a first frame and hold it, without playing.
   *
   * The preloader raises this about two seconds before the zoom-through so the
   * decoder is warm, then raises `startPlaying` at the exact frame the film
   * strip opens onto this element. Splitting the two is what lets every copy
   * of the film start from 0 together — see `onPrimeHero` in Preloader.tsx.
   */
  primed?: boolean;
}

/**
 * Radius, as a CSS `circle()` percentage, at which the iris still covers the
 * whole frame. `circle(r%)` resolves against sqrt(w²+h²)/√2, so the corners are
 * reached at exactly √2/2 = 70.71%; 72 leaves a little slack for rounding.
 */
const IRIS_OPEN = 72;

/** Hard ceiling on the scroll lock, so an unexpectedly long intro can never
 *  trap the page. */
const MAX_LOCK_MS = 20000;

/**
 * Act 2 — the hero film, and the iris that closes it.
 *
 * Playback is a plain `<video>` pointed at a local file. There is no HLS, no
 * hls.js and no CDN in this path at all (see `src/lib/media.ts` for why).
 *
 * Scroll no longer pushes the frame into the next section. The old behaviour —
 * scale the whole video up 13× and cross-fade into the turntable — is gone:
 * the last frame now closes through a circular iris to black, the way a reel
 * ends, and `HomeSection` takes the black screen from there.
 */
export default function HeroVideoSection({ startPlaying = false, primed = false }: HeroVideoSectionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const maxProgressRef = useRef(0);

  const [isLoaded, setIsLoaded] = useState(false);
  const [fadeInDone, setFadeInDone] = useState(false);

  // If the element is already buffered by the time we mount, reflect that.
  useEffect(() => {
    const video = videoRef.current;
    if (video && video.readyState >= 2) setIsLoaded(true);
  }, []);

  // Warm the decoder without playing. Seeking a preloaded element to 0 forces
  // a decode and a paint, so by the time `startPlaying` arrives the first frame
  // is already on the GPU and `play()` is a state change rather than a stall.
  // Deliberately does NOT touch `fadeInDone` — a primed hero is ready, not
  // visible; the preloader's own layers are still opaque over it.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !primed || startPlaying) return;
    try {
      video.currentTime = 0;
    } catch {}
  }, [primed, startPlaying]);

  // Sync video start explicitly when startPlaying turns true (the moment the
  // preloader's film strip begins its zoom-through).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!startPlaying) {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {}
      setFadeInDone(false);
    } else {
      // 1. First trigger soft fade-in of the video container
      setFadeInDone(true);

      // 2. Lock body overflow so the user cannot scroll during the first pass
      document.body.style.overflow = 'hidden';

      // 3. Play immediately so it is running directly behind the zooming film
      //    strip with zero gap
      try {
        video.currentTime = 0;
      } catch {}
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }
  }, [startPlaying]);

  // The intro does NOT loop: it freezes on its last frame, which is the frame
  // the iris then closes over.
  useEffect(() => {
    if (!startPlaying) return;
    const video = videoRef.current;
    if (!video) return;

    let released = false;
    const unlock = () => {
      if (released) return;
      released = true;
      document.body.style.overflow = '';
    };

    // Rely on the native 'ended' event so the handover is EXACTLY the last frame
    video.addEventListener('ended', unlock);

    // Fallback if 'ended' doesn't fire for some reason
    const fallback = Math.min(((video.duration || 12) + 0.5) * 1000, MAX_LOCK_MS);
    const timer = setTimeout(unlock, fallback);

    return () => {
      video.removeEventListener('ended', unlock);
      clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, [startPlaying]);

  // ── the iris ──────────────────────────────────────────────────────────────
  // Scroll closes a circle over the frozen last frame until the screen is
  // black. Nothing here fades: the section is opaque right up to the point the
  // clip path has eaten it, so there is never a half-transparent video sitting
  // on top of the title.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const el = containerRef.current;
    if (!el) return;

    const apply = (progress: number) => {
      maxProgressRef.current = Math.max(maxProgressRef.current, progress);
      const p = clamp01(maxProgressRef.current);
      const e = p * p * (3 - 2 * p);

      el.style.clipPath = `circle(${((1 - e) * IRIS_OPEN).toFixed(2)}% at 50% 50%)`;
      // A touch of recede, so the frame reads as pulling away rather than as a
      // mask sliding over a still image.
      el.style.transform = `scale(${(1 - e * 0.06).toFixed(4)})`;

      // Once shut, stop costing anything: a hidden element is not painted, and
      // a paused video is not decoded. This layer stays mounted for the rest of
      // the page, so leaving it live would be a full-screen tax on every
      // section below it.
      const shut = p >= 0.999;
      el.style.visibility = shut ? 'hidden' : 'visible';
      // Release the compositor layer too. `will-change` is a promise about the
      // near future; once the iris is shut this layer never animates again, and
      // holding a full-viewport texture for the remaining twenty-odd screens of
      // scroll is exactly the kind of tax `will-change` is famous for.
      el.style.willChange = shut ? 'auto' : 'clip-path, transform';
      if (shut) videoRef.current?.pause();
    };

    const st = ScrollTrigger.create({
      trigger: document.body,
      start: 0,
      end: () => currentIntroPhases().iris.end,
      scrub: 1.2,
      onUpdate: (self) => apply(self.progress),
      onRefresh: (self) => apply(self.progress),
    });

    apply(0);
    st.refresh();

    return () => {
      st.kill();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="fixed inset-0 w-full h-screen overflow-hidden select-none z-[9997] pointer-events-none"
      aria-label="Storytelling Cinematic Intro"
      style={{ clipPath: `circle(${IRIS_OPEN}% at 50% 50%)`, willChange: 'clip-path, transform' }}
    >
      {/* Black backing, so the frame the iris closes over is never see-through */}
      <div className="absolute inset-0 bg-black z-0" />

      {/* Full screen storytelling video — local file, progressive, no streaming */}
      <video
        ref={videoRef}
        src={HERO_VIDEO_SRC}
        preload="auto"
        muted
        playsInline
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        onLoadedData={() => setIsLoaded(true)}
        onCanPlay={() => setIsLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover z-10 transform-gpu transition-opacity duration-300 ease-in-out ${
          isLoaded && (fadeInDone || startPlaying) ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </section>
  );
}

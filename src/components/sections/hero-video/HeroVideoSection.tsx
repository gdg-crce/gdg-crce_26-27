'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HERO_VIDEO_SRC } from '@/lib/media';
import { clamp01, currentIntroPhases } from '@/lib/introTimeline';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface HeroVideoSectionProps {
  startPlaying?: boolean;
  /**
   * Decode a first frame and hold it, without playing.
   */
  primed?: boolean;
  onVideoEnded?: () => void;
}

/**
 * Radius, as a CSS `circle()` percentage, at which the iris still covers the
 * whole frame.
 */
const IRIS_OPEN = 72;

/** Hard ceiling on the scroll lock, so an unexpectedly long intro can never
 *  trap the page. */
const MAX_LOCK_MS = 20000;

export default function HeroVideoSection({
  startPlaying = false,
  primed = false,
  onVideoEnded,
}: HeroVideoSectionProps) {
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

  // Warm decoder without playing
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !primed || startPlaying) return;
    try {
      video.currentTime = 0;
    } catch {}
  }, [primed, startPlaying]);

  // Playback initialization and user gesture unlock fallback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const attemptPlay = () => {
      if (!video) return;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');

      const p = video.play();
      if (p !== undefined) {
        p.then(() => setIsLoaded(true)).catch(() => {});
      }
    };

    if (!startPlaying) {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {}
      setFadeInDone(false);
    } else {
      setFadeInDone(true);
      document.body.style.overflow = 'hidden';

      try {
        video.currentTime = 0;
      } catch {}

      attemptPlay();

      video.addEventListener('canplay', attemptPlay);
      video.addEventListener('loadeddata', attemptPlay);

      // Gesture fallback for strict autoplay policies
      window.addEventListener('pointerdown', attemptPlay, { passive: true });
      window.addEventListener('touchstart', attemptPlay, { passive: true });

      return () => {
        video.removeEventListener('canplay', attemptPlay);
        video.removeEventListener('loadeddata', attemptPlay);
        window.removeEventListener('pointerdown', attemptPlay);
        window.removeEventListener('touchstart', attemptPlay);
      };
    }
  }, [startPlaying]);

  // Handle video end and iris shut
  useEffect(() => {
    if (!startPlaying) return;
    const video = videoRef.current;
    if (!video) return;

    let released = false;
    const unlock = () => {
      if (released) return;
      released = true;
      document.body.style.overflow = '';
      onVideoEnded?.();

      const el = containerRef.current;
      if (el) {
        gsap.to(el, {
          clipPath: 'circle(0% at 50% 50%)',
          duration: 0.8,
          ease: 'power2.inOut',
          onComplete: () => {
            el.style.visibility = 'hidden';
            maxProgressRef.current = 1;
          },
        });
      }
    };

    video.addEventListener('ended', unlock);

    const fallback = Math.min(((video.duration || 12) + 0.5) * 1000, MAX_LOCK_MS);
    const timer = setTimeout(unlock, fallback);

    return () => {
      video.removeEventListener('ended', unlock);
      clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, [startPlaying, onVideoEnded]);

  // Iris scroll trigger
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const apply = (progress: number) => {
      maxProgressRef.current = Math.max(maxProgressRef.current, progress);
      const p = clamp01(maxProgressRef.current);
      const e = p * p * (3 - 2 * p);

      el.style.clipPath = `circle(${((1 - e) * IRIS_OPEN).toFixed(2)}% at 50% 50%)`;
      el.style.transform = `scale(${(1 - e * 0.06).toFixed(4)})`;

      const shut = p >= 0.999;
      el.style.visibility = shut ? 'hidden' : 'visible';
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
      <div className="absolute inset-0 bg-black z-0" />

      <video
        ref={videoRef}
        src={HERO_VIDEO_SRC}
        preload="auto"
        autoPlay
        muted
        playsInline
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        onLoadedData={() => setIsLoaded(true)}
        onCanPlay={() => setIsLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover z-10 transform-gpu transition-opacity duration-300 ease-in-out ${
          isLoaded || fadeInDone || startPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </section>
  );
}

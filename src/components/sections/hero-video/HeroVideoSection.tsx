'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface HeroVideoSectionProps {
  startPlaying?: boolean;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Eased ramp: 0 below `a`, 1 above `b`, smoothstep between. */
const ramp = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Hard ceiling on the scroll lock, so an unexpectedly long intro can never
 *  trap the page. */
const MAX_LOCK_MS = 20000;

export default function HeroVideoSection({ startPlaying = false }: HeroVideoSectionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [fadeInDone, setFadeInDone] = useState(false);

  // Sync video start explicitly when startPlaying turns true (when the VHS tape
  // transition completes).
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

      // 3. Play immediately so it is running directly behind the zooming VHS
      //    tape with zero gap
      try {
        video.currentTime = 0;
      } catch {}
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }
  }, [startPlaying]);

  // The intro LOOPS now, so `ended` never fires. Release the scroll lock once
  // the first play-through has wrapped instead — the loop then just keeps
  // running underneath the About section as it fades in over the top.
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

    let last = 0;
    const onTime = () => {
      // currentTime jumping backwards means the loop wrapped: one pass done.
      if (video.currentTime < last - 0.25) unlock();
      last = video.currentTime;
    };
    video.addEventListener('timeupdate', onTime);

    // Safety net for an unknown/absent duration or throttled timeupdate.
    const fallback = Math.min(((video.duration || 12) + 0.5) * 1000, MAX_LOCK_MS);
    const timer = setTimeout(unlock, fallback);

    return () => {
      video.removeEventListener('timeupdate', onTime);
      clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, [startPlaying]);

  // Scroll hands the screen over to the About section: the video fades out
  // across the first viewport of scroll while the turntable fades up over it.
  // Once it is fully hidden the element is paused — a looping full-screen video
  // decoding behind an opaque section is pure waste.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const el = containerRef.current;
    const video = videoRef.current;
    if (!el) return;

    const st = ScrollTrigger.create({
      trigger: document.body,
      start: 0,
      end: () => window.innerHeight, // 100vh runway
      scrub: 1.5,
      onUpdate: (self) => {
        const e = self.progress;
        const opacity = 1 - ramp(0.1, 0.9, e);
        
        // Cinematic zoom-in and blur
        const scale = 1 + (e * 0.15);
        const blur = e * 8; // 0 to 8px blur
        
        el.style.opacity = opacity.toFixed(3);
        el.style.transform = `scale(${scale.toFixed(3)})`;
        el.style.filter = `blur(${blur.toFixed(1)}px)`;
        el.style.pointerEvents = opacity < 0.02 ? 'none' : '';

        if (video) {
          if (opacity < 0.02) {
            if (!video.paused) video.pause();
          } else if (video.paused && startPlaying) {
            video.play().catch(() => {});
          }
        }
      }
    });

    st.refresh();

    return () => {
      st.kill();
    };
  }, [startPlaying]);

  return (
    <section
      ref={containerRef}
      className="fixed inset-0 w-full h-[100dvh] md:h-screen overflow-hidden select-none z-[9990]"
      aria-label="Storytelling Cinematic Intro"
    >
      {/* Dark aesthetic background while video initializes */}
      <div className="absolute inset-0 bg-[#080706] z-0" />

      {/* Full screen storytelling video on an endless loop. */}
      <video
        ref={videoRef}
        src="/videos/intro.mp4"
        preload="auto"
        muted
        loop
        playsInline
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        onLoadedData={() => setIsLoaded(true)}
        onCanPlay={() => setIsLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover z-10 transform-gpu will-change-transform transition-opacity duration-1000 ease-in-out ${
          isLoaded && (fadeInDone || startPlaying) ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Subtle bottom vignette gradient blending smoothly into the next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#0a0807] via-[#0a0807]/40 to-transparent z-20" />
    </section>
  );
}

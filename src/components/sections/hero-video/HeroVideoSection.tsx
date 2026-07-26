'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ikVideo, ikVideoHls } from '@/lib/imagekit';
import { useHlsVideo } from './useHlsVideo';

import Image from 'next/image';

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
  const [videoEnded, setVideoEnded] = useState(false);

  // Source is owned by the HLS hook: it streams the new intro as adaptive-bitrate
  // HLS (buffered segments) and falls back to the progressive MP4 if HLS is
  // unavailable or the manifest is still building. It also calls video.load(),
  // so nothing here touches .src or .load().
  useHlsVideo(videoRef, ikVideoHls('/videos/Video Project 1 (1).mp4'), ikVideo('/videos/Video Project 1 (1).mp4'));

  // If the element is already buffered by the time we mount, reflect that.
  useEffect(() => {
    const video = videoRef.current;
    if (video && video.readyState >= 2) setIsLoaded(true);
  }, []);

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

  // The intro NO LONGER LOOPS. Freeze on last frame and hand over to screenshot.
  useEffect(() => {
    if (!startPlaying) return;
    const video = videoRef.current;
    if (!video) return;

    let released = false;
    const unlock = () => {
      if (released) return;
      released = true;
      document.body.style.overflow = '';
      setVideoEnded(true);
    };

    // Rely entirely on the native 'ended' event to ensure it is EXACTLY the last frame
    video.addEventListener('ended', unlock);

    // Fallback if ended doesn't fire for some reason
    const fallback = Math.min(((video.duration || 12) + 0.5) * 1000, MAX_LOCK_MS);
    const timer = setTimeout(unlock, fallback);

    return () => {
      video.removeEventListener('ended', unlock);
      clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, [startPlaying]);

  // Scroll hands the screen over to the About section via a deep 3D Zoom
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const el = containerRef.current;
    if (!el) return;

    const st = ScrollTrigger.create({
      trigger: document.body,
      start: 0,
      end: () => window.innerHeight * 1.5, // 1.5vh runway for deep zoom
      scrub: 1.5,
      onUpdate: (self) => {
        const e = self.progress;
        
        // Softer zoom scale so we don't go too deep into the red circle
        const scale = 1 + Math.pow(e, 3) * 12; 
        
        // Start fading out much earlier for a longer, more subtle crossfade
        const opacity = 1 - ramp(0.3, 0.9, e);
        
        el.style.opacity = opacity.toFixed(3);
        // Assuming mathematical center as requested
        el.style.transformOrigin = '50% 50%';
        el.style.transform = `scale(${scale.toFixed(3)})`;
        el.style.pointerEvents = opacity < 0.02 ? 'none' : '';
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
      className="fixed inset-0 w-full h-screen overflow-hidden select-none z-[9990]"
      aria-label="Storytelling Cinematic Intro"
    >
      {/* Dark aesthetic background while video initializes */}
      <div className="absolute inset-0 bg-[#080706] z-0" />

      {/* Seamless Screenshot Overlay */}
      <div className={`absolute inset-0 z-20 w-full h-full transition-opacity duration-1000 ease-in-out pointer-events-none ${videoEnded ? 'opacity-100' : 'opacity-0'}`}>
        <Image 
          src="https://ik.imagekit.io/9yzb99hnu/gdg-crce/transition/Screenshot%202026-07-27%20010718.png?tr=f-auto,q-auto"
          alt="Transition"
          fill
          className="object-cover object-center"
          priority
          unoptimized
        />
      </div>

      {/* Full screen storytelling video. */}
      <video
        ref={videoRef}
        preload="auto"
        muted
        playsInline
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        onLoadedData={() => setIsLoaded(true)}
        onCanPlay={() => setIsLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover z-10 transform-gpu will-change-transform transition-opacity duration-300 ease-in-out ${
          isLoaded && (fadeInDone || startPlaying) ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Subtle bottom vignette gradient blending smoothly into the next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#0a0807] via-[#0a0807]/40 to-transparent z-30 opacity-0" />
    </section>
  );
}

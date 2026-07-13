'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface HeroVideoSectionProps {
  startPlaying?: boolean;
}

export default function HeroVideoSection({ startPlaying = false }: HeroVideoSectionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [fadeInDone, setFadeInDone] = useState(false);

  // Sync video start explicitly when startPlaying turns true (when VHS tape transition completes)
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

      // 2. Ensure body overflow is unlocked so user can scroll freely
      document.body.style.overflow = '';

      // 3. Play video immediately so it is running directly behind the zooming VHS tape with zero gap
      try {
        video.currentTime = 0;
      } catch {}
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }
  }, [startPlaying]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = videoRef.current;
          if (!video) return;

          if (entry.isIntersecting) {
            if (startPlaying) {
              const playPromise = video.play();
              if (playPromise !== undefined) {
                playPromise.catch(() => {});
              }
            }
          } else {
            video.pause();
          }
        });
      },
      {
        threshold: 0.1,
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [startPlaying]);

  return (
    <section
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden bg-[#080706] select-none"
      aria-label="Storytelling Cinematic Intro"
    >
      {/* Dark aesthetic background while video initializes */}
      <div className="absolute inset-0 bg-[#080706] z-0" />

      {/* Full screen optimized storytelling video with soft fade-in */}
      <video
        ref={videoRef}
        src="/videos/intro.mp4"
        preload="auto"
        loop
        muted
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

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
  // The intro plays ONCE and holds on the Samvad frame — we then reveal the
  // crisp Samvad photo so the About section can zoom into its red REC dot.
  const [videoEnded, setVideoEnded] = useState(false);
  const endedRef = useRef(false);

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

      // 2. Lock body overflow so user cannot scroll during the video
      document.body.style.overflow = 'hidden';

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
            // Never replay once it has ended — it holds on the Samvad frame.
            if (startPlaying && !endedRef.current) {
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
      className={`fixed inset-0 w-full h-screen overflow-hidden select-none z-[9990] transition-opacity duration-500 ${
        videoEnded ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Storytelling Cinematic Intro"
    >
      {/* Dark aesthetic background while video initializes */}
      <div className="absolute inset-0 bg-[#080706] z-0" />

      {/* Full screen optimized storytelling video with soft fade-in.
          No loop — it plays once and freezes on the closing Samvad frame. */}
      <video
        ref={videoRef}
        src="/videos/intro.mp4"
        preload="auto"
        muted
        playsInline
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        onLoadedData={() => setIsLoaded(true)}
        onCanPlay={() => setIsLoaded(true)}
        onEnded={() => {
          endedRef.current = true;
          const video = videoRef.current;
          if (video) {
            video.pause();
            // Hold the last frame under the photo in case the browser blanks it.
            try {
              video.currentTime = Math.max(0, (video.duration || 0) - 0.05);
            } catch {}
          }
          setVideoEnded(true);

          // Unlock scrolling now that the video is finished.
          document.body.style.overflow = '';
        }}
        className={`absolute inset-0 w-full h-full object-cover z-10 transform-gpu will-change-transform transition-opacity duration-1000 ease-in-out ${
          isLoaded && (fadeInDone || startPlaying) ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Crisp Samvad frame revealed as the intro ends. This is the exact frame
          the About section then zooms into — same asset, seamless handoff. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/samvad-frame.jpg"
        alt="GDG CRCE — Samvad, 1987"
        draggable={false}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
        className={`pointer-events-none absolute inset-0 w-full h-full object-cover z-[15] transition-opacity duration-700 ease-in-out ${
          videoEnded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ objectPosition: 'center 22%' }}
      />

      {/* Subtle bottom vignette gradient blending smoothly into the next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#0a0807] via-[#0a0807]/40 to-transparent z-20" />
    </section>
  );
}

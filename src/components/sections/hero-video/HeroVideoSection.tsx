'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface HeroVideoSectionProps {
  startPlaying?: boolean;
}

export default function HeroVideoSection({ startPlaying = false }: HeroVideoSectionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startPlayingRef = useRef(startPlaying);

  const [isLoaded, setIsLoaded] = useState(false);
  const [fadeInDone, setFadeInDone] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [scrollUnlocked, setScrollUnlocked] = useState(false);

  startPlayingRef.current = startPlaying;

  const unlockScroll = useCallback(() => {
    setScrollUnlocked(true);
    document.body.style.overflow = '';
  }, []);

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

      // 2. Lock scroll initially so user watches intro without momentum scroll sending them to EventsSection
      window.scrollTo(0, 0);
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

  // Enforce page stays at very top (0, 0) during the intro lock so EventsSection is never visible underneath
  useEffect(() => {
    if (!startPlaying || scrollUnlocked) return;

    window.scrollTo(0, 0);
    document.body.style.overflow = 'hidden';

    const enforceTop = () => {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('scroll', enforceTop, { passive: true });
    return () => {
      window.removeEventListener('scroll', enforceTop);
    };
  }, [startPlaying, scrollUnlocked]);

  // Monitor video playback time to automatically unlock scroll after 10 seconds
  useEffect(() => {
    if (!startPlaying || scrollUnlocked) return;

    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime >= 10 && !scrollUnlocked) {
        unlockScroll();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [startPlaying, scrollUnlocked, unlockScroll]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = videoRef.current;
          if (!video) return;

          if (entry.isIntersecting) {
            if (startPlayingRef.current) {
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
  }, []);

  const remainingSeconds = Math.max(0, Math.ceil(10 - currentTime));

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

      {/* ── CINEMATIC HUD & SCROLL LOCK OVERLAY (Visible during first 10 seconds) ── */}
      {startPlaying && (
        <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-6 sm:p-10">
          <div className="flex items-center justify-between font-mono text-[11px] sm:text-xs tracking-[0.25em] text-neutral-300/80">
            <div className="flex items-center gap-2.5 rounded-full bg-black/60 border border-white/15 px-4 py-2 backdrop-blur-md">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span>GDG FRCRCE // ARCHIVE PLAYBACK</span>
            </div>

            {!scrollUnlocked && (
              <button
                type="button"
                onClick={unlockScroll}
                className="pointer-events-auto cursor-pointer flex items-center gap-2 rounded-full border border-amber-400/40 bg-black/75 px-4 py-2 text-amber-300 transition hover:border-amber-400 hover:bg-amber-400/15"
              >
                <span>SKIP INTRO ⏭</span>
              </button>
            )}
          </div>

          <div className="flex flex-col items-center justify-end pb-8">
            {!scrollUnlocked ? (
              <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-2xl bg-black/70 border border-white/20 px-6 py-4 backdrop-blur-md shadow-2xl">
                <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-neutral-200">
                  <span>CINEMATIC INTRO LOCK</span>
                  <span className="text-amber-400 font-bold">UNLOCKS IN {remainingSeconds}s</span>
                </div>
                <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)] transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(100, (currentTime / 10) * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-neutral-300 animate-bounce">
                <span>↓ SCROLL DOWN TO EXPLORE EVENTS ↓</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtle bottom vignette gradient blending smoothly into the next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#0a0807] via-[#0a0807]/40 to-transparent z-20" />
    </section>
  );
}

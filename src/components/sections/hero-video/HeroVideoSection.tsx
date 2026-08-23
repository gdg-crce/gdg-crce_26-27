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

/**
 * Hard ceiling on the intro, so a film that never reports an ending can never
 * leave the iris open over a dead frame forever.
 *
 * (It used to be described as a ceiling on a scroll lock. There is no lock
 * here any more — the intro is scrollable by design; see the `startPlaying`
 * branch below. What this bounds is the watchdog that closes the iris.)
 *
 * This is a LAST RESORT, not a schedule — the watchdog below unlocks on the
 * playhead reaching the end, and normally `ended` beats both. It has to clear
 * the film's own length by a wide margin or it becomes the truncation bug it
 * is meant to guard against: the film is 18.1s, and at the old 20000 a start
 * delayed by more than 1.9s (autoplay gesture, cold decode, a stall) irised
 * the ending away. 32s leaves room for a slow start AND a mid-film rebuffer.
 */
const MAX_LOCK_MS = 32000;

export default function HeroVideoSection({
  startPlaying = false,
  primed = false,
  onVideoEnded,
}: HeroVideoSectionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const maxProgressRef = useRef(0);
  /**
   * Has the film started? The iris does not exist before it has.
   *
   * `maxProgressRef` only ever goes UP — that is what stops the iris reopening
   * once the viewer has scrolled past the intro, and it is correct. But it
   * means any progress read before the film is on screen latches forever, and
   * the loader runs for eight seconds in front of a page that is, as far as
   * ScrollTrigger is concerned, perfectly scrollable. A wheel flick during the
   * loader used to arrive as a fully closed iris: the zoom landed on a hero
   * that was already `visibility: hidden` and the film played its whole 18.1s
   * into nothing.
   *
   * The loader's scroll lock is the real fix (`src/lib/scrollLock.ts`); this is
   * the invariant that makes the guarantee hold even if something else moves
   * the page early — a refresh mid-pin, a restored scroll position, a browser
   * that anchors. Nothing that happened before the first frame counts.
   */
  const armedRef = useRef(false);

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
      armedRef.current = false;
      maxProgressRef.current = 0;
    } else {
      // The film is on screen: the iris starts counting from here, from zero.
      maxProgressRef.current = 0;
      armedRef.current = true;
      setFadeInDone(true);
      /* No scroll lock is taken here.

         There used to be a `document.body.style.overflow = 'hidden'` on this
         line and it did nothing twice over: it cannot hold a page that Lenis
         scrolls programmatically (see `src/lib/scrollLock.ts`), and the
         preloader's unmount cleared it 60ms later anyway. The intro is
         deliberately NOT locked now that the loader's lock is real — the film
         runs to its end on its own, and a deliberate scroll is what closes the
         iris onto the next act. The loader releases its lock at scroll 0, so
         that scroll has to be the viewer's. */

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

    /* `unlock` no longer touches `document.body.style.overflow`. That string
       has exactly one owner now (`src/lib/scrollLock.ts`) — writing it from
       here cleared a lock the loader was still holding. What this releases is
       the intro itself: the film is over, so the iris shuts and Act 2 begins. */
    let released = false;
    const unlock = () => {
      if (released) return;
      released = true;
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

    /* ── the safety net has to read the video's OWN clock ──────────────────
       `ended` is the real signal; this only covers the cases where it never
       arrives — a decode error, a stall that never recovers, a tab that was
       backgrounded mid-play.

       It used to be a single timeout armed once, at mount:

           setTimeout(unlock, ((video.duration || 12) + 0.5) * 1000)

       and that is what cut the film off early. `duration` is NaN until
       metadata lands, and `NaN || 12` is 12 — so an 18.1s film irised shut at
       12.5s, every time the metadata had not arrived yet. Which, with the old
       non-faststart encode, was every time.

       Two further things a mount-time timeout cannot know: playback may START
       late (autoplay policy, cold decode) and it may STALL mid-way. Both eat
       into a wall-clock budget while the film has not moved. So the net polls
       the element instead of predicting it, and only fires when the playhead
       has actually reached the end — or when the absolute ceiling passes, so
       the page can never be trapped. */
    /* ── the film has no audio track, so a hidden tab SUSPENDS it ──────────
       Chrome pauses video-only media (an element with no audio track at all)
       when the page is hidden, to save power. Verified, not guessed — calling
       play() on a backgrounded tab returns:

         AbortError: The play() request was interrupted because video-only
         background media was paused to save power.

       The track was stripped on purpose (every element that plays this file is
       muted, so it was a decoder and a download for nothing), which puts the
       film squarely under that policy. Two consequences follow, and both need
       handling or a tab-switch mid-intro strands the viewer:

         1. Nothing would ever restart the film when they come back, so it sits
            frozen part-way through.
         2. The ceiling below would burn down while the film is suspended and
            physically cannot advance — turning a tab-switch into a skipped
            intro. Hidden time is therefore not counted against it. */
    let hiddenMs = 0;
    let hiddenAt = document.visibilityState === 'hidden' ? performance.now() : 0;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (!hiddenAt) hiddenAt = performance.now();
        return;
      }
      if (hiddenAt) {
        hiddenMs += performance.now() - hiddenAt;
        hiddenAt = 0;
      }
      if (!released && !video.ended && video.paused) video.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility);

    const armedAt = performance.now();
    let timer = 0;
    const tick = () => {
      if (released) return;
      const d = video.duration;
      /* The epsilon here is deliberately SUB-FRAME (one frame is 33ms at 30fps).
         It exists only to catch a playhead that stalls a hair short of
         `duration`; it must never preempt the real ending. An earlier version
         used `d - 0.25`, which fired a quarter second before the film was over
         and started the iris closing over the final shot — the film closes on
         a group photo that holds for the last couple of seconds, so clipping
         its tail is exactly the frame you cannot afford to lose.

         Note there is no "wall-clock vs duration" heuristic: playback can start
         late or stall, and any such rule truncates the film in precisely those
         cases. Reaching the end, or the absolute ceiling, are the only two
         things that release the lock. */
      const reachedEnd = Number.isFinite(d) && d > 0 && video.currentTime >= d - 0.05;
      const hiddenSoFar = hiddenMs + (hiddenAt ? performance.now() - hiddenAt : 0);
      const visibleElapsed = performance.now() - armedAt - hiddenSoFar;
      if (video.ended || reachedEnd || visibleElapsed > MAX_LOCK_MS) {
        unlock();
        return;
      }
      timer = window.setTimeout(tick, 250);
    };
    timer = window.setTimeout(tick, 250);

    return () => {
      video.removeEventListener('ended', unlock);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(timer);
    };
  }, [startPlaying, onVideoEnded]);

  // Iris scroll trigger
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const apply = (progress: number) => {
      // Before the film starts the iris is pinned open, and no scroll position
      // reached in that window is remembered. See `armedRef`.
      if (!armedRef.current) progress = 0;
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

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HERO_VIDEO_SRC } from '@/lib/media';
import { clamp01, currentIntroPhases } from '@/lib/introTimeline';
import { smoothScrollTo } from '@/lib/scrollLock';

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
 * The auto-reveal — see `beginAutoReveal` below.
 *
 * A beat on the frozen last frame first, so the film is allowed to finish
 * rather than being cut off by the page moving under it; then a drive into the
 * title.
 *
 * Both numbers came down (450ms / 3.4s) because the first cut put the title
 * fully up 3.2s after the last frame, and almost all of that was dead air on a
 * black screen — the film has faded out, so the beat has nothing to sit on.
 * What is left is the shortest hold that still reads as the film ENDING rather
 * than as being cut off, and a travel long enough for the iris to close as a
 * shutter instead of a blink. Do not trim these to zero: the two
 * ScrollTriggers this feeds run `scrub: 1.2`, so the picture trails the scroll
 * either way, and a scroll that finishes before the scrub does buys nothing.
 */
const AUTO_REVEAL_DELAY_MS = 150;
const AUTO_REVEAL_DURATION_S = 2.0;

/**
 * The curve the auto-reveal is driven on, and the one thing about it that is
 * not a taste call.
 *
 * Lenis's default easing is an expo-out — the right curve for "jump to an
 * anchor", because it covers most of the distance immediately and then settles.
 * Measured on this reveal it put 40% of the 1,692px into the first 250ms, which
 * slammed the iris from 72% to 5% in four frames. The shutter has to *close*,
 * not blink.
 *
 * Smootherstep instead: zero velocity at both ends, peak in the middle. The
 * film gets a moment of stillness before the page moves, the iris closes at an
 * even rate, and the title arrives on a decelerating scroll rather than a
 * skid.
 */
const AUTO_REVEAL_EASE = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

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
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsLoaded(true);
          })
          .catch(() => {
            // Autoplay safety: retry on user interaction if browser policy restricted initial attempt
            const tryPlay = () => {
              video.muted = true;
              video.play().then(() => setIsLoaded(true)).catch(() => {});
              window.removeEventListener('touchstart', tryPlay);
              window.removeEventListener('click', tryPlay);
            };
            window.addEventListener('touchstart', tryPlay, { passive: true, once: true });
            window.addEventListener('click', tryPlay, { passive: true, once: true });
          });
      }
    }
  }, [startPlaying]);

  // The intro does NOT loop: it freezes on its last frame, which is the frame
  // the iris then closes over.
  //
  // ── and then the page moves itself ────────────────────────────────────────
  // The film fades out to black, and the title card underneath it is also
  // black. So a viewer who watches the whole thing is left looking at a screen
  // that is *correct* and *identical* to the one before it, with no cue that
  // anything is waiting on them. Nothing is broken and nothing looks like it is
  // about to happen — which is the worst possible place to require an input.
  //
  // Skipping already works: scroll during the film and the iris closes early
  // onto the title, which is the intended shortcut. This does the same thing on
  // the viewer's behalf when they *didn't* skip, so both paths end on "GDG
  // CRCE" and neither one asks the viewer to guess.
  useEffect(() => {
    if (!startPlaying) return;
    const video = videoRef.current;
    if (!video) return;

    let released = false;
    let revealTimer = 0;
    let cancelReveal: (() => void) | null = null;

    const detach = () => {
      window.removeEventListener('wheel', onUserInput, true);
      window.removeEventListener('touchstart', onUserInput, true);
      window.removeEventListener('keydown', onUserInput, true);
    };

    /* The viewer wins, always — and `keydown` is the one that actually needs
       this. Lenis intercepts the wheel itself, but the keyboard and (with
       `syncTouch` off) a native touch scroll go straight to the browser, where
       the reveal's still-running animation overwrites the scroll position on
       the very next frame. Cancelling stops it; see `smoothScrollTo`.

       Capture phase so this lands before Lenis's own handler, so the delta from
       this very event is applied on top of a scroller that has already stood
       down. */
    function onUserInput() {
      detach();
      const cancel = cancelReveal;
      cancelReveal = null;
      cancel?.();
    }

    const beginAutoReveal = () => {
      const ph = currentIntroPhases();
      // Park in the middle of the hold. The iris is shut, the title has fully
      // faded up, and the push-in — which begins at `hold.end` — has not been
      // touched, so the viewer still gets to trigger the reveal into About
      // themselves. Landing exactly on `title.end` would leave no slack for the
      // scrub's overshoot; the hold exists precisely because nothing moves
      // across it.
      const target = ph.hold.start + (ph.hold.end - ph.hold.start) * 0.5;

      // Already there, or past it — the viewer scrolled during the film and has
      // seen the title. Dragging the page backwards would be worse than doing
      // nothing.
      if (window.scrollY >= target - 4) return;

      cancelReveal = smoothScrollTo(target, {
        duration: AUTO_REVEAL_DURATION_S,
        easing: AUTO_REVEAL_EASE,
        onComplete: () => {
          cancelReveal = null;
          detach();
        },
      });

      window.addEventListener('wheel', onUserInput, { capture: true, passive: true });
      window.addEventListener('touchstart', onUserInput, { capture: true, passive: true });
      window.addEventListener('keydown', onUserInput, true);
    };

    const unlock = () => {
      if (released) return;
      released = true;
      document.body.style.overflow = '';
      revealTimer = window.setTimeout(beginAutoReveal, AUTO_REVEAL_DELAY_MS);
    };

    // Rely on the native 'ended' event so the handover is EXACTLY the last frame
    video.addEventListener('ended', unlock);

    // Fallback, if 'ended' never fires. Armed off whatever is actually left to
    // play rather than off a duration captured at mount: `preload="auto"` does
    // not guarantee metadata is in by the time `startPlaying` flips, and the
    // old `video.duration || 12` meant an unmeasured film had its ending
    // guessed at 12s — which for this 18s cut would have fired the reveal
    // mid-shot and scrolled the page out from under the film.
    let fallbackTimer = 0;
    const armFallback = () => {
      if (released) return;
      window.clearTimeout(fallbackTimer);
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 12;
      const remaining = Math.max(0, duration - (video.currentTime || 0));
      fallbackTimer = window.setTimeout(unlock, Math.min((remaining + 0.75) * 1000, MAX_LOCK_MS));
    };
    video.addEventListener('loadedmetadata', armFallback);
    video.addEventListener('durationchange', armFallback);
    armFallback();

    return () => {
      video.removeEventListener('ended', unlock);
      video.removeEventListener('loadedmetadata', armFallback);
      video.removeEventListener('durationchange', armFallback);
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(revealTimer);
      detach();
      cancelReveal?.();
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
        autoPlay
        muted
        playsInline
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        onLoadedData={() => setIsLoaded(true)}
        onCanPlay={() => setIsLoaded(true)}
        onPlay={() => setIsLoaded(true)}
        onPlaying={() => setIsLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover z-10 transform-gpu transition-opacity duration-300 ease-in-out ${
          isLoaded && (fadeInDone || startPlaying) ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </section>
  );
}

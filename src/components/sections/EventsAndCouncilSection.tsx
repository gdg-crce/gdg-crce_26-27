'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
// Wall placements and the poster artwork both come from eventData now — the
// mobile carousel used to carry its own copy of the list, which is how the two
// views ended up showing different posters for the same four events.
import { events, mobileEvents } from './events/eventData';
import { councilMembers, membersByTeam } from './council/councilData';
import WindowsXPDesktop from './council/WindowsXPDesktop';
import Y2KArchiveSystem from './council/Y2KArchiveSystem';
import WindowsPictureViewer from './council/WindowsPictureViewer';
import MemberPhoto from './council/MemberPhoto';
import { ik, ikUrl } from '@/lib/imagekit';
import { COUNCIL_CLIPS } from '@/lib/media';
import './council/council.css';

/**
 * The Like / Comment / Share row under a post.
 *
 * Purely cosmetic. Nothing here posts, counts or persists — the point is that
 * a tap looks like it landed. `Like` latches (blue, filled, "Liked"); the other
 * two flash for a beat and fall back, because there is nothing for them to
 * latch to. State is per-instance, so one post's Like cannot light up another's.
 */
function FbActionBar() {
  const [liked, setLiked] = React.useState(false);
  const [flash, setFlash] = React.useState<'comment' | 'share' | null>(null);
  const flashTimer = React.useRef<number | null>(null);

  const pulse = React.useCallback((which: 'comment' | 'share') => {
    setFlash(which);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 420);
  }, []);

  React.useEffect(() => () => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
  }, []);

  return (
    <div className="fb-post-actions">
      <button
        type="button"
        className={`fb-action-btn${liked ? ' is-liked' : ''}`}
        aria-pressed={liked}
        onClick={() => setLiked((v) => !v)}
      >
        <span className="btn-icon">
          {/* Icon colour comes from state rather than a stylesheet rule, so it
              cannot be out-specified by the button's own !important colour. */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={liked ? '#1877f2' : '#1b3a70'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ fill: liked ? '#1877f2' : '#1b3a70' }}>
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM6 11H3v10h3V11z" />
          </svg>
        </span>
        {liked ? 'Liked' : 'Like'}
      </button>
      <div className="fb-action-separator" />
      <button
        type="button"
        className={`fb-action-btn${flash === 'comment' ? ' is-flashing' : ''}`}
        onClick={() => pulse('comment')}
      >
        <span className="btn-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1d3a70" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ fill: '#1b3a70' }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        Comment
      </button>
      <div className="fb-action-separator" />
      <button
        type="button"
        className={`fb-action-btn${flash === 'share' ? ' is-flashing' : ''}`}
        onClick={() => pulse('share')}
      >
        <span className="btn-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4a3b8c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ fill: '#5856d6' }}>
            <path d="M15 8V4l9 8-9 8v-4C4 16 2 20 2 20c0-6 2-12 13-12z" />
          </svg>
        </span>
        Share
      </button>
    </div>
  );
}

/* Dynamically import the R3F scene — no SSR for WebGL */
const WallScene = dynamic(() => import('@/components/three/WallScene'), {
  ssr: false,
  loading: () => (
    <div className="events-loading">
      <span className="events-loading-text">LOADING THE STREET ARCHIVE</span>
      <span className="events-loading-dots">...</span>
    </div>
  ),
});

function THREE_MATH_LERP(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/* ─────────────────────────────────────────────────────────────────────────────
   The desktop pin's scroll budget, in px, as three consecutive stretches.

   ACT3_LEN is the council choreography, and it is the ruler every threshold in
   the scroll callback is written against — `0.26` still means "26% of the walk
   to the gallery", exactly as it did when the pin was 11000px and nothing
   followed it. Appending scroll to the pin therefore cannot desync a single one
   of those tuned numbers; see the re-normalisation in `onUpdate`.

   GALLERY_HOLD is the fix for "the last component is never properly seen". The
   Picture and Fax Viewer finishes opening at ACT3_LEN, and then NOTHING moves
   for this many pixels — no fade, no cover, no shutdown. Before it existed the
   viewer reached full opacity 110px before the pin ended, with the shutdown
   already 77% opaque on top of it, so the gallery was never once on screen
   unobscured.

   SHUTDOWN_LEN is the power-off, and it runs INSIDE this pin deliberately. That
   is what makes "no scroll-up, at any cost" structural instead of a cover-up:
   this pin is the last thing in the document, so its end is also the document's
   maximum scroll. The XP desktop cannot scroll away because there is no scroll
   left for it to scroll into. Nothing is being hidden — there is nothing to
   hide. Adding any in-flow element after this section breaks that guarantee.
   ───────────────────────────────────────────────────────────────────────────── */
const ACT3_LEN = 11000;
const GALLERY_HOLD = 2400;
const SHUTDOWN_LEN = 1600;
const PIN_LEN = ACT3_LEN + GALLERY_HOLD + SHUTDOWN_LEN;

export interface EventsAndCouncilSectionProps {
  /**
   * ShutdownTransition parks its draw function here.
   *
   * The shutdown used to own a second ScrollTrigger anchored to its own spacer,
   * which meant two clocks: this one lagged by `scrub: 0.8`, that one instant,
   * and the overlay ran ahead of the gallery under any real scroll velocity. It
   * also meant the shutdown's start position was measured against a document
   * that did not yet contain this pin's 11720px spacer, which is how it ended up
   * playing back over the events wall.
   *
   * Calling it from this callback removes both problems by construction: one
   * trigger, one scrub, one scalar. Left null on mobile, which has no XP desktop
   * to switch off and anchors the shutdown to its own spacer instead.
   */
  shutdownDrawRef?: React.MutableRefObject<((p: number) => void) | null>;
}

/**
 * EventsAndCouncilSection — Unified Master Choreography Section
 * Upgraded with !important Bliss grid scanlines, 3D carved grass text, and the
 * IE6 TheFacebook council archive window.
 *
 *
 * Manages the single continuous ScrollTrigger across the entire experience:
 * 1. 0.00 -> 0.26: Alleyway walk from poster #1 (CRCE HACK) to #9 (TECH TALKS).
 * 2. 0.26 -> 0.32: Dwell on poster #9 (TECH TALKS) in 100% fullscreen.
 * 3. 0.32 -> 0.42: Windowize (3D wall shrinks center-out into Windows Media Player frame, revealing XP Desktop).
 * 4. 0.42 -> 0.50: Minimize (window genies down into bottom Windows XP taskbar).
 * 5. 0.48 -> 0.55: Archive Reveal (IE6 TheFacebook council window fades in centered).
 * 6. 0.55 -> 0.93: Council Archive holds centered (TheFacebook profile: pinned people + social grid).
 * 7. 0.93 -> 0.96: Archive Minimize (IE6 window genies down into taskbar).
 * 8. 0.96 -> 1.00: Grand Finale (Windows Picture and Fax Viewer pops up with group photo).
 */
export default function EventsAndCouncilSection({
  shutdownDrawRef,
}: EventsAndCouncilSectionProps = {}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<number>(0);
  const archiveScrollRef = useRef<number>(0);
  const pvScrollProgressRef = useRef<number>(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const eventsWindowRef = useRef<HTMLDivElement>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const pictureViewerRef = useRef<HTMLDivElement>(null);
  const activeEventRef = useRef(0);
  const carouselTrackRef = useRef<HTMLDivElement>(null);
  /* HUD readout, written straight to the DOM.
     An `activeEvent` state used to be set roughly once per poster as the camera
     walked. Each of those re-rendered THIS component — and this component's
     subtree is the whole R3F scene graph, the TheFacebook archive and the
     picture viewer. React reconciling several hundred three.js nodes to change
     a two-digit counter is the stall you feel on entering the act, in either
     direction, because the walk runs at both ends of the pin. Only three text
     nodes ever read that value, so it takes three refs instead. (The mobile
     carousel wrote the same state and NOTHING read it — that one was pure
     waste; it keeps `activeEventRef` alone.) */
  const eventNumRef = useRef<HTMLSpanElement>(null);
  const eventTitleRef = useRef<HTMLSpanElement>(null);
  const eventSubtitleRef = useRef<HTMLSpanElement>(null);
  const mobileBadgeRef = useRef<HTMLDivElement>(null);
  const mobileTitleRef = useRef<HTMLHeadingElement>(null);
  const mobileSubtitleRef = useRef<HTMLParagraphElement>(null);
  const mobileDotsRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mobileStRef = useRef<any>(null);
  const [activeMemberIndex, setActiveMemberIndex] = useState(0);
  const [mobileActiveIdx, setMobileActiveIdx] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState<string>('All Tracks');
  const [isEventsMinimized, setIsEventsMinimized] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'posts' | 'about' | 'photos' | 'videos'>('posts');
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(0);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fixedHeight, setFixedHeight] = useState<string>('100vh');


  /* Read by the scroll callback instead of the state value.

     This flag used to be a dependency of the effect that builds the pinned
     ScrollTrigger, so clicking the taskbar's .avi button KILLED the pin and
     built a new one — mid-scroll, halfway through an 14.5k-pixel pin. A pinned
     ScrollTrigger re-measures the document and re-applies its pin spacer on
     creation, so tearing one down while the user is inside it can shift the
     scroll position under them and leaves every layer holding whatever inline
     styles the old instance last wrote, with no tick scheduled to correct them.
     That is a good candidate for "coming back up from the council, the events
     section sometimes doesn't show".

     The trigger is now built exactly once per layout mode. The toggle writes
     here and calls ScrollTrigger.update(), which re-runs the callback below
     against the live flag — same result, no teardown. */
  const isEventsMinimizedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setFixedHeight(`${window.innerHeight}px`);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredMembers = useMemo(() => {
    if (selectedTeam === 'All Tracks') return councilMembers;
    return membersByTeam(selectedTeam as import('./council/councilData').Department);
  }, [selectedTeam]);

  const handleSelectTeam = useCallback((team: string) => {
    setSelectedTeam(team);
    setActiveMemberIndex(0);
  }, []);

  const handleToggleEventsMinimize = useCallback(() => {
    setIsEventsMinimized((prev) => {
      const next = !prev;
      // The callback reads the ref, so update it here rather than waiting for
      // the render+effect round trip, then re-run the callback against it.
      isEventsMinimizedRef.current = next;
      ScrollTrigger.update();
      return next;
    });
  }, []);

  useEffect(() => {
    // Apply initial classes that GSAP might mutate so React doesn't overwrite them
    if (eventsWindowRef.current && !eventsWindowRef.current.classList.contains('xp-events-transition-window')) {
      eventsWindowRef.current.classList.add('xp-events-transition-window');
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    gsap.registerPlugin(ScrollTrigger);

    if (isMobile) {
      const track = carouselTrackRef.current;
      if (!track) return;

      const cardItems = track.querySelectorAll<HTMLElement>('.mobile-event-card-item');
      const totalCards = mobileEvents.length;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let scrollTriggerInstance: any;

      let rafId = 0;
      const updateCardPositions = (p: number) => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          rafId = 0; // Crucial fix: reset rAF handle so scroll ticks are never blocked!
          const normP = Math.min(1, Math.max(0, p));
          const floatIndex = normP * (totalCards - 1);
          const activeIdx = Math.min(totalCards - 1, Math.round(floatIndex));
          // Only on a real change: this ran on every scroll tick and re-rendered
          // the whole act each frame. The buttons are the only reader.
          setMobileActiveIdx((prev) => (prev === activeIdx ? prev : activeIdx));

          // Update HUD text without triggering React state re-renders
          if (mobileBadgeRef.current) {
            mobileBadgeRef.current.textContent = `0${activeIdx + 1} / 0${totalCards} · EVENT SECTION`;
          }
          if (mobileTitleRef.current && mobileTitleRef.current.textContent !== mobileEvents[activeIdx].title) {
            mobileTitleRef.current.textContent = mobileEvents[activeIdx].title;
          }
          if (mobileSubtitleRef.current && mobileSubtitleRef.current.textContent !== mobileEvents[activeIdx].subtitle) {
            mobileSubtitleRef.current.textContent = mobileEvents[activeIdx].subtitle;
          }

          // Update dot indicator pills
          if (mobileDotsRef.current) {
            const dots = mobileDotsRef.current.querySelectorAll('.mobile-event-dot');
            dots.forEach((d, i) => {
              d.classList.toggle('active', i === activeIdx);
            });
          }

          // Redesigned 3D Card Stack Swipe Deck — Continuous, responsive & symmetrical in forward & reverse scroll
          cardItems.forEach((card, idx) => {
            const diff = idx - floatIndex;

            if (diff < 0) {
              // Passed poster: smooth vertical 3D swipe off top of stack
              const passed = Math.min(1, Math.max(0, -diff));
              const yPercent = -passed * 125;
              const rotateZ = -passed * 10;
              const rotateX = passed * 12;
              const scale = 1.0 - passed * 0.04;
              const opacity = Math.max(0, 1 - passed * 1.25);

              gsap.set(card, {
                xPercent: 0,
                yPercent: yPercent,
                z: passed * 60,
                rotateY: 0,
                rotateX: rotateX,
                rotateZ: rotateZ,
                scale: scale,
                opacity: opacity,
                filter: 'none',
                zIndex: 50 - Math.round(passed * 10),
                pointerEvents: 'none',
                force3D: true,
                transformPerspective: 1000,
              });
            } else {
              // Active & upcoming posters: 3D Stack underneath
              const depth = Math.min(3, diff);
              const scale = 1.0 - depth * 0.07;
              const yPercent = depth * 14;
              const rotateZ = (idx % 2 === 0 ? 1 : -1) * depth * 2.5;
              const opacity = depth > 2.2 ? Math.max(0, 1 - (depth - 2.2) * 1.2) : 1;

              gsap.set(card, {
                xPercent: 0,
                yPercent: yPercent,
                z: -depth * 60,
                rotateY: 0,
                rotateX: 0,
                rotateZ: rotateZ,
                scale: scale,
                opacity: opacity,
                filter: 'none',
                zIndex: 30 - Math.round(depth * 5),
                pointerEvents: diff < 0.4 ? 'auto' : 'none',
                force3D: true,
                transformPerspective: 1000,
              });
            }
          });
        });
      };

      /* Lead-in hold. The viewer arrives here mid-flick from What We Do, and
         the pin used to start advancing on the very first pixel — so the
         momentum left over from that flick carried card 1 away before it had
         been seen. This buys the deck a stationary beat: the section pins,
         card 1 sits still for HOLD_VH of scroll while the fling bleeds off,
         and only then does the deck start turning. */
      const HOLD_VH = 0.7;
      const holdPx = () => window.innerHeight * HOLD_VH;
      const cardsPx = () => (totalCards - 1) * window.innerHeight;
      /** Pin progress -> deck progress, with the hold mapped out of the front. */
      const deckProgress = (raw: number) => {
        const hold = holdPx();
        const total = hold + cardsPx();
        if (total <= 0) return 0;
        const holdFrac = hold / total;
        if (holdFrac >= 1) return 0;
        // updateCardPositions clamps, so a negative here simply reads as 0.
        return (raw - holdFrac) / (1 - holdFrac);
      };

      const initScrollTrigger = () => {
        const anim = gsap.to(
          {},
          {
            duration: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: sectionRef.current,
              pin: containerRef.current,
              anticipatePin: 1,
              start: 'top top',
              end: () => `+=${holdPx() + cardsPx()}`,
              scrub: 0.35,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                updateCardPositions(deckProgress(self.progress));
              },
              /* Same reason the desktop branch has one: a refresh, a restored
                 scroll position or a fast scroll across the whole range can
                 leave the pin active with no update ever firing, and the cards
                 keep whatever the last tick wrote. */
              onRefresh: (self) => {
                updateCardPositions(deckProgress(self.progress));
              },
            },
          }
        );
        scrollTriggerInstance = anim;
        mobileStRef.current = anim;

        // Position cards immediately on mount
        updateCardPositions(0);
      };

      const timeoutId = setTimeout(() => {
        initScrollTrigger();
        ScrollTrigger.refresh();
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        if (scrollTriggerInstance?.scrollTrigger) {
          scrollTriggerInstance.scrollTrigger.kill();
          scrollTriggerInstance.kill();
        }
        mobileStRef.current = null;
      };
    } else {
      /* THE SINGLE SOURCE OF TRUTH FOR WHAT IS ON SCREEN.
         ─────────────────────────────────────────────────────────────────────
         Everything this act shows — the events window's opacity, visibility and
         transform, the archive, the picture viewer, the camera's position along
         the wall — lives ONLY as inline styles written from here. Nothing else
         in the component ever writes them.

         That used to be `onUpdate`'s body, and being reachable ONLY from
         `onUpdate` is what made the section intermittently come up blank. The
         DOM was correct only if a scroll tick had happened to fire at the
         current position; arrive any other way and the elements kept whatever
         the LAST tick wrote. If that was somewhere in the council, the events
         window is still sitting at `opacity: 0; visibility: hidden` — a section
         that "doesn't load".

         There are several ways in with no tick, which is why it was rare rather
         than never, and why it hit entering from the album AND reversing back
         from the council:

           · ScrollTrigger.refresh() — fired by a resize, a late font or image,
             and explicitly on a 150ms timer below. A refresh rebuilds the pin
             and can restore the scroll position without producing an update.
           · the pin being created or rebuilt at all.
           · the browser restoring a scroll position on reload.
           · a fast scroll that crosses the trigger's whole active range between
             two ticks — exactly the "sometimes, on a quick move" case.

         The body was already a pure function of progress — every branch sets
         every property it touches, and the two guarded bits (`phase`, the HUD
         text) compare before writing — so it is safe and idempotent to call as
         often as we like. It now runs on refresh and once at setup as well.
         This costs nothing per frame: it is the same code on the same tick, plus
         a handful of discrete calls. */
      const applyProgress = (progress: number) => {
          /* One clock, two rulers.
             `px` is the position along the whole pin. `p` re-normalises it onto
             the council choreography so every threshold below is still a
             fraction of ACT3_LEN and none of them had to move. It saturates at
             1 for the gallery hold and the shutdown, which is precisely what
             leaves the Picture and Fax Viewer open and motionless underneath
             them instead of still fading in while the screen goes dark. */
          const px = progress * PIN_LEN;
          const p = Math.min(1, px / ACT3_LEN);

          // 0 walking · 1 dwelling on the last poster · 2 windowed · 3 minimized
          const nextPhase = p >= 0.5 ? 3 : p >= 0.32 ? 2 : p >= 0.26 ? 1 : 0;
          if (nextPhase !== phaseRef.current) {
            phaseRef.current = nextPhase;
            setPhase(nextPhase);
          }

          /* ── Phase 1: Alleyway Walk (0.00 -> 0.32) ───────────────────────── */
          const WALK_START_DWELL = 0.07; // Distinct arrival pause (~770px scroll) on Poster #1 before camera walk starts
          const WALK_END = 0.32;
          const FIRST_POSTER_P = 0.018; // Camera position centered dead-on Poster #1 (-23.15 -> lookAt -22.5)
          const LAST_POSTER_P = 0.968;

          let camP = FIRST_POSTER_P;
          let walkFraction = 0;
          if (p <= WALK_START_DWELL) {
            camP = FIRST_POSTER_P;
            walkFraction = 0;
          } else if (p < WALK_END) {
            walkFraction = (p - WALK_START_DWELL) / (WALK_END - WALK_START_DWELL);
            camP = FIRST_POSTER_P + walkFraction * (LAST_POSTER_P - FIRST_POSTER_P);
          } else {
            walkFraction = 1;
            camP = LAST_POSTER_P;
          }
          progressRef.current = camP;

          if (progressBarRef.current) {
            progressBarRef.current.style.width = `${walkFraction * 100}%`;
          }

          const cameraX = THREE_MATH_LERP(-24, 23, camP);
          let closest = 0;
          let minDist = Infinity;
          events.forEach((e, i) => {
            const dist = Math.abs(e.position[0] - cameraX);
            if (dist < minDist) {
              minDist = dist;
              closest = i;
            }
          });

          if (closest !== activeEventRef.current) {
            activeEventRef.current = closest;
            const evt = events[closest];
            if (eventNumRef.current) {
              eventNumRef.current.textContent = String(closest + 1).padStart(2, '0');
            }
            if (eventTitleRef.current) eventTitleRef.current.textContent = evt?.title ?? '';
            if (eventSubtitleRef.current) eventSubtitleRef.current.textContent = evt?.subtitle ?? '';
          }

          /* ── Phase 2 -> 4: Dwell, Windowize & Minimize (0.32 -> 0.50) ────── */
          const DWELL_END = 0.36;
          const WINDOW_END = 0.44;
          const MINIMIZE_END = 0.50;
          const WINDOW_SCALE = 0.66;

          if (eventsWindowRef.current) {
            const titlebar = eventsWindowRef.current.querySelector(
              '.xp-titlebar'
            ) as HTMLElement | null;
            const showChrome = (on: boolean) => {
              if (on) {
                eventsWindowRef.current!.classList.add('is-windowed');
                if (titlebar) {
                  titlebar.style.opacity = '1';
                  titlebar.style.height = '30px';
                }
              } else {
                eventsWindowRef.current!.classList.remove('is-windowed');
                if (titlebar) {
                  titlebar.style.opacity = '0';
                  titlebar.style.height = '0px';
                }
              }
            };

            if (p < DWELL_END) {
              // Fullscreen alleyway walk & hold — reset minimized state on reverse scroll
              isEventsMinimizedRef.current = false;
              eventsWindowRef.current.style.transform = 'translate3d(0, 0, 0) scale(1)';
              eventsWindowRef.current.style.opacity = '1';
              eventsWindowRef.current.style.pointerEvents = 'auto';
              showChrome(false);
            } else if (p < WINDOW_END) {
              // Reset minimized on reverse scroll so window re-appears cleanly
              isEventsMinimizedRef.current = false;
              const rawT = (p - DWELL_END) / (WINDOW_END - DWELL_END);
              const t = rawT * rawT * (3 - 2 * rawT);
              const scale = 1.0 - t * (1.0 - WINDOW_SCALE);
              eventsWindowRef.current.style.transform = `translate3d(0, 0, 0) scale(${scale.toFixed(4)})`;
              eventsWindowRef.current.style.opacity = '1';
              eventsWindowRef.current.style.pointerEvents = 'auto';
              showChrome(t > 0.10);
            } else if (p < MINIMIZE_END && !isEventsMinimizedRef.current) {
              // Genie window down/left into Windows XP taskbar with smooth easing
              const rawT = (p - WINDOW_END) / (MINIMIZE_END - WINDOW_END);
              const t = rawT * rawT * (3 - 2 * rawT);
              const scale = WINDOW_SCALE * (1.0 - t * 0.95);
              const translateY = t * 46; // vh down to taskbar
              const translateX = t * -26; // vw left to .avi taskbar item
              const op = Math.max(0, 1.0 - Math.pow(rawT, 1.6));
              eventsWindowRef.current.style.transform = `translate3d(${translateX.toFixed(2)}vw, ${translateY.toFixed(2)}vh, 0) scale(${scale.toFixed(4)})`;
              eventsWindowRef.current.style.opacity = op.toFixed(3);
              eventsWindowRef.current.style.pointerEvents = 'none';
              showChrome(true);
            } else {
              eventsWindowRef.current.style.opacity = '0';
              eventsWindowRef.current.style.pointerEvents = 'none';
            }

            eventsWindowRef.current.style.visibility =
              parseFloat(eventsWindowRef.current.style.opacity || '1') > 0.001 ? 'visible' : 'hidden';
          }

          /* ── Phase 5 -> Phase 7: Student Council TheFacebook Archive Window (0.45 -> 0.96) ── */
          const MEMBERS_START = 0.57;
          const MEMBERS_END = 0.93;
          const ARCHIVE_MIN_START = 0.93;
          const ARCHIVE_MIN_END = 0.96;

          if (playerWrapperRef.current) {
            if (p < 0.45) {
              playerWrapperRef.current.style.opacity = '0';
              playerWrapperRef.current.style.pointerEvents = 'none';
              playerWrapperRef.current.style.transform = 'translate3d(0, 46vh, 0) scale(0.1)';
            } else if (p < MEMBERS_START) {
              const rawT = Math.min(1, Math.max(0, (p - 0.45) / 0.12));
              const t = 1 - Math.pow(1 - rawT, 3); // Cubic ease-out pop up
              const scale = 0.1 + t * 0.9;
              const translateY = (1 - t) * 46;
              playerWrapperRef.current.style.opacity = '1';
              playerWrapperRef.current.style.pointerEvents = t > 0.5 ? 'auto' : 'none';
              playerWrapperRef.current.style.transform = `translate3d(0, ${translateY.toFixed(2)}vh, 0) scale(${scale.toFixed(4)})`;
            } else if (p <= MEMBERS_END) {
              // TheFacebook archive window holds centered through this scroll range.
              playerWrapperRef.current.style.opacity = '1';
              playerWrapperRef.current.style.pointerEvents = 'auto';
              playerWrapperRef.current.style.transform = 'translate3d(0, 0, 0) scale(1)';
              const scrollStart = MEMBERS_START;
              const scrollEnd = MEMBERS_END;
              archiveScrollRef.current = Math.min(1, Math.max(0, (p - scrollStart) / (scrollEnd - scrollStart)));
            } else if (p < ARCHIVE_MIN_END) {
              // Genie minimize animation down into bottom taskbar
              const rawT = (p - ARCHIVE_MIN_START) / (ARCHIVE_MIN_END - ARCHIVE_MIN_START);
              const t = rawT * rawT * (3 - 2 * rawT);
              const scale = 1.0 - t * 0.9;
              const translateY = t * 46; // vh down to taskbar
              playerWrapperRef.current.style.transform = `translate3d(0, ${translateY.toFixed(2)}vh, 0) scale(${scale.toFixed(4)})`;
              playerWrapperRef.current.style.opacity = `${(1.0 - t * 0.9).toFixed(3)}`;
              playerWrapperRef.current.style.pointerEvents = 'none';
            } else {
              playerWrapperRef.current.style.opacity = '0';
              playerWrapperRef.current.style.pointerEvents = 'none';
              playerWrapperRef.current.style.transform = 'translate3d(0, 46vh, 0) scale(0.1)';
            }

            playerWrapperRef.current.style.visibility =
              parseFloat(playerWrapperRef.current.style.opacity || '1') > 0.001 ? 'visible' : 'hidden';
          }

          /* ── Phase 8: Windows Picture and Fax Viewer Grand Finale (0.96 -> 1.00) ── */
          const PV_START = 0.96;
          if (px <= 12200) {
            pvScrollProgressRef.current = 0;
          } else if (px >= 12800) {
            pvScrollProgressRef.current = 1;
          } else {
            pvScrollProgressRef.current = (px - 12200) / (12800 - 12200);
          }

          if (pictureViewerRef.current) {
            if (p < PV_START) {
              pictureViewerRef.current.style.opacity = '0';
              pictureViewerRef.current.style.pointerEvents = 'none';
              pictureViewerRef.current.style.transform = 'translate3d(0, 25px, 0) scale(0.85)';
            } else {
              const rawT = Math.min(1, (p - PV_START) / 0.03);
              const pvT = 1 - Math.pow(1 - rawT, 3); // Cubic ease-out
              const scale = 0.85 + pvT * 0.15;
              const translateY = (1 - pvT) * 25;
              pictureViewerRef.current.style.opacity = `${pvT.toFixed(3)}`;
              pictureViewerRef.current.style.pointerEvents = pvT > 0.4 ? 'auto' : 'none';
              pictureViewerRef.current.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
            }

            pictureViewerRef.current.style.visibility =
              parseFloat(pictureViewerRef.current.style.opacity || '1') > 0.001 ? 'visible' : 'hidden';
          }

          /* ── Phase 9: hand the tail of the pin to the shutdown ─────────────
             Stays at 0 for the whole of ACT3_LEN and for GALLERY_HOLD after
             it — the gallery gets its dwell with nothing on top of it — then
             runs 0 → 1 over the last SHUTDOWN_LEN px. Same tick, same scrub,
             same scalar as everything above, so the overlay physically cannot
             start before the last component has been sitting there in the
             clear. Driving it from here rather than from a second trigger is
             the whole point; see EventsAndCouncilSectionProps. */
          if (shutdownDrawRef) {
            const sp = (px - ACT3_LEN - GALLERY_HOLD) / SHUTDOWN_LEN;
            shutdownDrawRef.current?.(Math.min(1, Math.max(0, sp)));
          }
      };

      const trigger = ScrollTrigger.create({
        trigger: sectionRef.current,
        pin: containerRef.current,
        start: 'top top',
        end: `+=${PIN_LEN}`,
        scrub: 0.8,
        onUpdate: (self) => applyProgress(self.progress),
        /* The fix for the blank section. A refresh re-measures and can restore
           the scroll position without ever producing an update tick, so without
           this the DOM keeps the styles from wherever the user last WAS. */
        onRefresh: (self) => applyProgress(self.progress),
      });

      /* And once now, so the section is correct from the moment the trigger
         exists rather than from the first time the user happens to move. */
      applyProgress(trigger.progress);

      const timeout = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 150);

      return () => {
        clearTimeout(timeout);
        trigger.kill();
      };
    }
    // `isEventsMinimized` is deliberately NOT a dependency — see the note on
    // isEventsMinimizedRef. Rebuilding a pinned trigger mid-scroll is the bug,
    // not the fix.
  }, [isMobile, mounted, shutdownDrawRef]);


  const handleTabChange = useCallback((tab: 'posts' | 'about' | 'photos' | 'videos') => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as { __isSwitchingCouncilTab?: boolean };
      win.__isSwitchingCouncilTab = true;

      const councilSection = document.getElementById('mobile-council');
      const targetY = councilSection
        ? Math.round(councilSection.getBoundingClientRect().top + window.scrollY)
        : null;

      if (councilSection && targetY !== null) {
        // Prevent DOM collapse/clamping: lock minHeight temporarily to current height
        const currentH = councilSection.offsetHeight;
        councilSection.style.minHeight = `${Math.max(currentH, window.innerHeight * 1.5)}px`;

        window.scrollTo({
          top: targetY,
          behavior: 'instant' as ScrollBehavior,
        });
        document.documentElement.scrollTop = targetY;
        document.body.scrollTop = targetY;
      }

      setActiveMobileTab(tab);

      if (councilSection && targetY !== null) {
        requestAnimationFrame(() => {
          window.scrollTo({
            top: targetY,
            behavior: 'instant' as ScrollBehavior,
          });
          document.documentElement.scrollTop = targetY;
          document.body.scrollTop = targetY;

          requestAnimationFrame(() => {
            window.scrollTo({
              top: targetY,
              behavior: 'instant' as ScrollBehavior,
            });
            // Release the minHeight lock once new tab content is rendered
            councilSection.style.minHeight = '';
            ScrollTrigger.refresh();
          });
        });

        setTimeout(() => {
          window.scrollTo({
            top: targetY,
            behavior: 'instant' as ScrollBehavior,
          });
          win.__isSwitchingCouncilTab = false;
        }, 120);
      }
    } else {
      setActiveMobileTab(tab);
    }
  }, []);

  const handleCardTap = useCallback((index: number) => {
    if (mobileStRef.current?.scrollTrigger) {
      const st = mobileStRef.current.scrollTrigger;
      const nextIdx = (index + 1) % mobileEvents.length;
      const targetY = st.start + (nextIdx / (mobileEvents.length - 1)) * (st.end - st.start);
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  }, []);

  const handleDotClick = useCallback((index: number) => {
    if (mobileStRef.current?.scrollTrigger) {
      const st = mobileStRef.current.scrollTrigger;
      const targetY = st.start + (index / (mobileEvents.length - 1)) * (st.end - st.start);
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  }, []);

  if (mounted && isMobile) {
    return (
      <div className="mobile-unified-container">
        {/* Mobile Event Section (3D Street Deck Peel & Flip Showcase) */}
        <section
          ref={sectionRef}
          id="events"
          className="mobile-event-section-wrapper"
          style={{ position: 'relative', width: '100%' }}
        >
          <div
            ref={containerRef}
            className="mobile-events-stage"
            style={{
              height: fixedHeight,
            }}
          >
            {/* Dynamic HUD Header */}
            <div className="mobile-events-header">
              <div ref={mobileBadgeRef} className="mobile-events-badge">
                01 / 0{mobileEvents.length} · EVENT SECTION
              </div>
              <h2 ref={mobileTitleRef} className="mobile-events-title">
                {mobileEvents[0].title}
              </h2>
              <p ref={mobileSubtitleRef} className="mobile-events-subtitle">
                {mobileEvents[0].subtitle}
              </p>
            </div>

            {/* 3D Central Poster Deck */}
            <div
              ref={carouselTrackRef}
              className="mobile-events-deck"
            >
              {mobileEvents.map((evt, idx) => (
                <div
                  key={evt.id}
                  className="mobile-event-card-item"
                  data-index={idx}
                  onClick={() => handleCardTap(idx)}
                >
                  <div className="mobile-event-card-frame">
                    <div className="mobile-event-tag-badge">GDG EVENT</div>
                    <Image
                      src={ik(evt.posterImage)}
                      alt={evt.title}
                      className="mobile-event-poster-img"
                      width={1574}
                      height={1574}
                      sizes="(max-width: 400px) 90vw, 380px"
                      draggable={false}
                      priority={idx < 2}
                    />
                    <div className="mobile-event-poster-sheen" />
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Controls / Pill Indicator & Prev/Next Taps */}
            <div className="mobile-events-footer">
              <div className="mobile-events-nav-row">
                <button
                  type="button"
                  className="mobile-events-nav-btn"
                  onClick={() => handleDotClick(Math.max(0, mobileActiveIdx - 1))}
                  aria-label="Previous Event"
                >
                  ‹ PREV
                </button>
                <div ref={mobileDotsRef} className="mobile-events-pills">
                  {mobileEvents.map((evt, idx) => (
                    <button
                      key={evt.id}
                      type="button"
                      className={`mobile-event-dot ${idx === 0 ? 'active' : ''}`}
                      onClick={() => handleDotClick(idx)}
                      aria-label={`Jump to event ${idx + 1}: ${evt.title}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="mobile-events-nav-btn"
                  onClick={() => handleDotClick(Math.min(mobileEvents.length - 1, mobileActiveIdx + 1))}
                  aria-label="Next Event"
                >
                  NEXT ›
                </button>
              </div>
              <div className="mobile-events-hint">SCROLL OR TAP TO FLIP ARCHIVE</div>
            </div>

            {/* Film overlays */}
            <div className="events-scanlines" />
            <div className="events-grain" />
            <div className="events-vignette" />

            {/* Grunge vignette borders */}
            <div className="events-grunge-top" />
          </div>
        </section>

        {/* Mobile Council Section (HTML list feed layout below events) */}
        <section
          id="mobile-council"
          className="mobile-council-section"
          aria-label="GDG CRCE Student Council 2026-27 — Mobile Experience"
        >
        {/* Sticky Mobile Header (Facebook style) */}
        <div className="mobile-header-sticky">
          {/* Cover Photo / Banner */}
          <div className="fb-cover-photo-wrapper">
            <div
              className="fb-cover-photo"
              style={{
                backgroundImage: ikUrl('/events/eventsmobbg.png'),
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <div className="fb-cover-content">
                <span className="fb-cover-text">GDG CRCE 26-27</span>
                <span className="fb-cover-subtext">Google Developers Group</span>
              </div>
            </div>
          </div>

          {/* Profile Header Block */}
          <div className="fb-profile-header">
            <div className="fb-avatar-row">
              <div className="fb-profile-avatar-container">
                <Image src="/logo.png" className="fb-profile-logo" alt="GDG Logo" width={612} height={408} sizes="72px" />
              </div>
              <div className="fb-profile-header-meta">
                <h1 className="fb-profile-name">
                  GDG FRCRCE
                  <span className="fb-verified-badge" title="Verified Group">✓</span>
                </h1>
              </div>
            </div>

            {/* Profile Navigation Tabs (Posts, About, Videos, Photos) */}
            <div className="fb-profile-tabs-menu">
              <button
                type="button"
                className={`fb-tab-item ${activeMobileTab === 'posts' ? 'active' : ''}`}
                onClick={() => handleTabChange('posts')}
              >
                Posts
              </button>
              <button
                type="button"
                className={`fb-tab-item ${activeMobileTab === 'about' ? 'active' : ''}`}
                onClick={() => handleTabChange('about')}
              >
                About
              </button>
              <button
                type="button"
                className={`fb-tab-item ${activeMobileTab === 'photos' ? 'active' : ''}`}
                onClick={() => handleTabChange('photos')}
              >
                Photos
              </button>
              <button
                type="button"
                className={`fb-tab-item ${activeMobileTab === 'videos' ? 'active' : ''}`}
                onClick={() => handleTabChange('videos')}
              >
                Videos
              </button>
            </div>
          </div>
          <div className="fb-header-divider" />
        </div>

        {/* Scrollable post feed */}
        {activeMobileTab === 'posts' && (
          <div className="fb-feed-container">
            {/* Post 1: Welcome post from GDG CRCE */}
            <div className="fb-post-card pinned-post">
              {/* Post Header */}
              <div className="fb-post-header">
                <div className="fb-post-avatar page-avatar">
                  <Image src="/logo.png" className="fb-avatar-logo" alt="GDG Logo" width={612} height={408} sizes="48px" />
                </div>
                <div className="fb-post-author-info">
                  <span className="fb-post-author-name">
                    GDG CRCE
                    <span className="fb-verified-badge-small">✓</span>
                  </span>
                  <span className="fb-post-meta">Posted by GDG CRCE • Pinned Post • 🌐</span>
                </div>
              </div>

              {/* Post content */}
              <div className="fb-post-content">
                <p className="fb-post-text">
                  The team behind it all. GDG on Campus · CRCE Student Council 2026-27, together before the year begins. 🚀
                </p>
              </div>

              {/* Attached Photo */}
              <div className="fb-post-media-container">
                <Image src="/preloader/genesis.jpg" className="fb-post-img" alt="Genesis Welcome" width={1280} height={960} sizes="(max-width: 600px) 100vw, 500px" />
              </div>

              {/* Reactions summary */}
              <div className="fb-post-reactions-bar">
                <div className="fb-reaction-icons">
                  <span className="reaction-bubble blue-bubble">👍</span>
                  <span className="reaction-bubble red-bubble">❤️</span>
                </div>
                <span className="fb-reaction-text">Liked by GDG CRCE and 24 others</span>
              </div>

              <FbActionBar />

              {/* Comments block */}
              <div className="fb-comments-section">
                {/* Comment Input Box */}
                <div className="fb-comment-input-row">
                  <input type="text" className="fb-comment-input" placeholder="Write a comment..." readOnly />
                  <span className="comment-camera-icon">📷</span>
                </div>
              </div>
            </div>

            {/* Loop over actual council members */}
            {councilMembers.map((member) => (
              <div key={member.id} className="fb-post-card">
                {/* Post Header */}
                <div className="fb-post-header">
                  <MemberPhoto member={member} className="fb-post-avatar" />
                  <div className="fb-post-author-info">
                    <span className="fb-post-author-name">{member.name}</span>
                    <span className="fb-post-meta">
                      {member.role} • {member.branch} • {member.tier}
                    </span>
                  </div>
                </div>

                {/* Post content */}
                <div className="fb-post-content">
                  <p className="fb-post-text">{member.quote}</p>
                </div>

                {/* Attached Member Photo Card */}
                <div className="fb-post-media-container">
                  <MemberPhoto member={member} className="fb-post-member-card" size="full" />
                </div>

                {/* Reactions summary */}
                <div className="fb-post-reactions-bar">
                  <div className="fb-reaction-icons">
                    <span className="reaction-bubble blue-bubble">👍</span>
                    <span className="reaction-bubble yellow-bubble">😊</span>
                  </div>
                  <span className="fb-reaction-text">Liked by StuCo, Rotaract and 25 others</span>
                </div>

                <FbActionBar />

                {/* Comments Input */}
                <div className="fb-comments-section">
                  <div className="fb-comment-input-row">
                    <input type="text" className="fb-comment-input" placeholder="Write a comment..." readOnly />
                    <span className="comment-camera-icon">📷</span>
                  </div>
                </div>
              </div>
            ))}
            {/* End of Posts feed dwell card */}
            <div className="fb-feed-end-card">
              <div className="fb-feed-end-icon">✓</div>
              <div className="fb-feed-end-title">You&apos;re All Caught Up</div>
              <div className="fb-feed-end-subtitle">GDG CRCE Student Council 2026-27</div>
            </div>
          </div>
        )}

        {activeMobileTab === 'about' && (
          <div className="fb-feed-container">
            <div className="fb-post-card">
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#1877f2' }}>About GDG on Campus CRCE</h3>
              <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#4b4f56', marginBottom: '12px' }}>
                Google Developer Group on Campus at Fr. Conceicao Rodrigues College of Engineering is a vibrant community of tech enthusiasts, designers, and managers aiming to learn, collaborate, and build solutions together.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e5e6e9', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ fontWeight: 'bold', color: '#65676b' }}>Networks:</span>
                  <span style={{ color: '#1c1e21' }}>CRCE, Mumbai · GDG on Campus</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ fontWeight: 'bold', color: '#65676b' }}>Total Members:</span>
                  <span style={{ color: '#1c1e21' }}>{councilMembers.length} Members</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ fontWeight: 'bold', color: '#65676b' }}>Structure:</span>
                  <span style={{ color: '#1c1e21' }}>8 Tracks · Senior & Junior Council</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ fontWeight: 'bold', color: '#65676b' }}>Status:</span>
                  <span style={{ color: '#00a400', fontWeight: 'bold' }}>Online & Active</span>
                </div>
              </div>
            </div>
            {/* End of About feed dwell card */}
            <div className="fb-feed-end-card">
              <div className="fb-feed-end-icon">✓</div>
              <div className="fb-feed-end-title">You&apos;re All Caught Up</div>
              <div className="fb-feed-end-subtitle">GDG CRCE Student Council 2026-27</div>
            </div>
          </div>
        )}

        {activeMobileTab === 'photos' && (
          <div className="fb-feed-container">
            {/* Individual mobcouncil photo cards */}
            {[
              { src: '/mobcouncil/DSC04899 (1).JPG.jpeg', caption: 'Glimpses from the session 📸' },
              { src: '/mobcouncil/IMG20260330194828 (1).jpg.jpeg', caption: 'GDG CRCE team spirit! ✨' },
              { src: '/mobcouncil/IMG_5410 (1).JPG.jpeg', caption: 'Workshops and collabs 💻' },
              { src: '/mobcouncil/IMG_8447 (1).JPG.jpeg', caption: 'Moments captured 🌟' },
              { src: '/mobcouncil/IMG_8775 (1).JPG.jpeg', caption: 'Connecting & growing together 🚀' },
              { src: '/mobcouncil/IMG_8797 (1).JPG.jpeg', caption: 'Fun behind the scenes 🎬' },
              { src: '/mobcouncil/fxn 2026-03-25 132323CE9231BDFC83 (2).jpg.jpeg', caption: 'Events in action 🔥' },
              { src: '/mobcouncil/fxn 2026-03-25 135628A4842A32C689 (1).JPEG', caption: 'Tech talk vibes 🎙️' },
              { src: '/mobcouncil/fxn 2026-03-25 1401139FCE36B5FBA3 (1).JPEG', caption: 'Speaker sessions 📚' },
              { src: '/mobcouncil/image (4).png', caption: 'Designing and building 🎨' },
              { src: '/mobcouncil/image (5).png', caption: 'Innovating on campus 💡' },
              { src: '/mobcouncil/image (6).png', caption: 'Hackathon memories 🏆' },
              { src: '/mobcouncil/image (7).png', caption: 'Community meetups 🤝' },
              { src: '/mobcouncil/image (8).png', caption: 'Milestones achieved 🎉' },
              { src: '/mobcouncil/still2 (1).jpg.jpeg', caption: 'Till next time 👋' }
            ].map((p, idx) => (
              <div key={p.src} className="fb-post-card">
                <div className="fb-post-header">
                  <div className="fb-post-avatar page-avatar">
                    <Image src="/logo.png" className="fb-avatar-logo" alt="GDG Logo" width={612} height={408} sizes="48px" loading="lazy" />
                  </div>
                  <div className="fb-post-author-info">
                    <span className="fb-post-author-name">
                      GDG CRCE
                      <span className="fb-verified-badge-small">✓</span>
                    </span>
                    <span className="fb-post-meta">Posted • Photo {idx + 1} • 🌐</span>
                  </div>
                </div>
                <div className="fb-post-content">
                  <p className="fb-post-text">{p.caption}</p>
                </div>
                <div className="fb-post-media-container" style={{ position: 'relative', width: '100%', overflow: 'hidden', border: '1px solid #e5e6e9' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.src}
                    alt={p.caption}
                    loading="lazy"
                    decoding="async"
                    style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                  />
                </div>
              </div>
            ))}
            {/* End of Photos feed dwell card */}
            <div className="fb-feed-end-card">
              <div className="fb-feed-end-icon">✓</div>
              <div className="fb-feed-end-title">You&apos;re All Caught Up</div>
              <div className="fb-feed-end-subtitle">GDG CRCE Student Council 2026-27</div>
            </div>
          </div>
        )}

        {activeMobileTab === 'videos' && (
          <div className="fb-feed-container">
            {COUNCIL_CLIPS.map((clip) => (
              <div key={clip.src} className="fb-post-card">
                {/* Post Header */}
                <div className="fb-post-header">
                  <div className="fb-post-avatar page-avatar">
                    <Image src="/logo.png" className="fb-avatar-logo" alt="GDG Logo" width={612} height={408} sizes="48px" />
                  </div>
                  <div className="fb-post-author-info">
                    <span className="fb-post-author-name">
                      GDG CRCE
                      <span className="fb-verified-badge-small">✓</span>
                    </span>
                    <span className="fb-post-meta">Posted • Video • 🌐</span>
                  </div>
                </div>

                {/* Post content */}
                <div className="fb-post-content">
                  <p className="fb-post-text">{clip.caption}</p>
                </div>

                {/* Video Block */}
                <div className="fb-post-media-container" style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: '#000' }}>
                  <video
                    src={clip.src}
                    poster={clip.poster}
                    controls
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              </div>
            ))}
            {/* End of Videos feed dwell card */}
            <div className="fb-feed-end-card">
              <div className="fb-feed-end-icon">✓</div>
              <div className="fb-feed-end-title">You&apos;re All Caught Up</div>
              <div className="fb-feed-end-subtitle">GDG CRCE Student Council 2026-27</div>
            </div>
          </div>
        )}
        <div id="mobile-shutdown-anchor" style={{ width: '100%', height: '1px', pointerEvents: 'none' }} />
        </section>
      </div>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="events"
      className="xp-council-section"
      aria-label="GDG CRCE Events & Student Council 2026-27"
      style={{ position: 'relative', width: '100%' }}
    >
      <div
        ref={containerRef}
        className="xp-events-main-container"
        style={{
          width: '100%',
          height: '100vh',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <WindowsXPDesktop
          activeTeamIndex={activeMemberIndex}
          onSelectTeam={handleSelectTeam}
          isEventsMinimized={isEventsMinimized || phase >= 3}
          onToggleEventsMinimize={handleToggleEventsMinimize}
          showDesktopChrome={isEventsMinimized || phase >= 2}
        >
          {/* Layer 1: Events 3D Wall (Starts 100% Fullscreen, Walks, Dwells, then Shrinks into Media Player) */}
          <div className="xp-events-transition-wrapper">
            <div
              ref={eventsWindowRef}
            >
              {/* Titlebar of Windows Media Player */}
              <div className="xp-titlebar">
                <div className="xp-titlebar-left">
                  <span>🎬</span>
                  <span>Windows Media Player — [GDG CRCE 90s Street Archive.avi]</span>
                </div>
                <div className="xp-titlebar-buttons">
                  <button
                    type="button"
                    className="xp-btn-win xp-btn-min"
                    onClick={handleToggleEventsMinimize}
                    title="Minimize"
                  >
                    _
                  </button>
                  <button type="button" className="xp-btn-win xp-btn-max" title="Maximize">
                    □
                  </button>
                  <button
                    type="button"
                    className="xp-btn-win xp-btn-close"
                    onClick={handleToggleEventsMinimize}
                    title="Close"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Video Frame Content — Exact 3D Alleyway Wall */}
              <div
                className="xp-events-window-body"
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                  background: '#161315',
                }}
              >
                {/* 3D Wall Scene */}
                <WallScene progressRef={progressRef} snapToTarget={phase >= 1} />

                {/* Scanline overlay */}
                <div className="events-scanlines" />

                {/* Film grain overlay */}
                <div className="events-grain" />

                {/* Lens falloff */}
                <div className="events-vignette" />

                {/* Camcorder Viewfinder HUD */}
                <div className="events-hud">
                  <div className="events-hud-top">
                    <div className="events-era-badge">
                      <span className="events-era-dot" />
                      <span>CAM-01 // ALLEYWAY WALL</span>
                    </div>
                    <div className="events-hud-gdg">
                      <span>REC [•] SP 00:94:26</span>
                      <span style={{ marginLeft: '1.5rem', opacity: 0.6 }}>
                        GDG CRCE // STREET ARCHIVE
                      </span>
                    </div>
                  </div>

                  <div className="events-hud-bottom">
                    <div className="events-event-info">
                      <div className="events-event-counter">
                        <span ref={eventNumRef} className="events-event-number">
                          01
                        </span>
                        <span className="events-event-divider">/</span>
                        <span className="events-event-total">
                          {String(events.length).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="events-event-meta">
                        <span ref={eventTitleRef} className="events-event-title">
                          {events[0]?.title}
                        </span>
                        <span ref={eventSubtitleRef} className="events-event-subtitle">
                          {events[0]?.subtitle}
                        </span>
                      </div>
                    </div>
                    <div className="events-scroll-hint">
                      <span>
                        {phase < 1
                          ? 'SCROLL DOWN STREET →'
                          : 'MINIMIZING VIDEO ARCHIVE TO XP DESKTOP ↓'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="events-progress-track">
                  <div
                    ref={progressBarRef}
                    className="events-progress-fill"
                  />
                </div>

                {/* Grunge vignette borders */}
                <div className="events-grunge-top" />
                <div className="events-grunge-bottom" />
              </div>
            </div>
          </div>

          {/* Layer 2: Student Council TheFacebook Archive (IE6 window on the XP desktop) */}
          <div
            ref={playerWrapperRef}
            className="xp-player-window-wrapper"
            style={{ opacity: 0, pointerEvents: 'none', visibility: 'hidden' }}
          >
            <Y2KArchiveSystem embedded scrollProgressRef={archiveScrollRef} />
          </div>

          {/* Layer 3: Windows Picture and Fax Viewer */}
          <div
            ref={pictureViewerRef}
            className="xp-picture-viewer-wrapper"
            style={{ opacity: 0, pointerEvents: 'none', visibility: 'hidden', transform: 'scale(0.85) translateY(25px)' }}
          >
            <WindowsPictureViewer allMembers={filteredMembers} scrollProgressRef={pvScrollProgressRef} />
          </div>
        </WindowsXPDesktop>
      </div>
    </section>
  );
}

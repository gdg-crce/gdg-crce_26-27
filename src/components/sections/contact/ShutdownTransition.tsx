'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ContactSection from './ContactSection';
import { smoothScrollTo } from '@/lib/scrollLock';
import './shutdown.css';

/* -----------------------------------------------------------------------------
   SHUT DOWN — the bridge from Act 3 into the present.

   Act 3 leaves the viewer inside a Windows XP desktop. Cutting from that to a
   modern footer is the seam the whole site otherwise avoids, so this closes the
   machine down instead: dim the desktop, run the shutdown dialog, drop to the
   XP field, then discharge the tube. What is underneath when the glass goes
   dark is 2026.

   ── This component does not own a clock. ──────────────────────────────────────

   On desktop it is driven by Act 3's pin, which parks its progress here through
   `drawRef` (see EventsAndCouncilSectionProps). That is not a style preference,
   it is the fix for three separate defects that all came from this file having
   its own ScrollTrigger:

     · Act 3 scrubs at 0.8 and this scrubbed instantly, so under real scroll
       velocity the overlay ran ahead of the gallery it was supposed to follow.
     · This trigger was created on the first effect pass; Act 3's pin is gated
       behind a `mounted` state flip plus a 150ms deferred refresh, so the start
       position here was first measured against a document missing 11720px of
       pin spacing — which is how the shutdown ended up playing over the events
       wall.
     · Its `end` landed exactly on the document's maximum scroll, and the
       overlay's visibility was tied to `ScrollTrigger.isActive`, which goes
       false at progress 1. The ending deleted itself at the one scroll position
       the page comes to rest on.

   Mobile has no XP desktop to switch off and no pin at this point in the page,
   so there it falls back to anchoring against its own in-flow spacer.

   Every value below is still derived from ONE scalar, the way Preloader does
   it. Never introduce a second progress source.
   -------------------------------------------------------------------------- */

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Smoothstep between two progress marks. */
const seg = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * Scroll length of the mobile fallback, in px.
 *
 * Desktop does not use this — its length is `SHUTDOWN_LEN` inside Act 3's pin.
 */
const MOBILE_PAUSE_PX = 80;
const MOBILE_SCROLL_LEN = 450;

/* ── Idle auto-finish ─────────────────────────────────────────────────────────
   The shutdown is scroll-driven, and it is the one beat on the page where that
   is a trap. Everything else here reads as scenery you are travelling past; a
   shutdown DIALOG reads as a machine that is already doing something. So the
   viewer stops scrolling and waits — politely, indefinitely — for a progress
   bar that only ever moves when they push it.

   If the power-off is part-way through and nothing has advanced it for
   IDLE_FINISH_MS, it finishes itself.

   This does NOT introduce the second progress source the header forbids. It
   moves the SCROLL, and every value on screen is still derived from the one
   scalar whichever driver is in charge hands to `render`. That distinction is
   the entire reason this is a `scrollTo` and not a tween of `p`: tween `p` and
   the next real scroll tick snaps the picture back to wherever the scrollbar
   actually is. Both drivers reach p = 1 at the bottom of the document — the
   desktop pin because it is the last thing in the document, the mobile spacer
   because it is the last thing in flow — so "finish" is one destination. */
const IDLE_FINISH_MS = 2500;
const IDLE_FINISH_DURATION_S = 2.0;
/** Below this the power-off has not visibly begun, so there is nothing to
 *  finish and an idle viewer is just reading the gallery. */
const IDLE_FINISH_MIN_P = 0.01;
/** Smootherstep. Lenis's default expo-out dumps most of the travel into the
 *  first few frames, which on a 1600px shutdown is a lurch, not a power-off. */
const IDLE_FINISH_EASE = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export interface ShutdownFrame {
  /** The text-mode contact screen on the black. */
  termOpacity: number;
  scrimOpacity: number;
  dialogOpacity: number;
  dialogScale: number;
  fieldOpacity: number;
  tubeScaleY: number;
  tubeScaleX: number;
  tubeBrightness: number;
  tubeOpacity: number;
  scanOpacity: number;
  scanScaleX: number;
  dotOpacity: number;
  dotScale: number;
  overlayOpacity: number;
}

/**
 * Every visual in the shutdown, as a pure function of one scalar.
 *
 * Exported so it can be evaluated and inspected without mounting React or a
 * scroll rig — the beats below are timing-critical against each other and are
 * much easier to verify as numbers than by eye.
 *
 * Note the tail: the contact screen is fully opaque by 0.88 and interactive a
 * little before that, leaving the last ~12% of the scrub as rest. The payoff
 * used to land at 0.97 on a scrub whose end coincided with the bottom of the
 * document, i.e. it was only legible in the final 87 pixels of a 30,000px page.
 * The ending needs somewhere to sit, not a knife-edge to balance on.
 */
export function shutdownFrame(p: number): ShutdownFrame {
  const dlgIn = seg(0.01, 0.12, p);
  const dlgOut = seg(0.44, 0.53, p);

  /* Vertical collapse first, then horizontal — that order is the whole tell.
     A tube loses vertical deflection while the horizontal is still scanning,
     so the picture becomes a LINE before it becomes a dot. Collapsing both at
     once reads as a zoom-out, which is not the same memory at all. */
  const vert = seg(0.59, 0.71, p);
  const horiz = seg(0.71, 0.77, p);
  const dotIn = seg(0.75, 0.78, p);
  const dotOut = seg(0.78, 0.84, p);

  return {
    /* The contact screen fades up on the black the tube leaves behind, while
       the phosphor dot is still burning down. */
    termOpacity: seg(0.8, 0.88, p),
    scrimOpacity: seg(0.08, 0.3, p) * 0.5,
    dialogOpacity: dlgIn * (1 - dlgOut),
    dialogScale: 0.94 + dlgIn * 0.06,
    fieldOpacity: seg(0.45, 0.56, p),
    tubeScaleY: 1 - vert * 0.9975, // 1 → 0.0025, about a 2px band
    tubeScaleX: 1 - horiz,
    // The picture blows out as it discharges: all that beam energy in one band.
    tubeBrightness: 1 + vert * 1.9,
    tubeOpacity: 1 - seg(0.75, 0.78, p),
    // The scanline takes over exactly as the picture finishes collapsing.
    scanOpacity: seg(0.65, 0.71, p) * (1 - seg(0.74, 0.78, p)),
    scanScaleX: 1 - horiz,
    // Phosphor dot: blooms as the line pinches out, then burns down.
    dotOpacity: dotIn * (1 - dotOut),
    dotScale: dotIn * (1 - dotOut * 0.85) * 1.6,
    /* A ten-frame cross-dissolve onto a bare XP desktop. Act 3 is showing the
       same wallpaper underneath, so this reads as the gallery window closing —
       which is what Windows does on the way down. It fades IN and never fades
       out: there is nothing beneath it to reveal, the contact screen is drawn
       on this same black. */
    overlayOpacity: seg(0.0, 0.04, p),
  };
}

export interface ShutdownTransitionProps {
  /**
   * Act 3 picks the draw function out of here and calls it from its own scroll
   * callback.
   *
   * Required, deliberately. Without it the desktop path has no clock at all and
   * this component renders a permanently-invisible overlay — a silent failure
   * that looks exactly like "there is no contact page". Let the compiler catch
   * that instead of the reviewer.
   */
  drawRef: React.MutableRefObject<((p: number) => void) | null>;
}

export default function ShutdownTransition({ drawRef }: ShutdownTransitionProps) {
  /**
   * Mirrors Act 3's own 768px split. Below it Act 3 renders a carousel and a
   * normal-flow feed instead of the XP desktop, its pin ends long before the
   * bottom of the page, and there is nothing for it to hand a shutdown to.
   */
  const [mobile, setMobile] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const tubeRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef<HTMLSpanElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const draw = (p: number) => {
      const tube = tubeRef.current;
      const scrim = scrimRef.current;
      const dialog = dialogRef.current;
      const field = fieldRef.current;
      const scan = scanRef.current;
      const dot = dotRef.current;
      const term = termRef.current;
      if (!tube || !scrim || !dialog || !field || !scan || !dot) return;

      if (p <= 0.0005) {
        overlay.classList.remove('is-active');
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        overlay.style.visibility = 'hidden';
        if (term) {
          term.style.opacity = '0';
          term.classList.remove('is-live');
        }
        return;
      }

      const f = shutdownFrame(p);

      overlay.classList.add('is-active');
      overlay.style.visibility = 'visible';
      overlay.style.opacity = f.overlayOpacity.toString();
      overlay.style.pointerEvents = p > 0.8 ? 'auto' : 'none';

      scrim.style.opacity = f.scrimOpacity.toString();
      dialog.style.opacity = f.dialogOpacity.toString();
      dialog.style.transform = `translate(-50%, -50%) scale(${f.dialogScale.toFixed(3)})`;
      field.style.opacity = f.fieldOpacity.toString();

      tube.style.transform = `scaleY(${f.tubeScaleY.toFixed(4)}) scaleX(${f.tubeScaleX.toFixed(4)})`;
      tube.style.filter = f.tubeBrightness > 1 ? `brightness(${f.tubeBrightness.toFixed(2)})` : 'none';
      tube.style.opacity = f.tubeOpacity.toString();

      scan.style.opacity = f.scanOpacity.toString();
      scan.style.transform = `translate(-50%, -50%) scaleX(${f.scanScaleX.toFixed(3)})`;

      dot.style.opacity = f.dotOpacity.toString();
      dot.style.transform = `scale(${f.dotScale.toFixed(3)})`;

      if (term) {
        term.style.opacity = f.termOpacity.toString();
        term.classList.toggle('is-live', f.termOpacity > 0.85);
      }
    };

    /* Reduced motion: no tube discharge, no marquee — just a straight fade
       from the desktop to the present. */
    const drawReduced = (p: number) => {
      const scrim = scrimRef.current;
      const term = termRef.current;
      if (!scrim) return;

      if (p <= 0.0005) {
        overlay.classList.remove('is-active');
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        overlay.style.visibility = 'hidden';
        if (term) {
          term.style.opacity = '0';
          term.classList.remove('is-live');
        }
        return;
      }

      overlay.classList.add('is-active');
      overlay.style.visibility = 'visible';
      overlay.style.opacity = seg(0.0, 0.1, p).toString();
      overlay.style.pointerEvents = p > 0.75 ? 'auto' : 'none';
      scrim.style.opacity = seg(0.1, 0.5, p).toString();
      if (term) {
        term.style.opacity = seg(0.55, 0.8, p).toString();
        term.classList.toggle('is-live', p > 0.78);
      }
    };

    let progressBarEl: HTMLElement | null = null;
    let statusTextEl: HTMLElement | null = null;

    const drawMobile = (p: number) => {
      const tube = tubeRef.current;
      const scrim = scrimRef.current;
      const dialog = dialogRef.current;
      const field = fieldRef.current;
      const scan = scanRef.current;
      const dot = dotRef.current;
      const term = termRef.current;
      if (!tube || !scrim || !dialog || !field || !scan || !dot || !term) return;

      if (p <= 0.005) {
        overlay.classList.remove('is-active');
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        overlay.style.visibility = 'hidden';
        scrim.style.opacity = '0';
        dialog.style.opacity = '0';
        field.style.opacity = '0';
        tube.style.opacity = '0';
        scan.style.opacity = '0';
        dot.style.opacity = '0';
        if (term) {
          term.style.opacity = '0';
          term.classList.remove('is-live');
        }
        return;
      }

      overlay.classList.add('is-active');
      overlay.style.visibility = 'visible';
      overlay.style.pointerEvents = 'auto';

      const f = shutdownFrame(p);

      overlay.style.opacity = f.overlayOpacity.toString();

      // Backlight is active during switching off / goodbye, then goes black
      scrim.style.opacity = p < 0.72 ? '1' : '0';

      dialog.style.opacity = f.dialogOpacity.toString();
      dialog.style.transform = `scale(${f.dialogScale.toFixed(3)})`;

      // Animate progress bar blocks
      if (!progressBarEl) progressBarEl = document.querySelector('.sd-phone-progress-bar');
      if (progressBarEl) {
        const totalBlocks = 12;
        const filled = Math.min(totalBlocks, Math.floor(seg(0.08, 0.44, p) * totalBlocks));
        progressBarEl.textContent = '▰'.repeat(filled) + '▱'.repeat(totalBlocks - filled);
      }

      // Animate status dots cycle
      if (!statusTextEl) statusTextEl = document.querySelector('.sd-phone-status');
      if (statusTextEl) {
        const dotsCount = Math.floor(seg(0.08, 0.44, p) * 12) % 4;
        statusTextEl.textContent = 'Switching Off' + '.'.repeat(dotsCount);
      }

      // Phone goodbye screen fades in and out cleanly before power off
      const goodbyeIn = seg(0.44, 0.54, p);
      const goodbyeOut = seg(0.68, 0.75, p);
      field.style.opacity = (goodbyeIn * (1 - goodbyeOut)).toString();

      // CRT screen going black discharge animation
      tube.style.transform = `scaleY(${f.tubeScaleY.toFixed(4)}) scaleX(${f.tubeScaleX.toFixed(4)})`;
      tube.style.filter = f.tubeBrightness > 1 ? `brightness(${f.tubeBrightness.toFixed(2)})` : 'none';
      tube.style.opacity = f.tubeOpacity.toString();

      scan.style.opacity = f.scanOpacity.toString();
      scan.style.transform = `translate(-50%, -50%) scaleX(${f.scanScaleX.toFixed(3)})`;

      dot.style.opacity = f.dotOpacity.toString();
      dot.style.transform = `translate(-50%, -50%) scale(${f.dotScale.toFixed(3)})`;

      if (term) {
        term.style.opacity = f.termOpacity.toString();
        term.classList.toggle('is-live', f.termOpacity > 0.85);
      }
    };

    const drawMobileReduced = (p: number) => {
      const scrim = scrimRef.current;
      const term = termRef.current;
      if (!scrim) return;

      if (p <= 0.005) {
        overlay.classList.remove('is-active');
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        overlay.style.visibility = 'hidden';
        scrim.style.opacity = '0';
        if (term) {
          term.style.opacity = '0';
          term.classList.remove('is-live');
        }
        return;
      }

      overlay.classList.add('is-active');
      overlay.style.visibility = 'visible';
      overlay.style.opacity = seg(0.0, 0.12, p).toString();
      scrim.style.opacity = seg(0.1, 0.5, p).toString();
      if (term) {
        term.style.opacity = seg(0.55, 0.8, p).toString();
        term.classList.toggle('is-live', p > 0.78);
      }
    };

    const baseRender = mobile
      ? (reduced ? drawMobileReduced : drawMobile)
      : (reduced ? drawReduced : draw);

    /* See IDLE_FINISH_MS. Armed off `render` itself rather than off a scroll
       listener, because "the shutdown stopped advancing" is the actual
       condition — and on desktop that is a scrub settling, which produces no
       further scroll events of its own. */
    let currentP = 0;
    let idleTimer = 0;
    let cancelFinish: (() => void) | null = null;

    const detachFinish = () => {
      window.removeEventListener('wheel', onFinishInput, true);
      window.removeEventListener('touchstart', onFinishInput, true);
      window.removeEventListener('keydown', onFinishInput, true);
    };

    /* Capture phase, and the viewer always wins — same handover the hero's
       auto-reveal uses. See `smoothScrollTo` for why cancelling has exactly one
       working spelling. */
    function onFinishInput() {
      detachFinish();
      const cancel = cancelFinish;
      cancelFinish = null;
      cancel?.();
    }

    const finishNow = () => {
      const bottom = document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY >= bottom - 4) return;

      cancelFinish = smoothScrollTo(bottom, {
        duration: IDLE_FINISH_DURATION_S,
        easing: IDLE_FINISH_EASE,
        onComplete: () => {
          cancelFinish = null;
          detachFinish();
        },
      });

      window.addEventListener('wheel', onFinishInput, { capture: true, passive: true });
      window.addEventListener('touchstart', onFinishInput, { capture: true, passive: true });
      window.addEventListener('keydown', onFinishInput, true);
    };

    const resetIdleTimer = () => {
      if (cancelFinish) return;
      window.clearTimeout(idleTimer);
      if (currentP >= IDLE_FINISH_MIN_P && currentP < 0.999) {
        idleTimer = window.setTimeout(finishNow, IDLE_FINISH_MS);
      }
    };

    const onUserActivity = () => {
      resetIdleTimer();
    };

    window.addEventListener('pointermove', onUserActivity, { passive: true });
    window.addEventListener('mousemove', onUserActivity, { passive: true });
    window.addEventListener('click', onUserActivity, { passive: true });
    window.addEventListener('keydown', onUserActivity, { passive: true });
    window.addEventListener('touchstart', onUserActivity, { passive: true });
    window.addEventListener('wheel', onUserActivity, { passive: true });

    const render = (p: number) => {
      currentP = p;
      baseRender(p);

      window.clearTimeout(idleTimer);
      // An auto-finish in flight is itself producing these calls. Re-arming off
      // its own progress would reset the timer every frame and it could never
      // fire again — and it has nothing left to wait for anyway.
      if (cancelFinish) return;
      if (p >= IDLE_FINISH_MIN_P && p < 0.999) {
        idleTimer = window.setTimeout(finishNow, IDLE_FINISH_MS);
      }
    };

    const teardownFinish = () => {
      window.clearTimeout(idleTimer);
      window.removeEventListener('pointermove', onUserActivity);
      window.removeEventListener('mousemove', onUserActivity);
      window.removeEventListener('click', onUserActivity);
      window.removeEventListener('keydown', onUserActivity);
      window.removeEventListener('touchstart', onUserActivity);
      window.removeEventListener('wheel', onUserActivity);
      detachFinish();
      cancelFinish?.();
    };

    // Land on a correct first frame rather than the CSS defaults.
    render(0);

    /* ── desktop: Act 3 drives us ─────────────────────────────────────────── */
    if (!mobile) {
      drawRef.current = render;
      return () => {
        drawRef.current = null;
        teardownFinish();
      };
    }

    /* ── mobile: track the real DOM spacer directly below the council feed ─── */
    let lastRenderedP = -1;
    let rafId: number | null = null;

    const updateMobile = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;

        // If a tab switch is in progress, force shutdown to 0
        if (
          typeof window !== 'undefined' &&
          (window as unknown as { __isSwitchingCouncilTab?: boolean }).__isSwitchingCouncilTab
        ) {
          if (lastRenderedP !== 0) {
            lastRenderedP = 0;
            render(0);
          }
          return;
        }

        const council = document.getElementById('mobile-council');
        const anchor = document.getElementById('mobile-shutdown-anchor');
        const endCard = council?.querySelector('.fb-feed-container .fb-feed-end-card');
        const spacer = spacerRef.current;
        if (!spacer) return;

        // Find the bottom boundary of the "You're All Caught Up" card or anchor
        let triggerBottom: number;
        if (endCard) {
          triggerBottom = endCard.getBoundingClientRect().bottom;
        } else if (anchor) {
          triggerBottom = anchor.getBoundingClientRect().top;
        } else {
          triggerBottom = spacer.getBoundingClientRect().top;
        }

        const vh = window.innerHeight;

        // If "You're All Caught Up" has not reached the bottom of the viewport yet,
        // the user is still viewing or reading the council content — shutdown stays at 0
        if (triggerBottom >= vh) {
          if (lastRenderedP !== 0) {
            lastRenderedP = 0;
            render(0);
          }
          return;
        }

        // Slight pause/buffer right after "You're All Caught Up" before shutdown begins
        const travel = vh - triggerBottom;
        if (travel <= MOBILE_PAUSE_PX) {
          if (lastRenderedP !== 0) {
            lastRenderedP = 0;
            render(0);
          }
          return;
        }

        // As the user scrolls past the pause, smoothly progress shutdown 0 -> 1 over MOBILE_SCROLL_LEN px
        const p = clamp01((travel - MOBILE_PAUSE_PX) / MOBILE_SCROLL_LEN);

        if (Math.abs(p - lastRenderedP) > 0.001) {
          lastRenderedP = p;
          render(p);
        }
      });
    };

    window.addEventListener('scroll', updateMobile, { passive: true });
    window.addEventListener('resize', updateMobile, { passive: true });
    updateMobile();

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', updateMobile);
      window.removeEventListener('resize', updateMobile);
      teardownFinish();
    };
  }, [mobile, drawRef]);

  return (
    <>
      {/* No aria-hidden on the overlay itself: it contains the contact screen,
          which is real content. `aria-hidden="true"` on an ancestor removes the
          entire subtree from the accessibility tree and a descendant cannot
          opt back in — `aria-hidden="false"` on a child of a hidden parent does
          nothing. The decorative chrome carries the attribute individually
          instead, and `visibility: hidden` keeps the whole thing out of the
          tree until the shutdown is actually running. */}
      <div ref={overlayRef} className="sd-overlay">
        {mobile ? (
          <div ref={tubeRef} className="sd-phone-screen" aria-hidden="true">
            <div ref={scrimRef} className="sd-phone-lcd">
              <div className="sd-phone-statusbar">
                <span className="sd-phone-signal">Y╢╢╢╢</span>
                <span className="sd-phone-operator">GDG Mobile</span>
                <span className="sd-phone-battery">╢╢╢[ ]</span>
              </div>
              <div ref={dialogRef} className="sd-phone-content" style={{ opacity: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  className="sd-phone-logo"
                  alt="GDG Logo"
                />
                <div className="sd-phone-status">Switching Off...</div>
                <div className="sd-phone-progress-bar">▰▰▰▰▰▰▰▱▱▱▱▱</div>
              </div>
              <div ref={fieldRef} className="sd-phone-goodbye" style={{ opacity: 0 }}>
                <div className="sd-phone-goodbye-text">Goodbye!</div>
              </div>
            </div>
          </div>
        ) : (
          <div ref={tubeRef} className="sd-tube" aria-hidden="true">
            <div className="sd-wallpaper" />
            <div ref={scrimRef} className="sd-scrim" />

            <div ref={dialogRef} className="sd-dialog">
              <div className="sd-dialog-title">Shut Down Windows</div>
              <div className="sd-dialog-body">
                <span className="sd-dialog-icon">⏻</span>
                <div className="sd-dialog-text">
                  <strong>Windows is shutting down...</strong>
                  <span>
                    Saving your settings. The 2026&ndash;27 council archive has been written to
                    disk.
                  </span>
                </div>
              </div>
              <div className="sd-progress">
                <div className="sd-progress-train">
                  {Array.from({ length: 24 }, (_, i) => (
                    <i key={i} />
                  ))}
                </div>
              </div>
            </div>

            <div ref={fieldRef} className="sd-field">
              <div className="sd-field-main">It is now safe to turn off your computer.</div>
              <div className="sd-field-sub">Everything after this point is happening now.</div>
            </div>
          </div>
        )}

        {/* Siblings of the tube: once it has collapsed there is no element
            left inside it to carry these. */}
        <span ref={scanRef} className="sd-scanline" aria-hidden="true" />
        <span ref={dotRef} className="sd-dot" aria-hidden="true" />

        {/* The text-mode screen under the dead tube. This is the page's last
            frame — nothing follows it, so there is nothing to scroll into. */}
        <div ref={termRef} className="sd-term-host">
          <ContactSection isMobile={mobile} />
        </div>
      </div>

      {/* Mobile only. On desktop the shutdown rides Act 3's pin and this
          component contributes ZERO height to the document — which is what
          makes the XP desktop's unpin unreachable rather than merely covered.
          Adding anything in flow here reintroduces the scroll-up. */}
      {mobile && (
        <div
          ref={spacerRef}
          className="sd-spacer"
          style={{ height: `${MOBILE_PAUSE_PX + MOBILE_SCROLL_LEN}px` }}
        />
      )}
    </>
  );
}

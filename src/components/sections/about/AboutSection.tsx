'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ik } from '@/lib/imagekit';
import { currentIntroPhases } from '@/lib/introTimeline';
import './about.css';

/* ── scalar helpers (same idiom as WhatWeDoSection) ─────────────────────── */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Eased ramp: 0 below `a`, 1 above `b`, smoothstep between. */
const ramp = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ── design space ───────────────────────────────────────────────────────
   Every number below is in the 1600×900 stage coordinate system that
   about.css lays the turntable out in. Change one here and the stylesheet
   has to follow (the disc/label rects are hard-coded there). */
const STAGE_W = 1600;
const STAGE_H = 900;

/**
 * How much the deck pushes in over the tail of this act, and why the number is
 * not a taste decision.
 *
 * The next act opens on a still of this deck (`image_copy.png`) painted across
 * the closed photo album, and at the hand-off that album is scaled to cover the
 * viewport — so for one frame the still IS this section, and any disagreement
 * between them reads as the whole deck jumping size.
 *
 * They disagreed. The still is 1917×917 (2.0905:1) and the album's face is
 * 16:9, so `background-size: cover` fits it by height and crops the sides,
 * drawing the deck 2.0905 / 1.7778 larger than this stage draws it. Because
 * both sides resolve their on-screen width to `max(vw, vh × 16/9)`, that ratio
 * is the same at every viewport — one constant, no per-viewport correction.
 *
 * Fixing it on the album's side is worse than it sounds: aligning by width
 * instead sizes the deck correctly but the still only carries 85% of the
 * stage's height, so it letterboxes, and those bands live on the album cover
 * for the whole act rather than just at the seam. Meeting the still here costs
 * nothing and reads as a camera pushing in before a photograph is taken —
 * which is precisely what the next act is.
 *
 * A 16:9 re-shoot of the still would let this go back to 1.
 */
const SEAM_MATCH = 1917 / 917 / (STAGE_W / STAGE_H); // 1.1759
/** Fraction of the playback the push occupies — the last sixth of it. */
const SEAM_PUSH_START = 0.83;
const REC_CX = 984;
const REC_CY = 445;
const REC_R = 830;
const LABEL_R = 288;
const PIVOT_X = 166.5;
const PIVOT_Y = 135.3;
const ARM_LEN = 748;

/** 
 * Photoreal tonearm image calibration. 
 * width: how large the image is drawn in the 1600x900 stage. 960px matches the base bearing perfectly.
 * pivotX, pivotY: the exact pixel coordinates of the pivot bearing *within* the raw 1536x1024 image.
 */
const TONEARM_IMG_W = 960;
const TONEARM_IMG_H = TONEARM_IMG_W * (1024 / 1536);
const TONEARM_RAW_PIVOT_X = 319; 
const TONEARM_RAW_PIVOT_Y = 460;
const TONEARM_X = PIVOT_X - (TONEARM_RAW_PIVOT_X / 1536) * TONEARM_IMG_W;
const TONEARM_Y = PIVOT_Y - (TONEARM_RAW_PIVOT_Y / 1024) * TONEARM_IMG_H;


/** Groove radius, from the record centre, that the stylus rides in for each
 *  track — plus the parked position, which has to clear the disc entirely. */
const TRACK_RADII = [631, 561, 491];
const PARK_RADIUS = 858; // > REC_R, so the arm sits off the record at rest
const RUNOUT_RADIUS = 470; // slow inward creep through the last track

/** Revolutions the record makes across the whole pinned scroll. At 6500px of
 *  scroll this is ~930px per turn — fast enough to feel driven by the wheel,
 *  slow enough that a flick doesn't blur it. */
const SPIN_TURNS = 2;

/** Free-spin: the deck's own motor, which takes over the moment the wheel stops.
 *  33⅓ RPM is 200°/s — the speed printed on the label, so the two agree.
 *  The platter never snaps between the two drives: `FREE_TAU` is the seconds-ish
 *  constant the motor spins up and down over, which is what a belt drive does
 *  and what stops a flick of the wheel from reading as a jump-cut. */
const FREE_DEG_PER_SEC = 50;
const FREE_TAU = 0.42;

/* ── the spin-down ─────────────────────────────────────────────────────────
   The next act opens on a photograph of this deck, and the record in a
   photograph is not turning. Cutting from a spinning platter to a still one is
   the single tell that gives the whole hand-off away, so the deck is brought to
   rest before the swap instead of being frozen by it.

   Both drives are wound down over the same window. The wheel's contribution is
   remapped through `t - t²/2`, whose slope is 1 where the window opens and 0
   where it closes: no kick as the taper engages, no residual motion at the end,
   and no way to scroll past it — turning the wheel harder just buys less
   rotation per pixel until there is none left. The motor is scaled by the same
   factor, so it cannot spin the disc back up while the taper is running. */
const SPIN_DOWN_START = 0.86;
/** Wheel input counts as "still scrolling" for this long after the last tick.
 *  Below ~150ms the motor stutters between wheel notches. */
const SCROLL_IDLE_MS = 190;

/** Distance from the record centre to the stylus for a given arm angle. */
function radiusForAngle(deg: number) {
  const a = (deg * Math.PI) / 180;
  return Math.hypot(
    PIVOT_X + ARM_LEN * Math.cos(a) - REC_CX,
    PIVOT_Y + ARM_LEN * Math.sin(a) - REC_CY
  );
}

/** Inverse of the above. Monotonic across the 40°–96° window the arm lives in,
 *  so a bisection is exact enough and keeps the geometry editable in one
 *  place — nudge REC_CX or ARM_LEN and every detent re-solves itself. */
function angleForRadius(r: number) {
  let lo = 40;
  let hi = 96;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (radiusForAngle(mid) < r) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const ANG_PARK = angleForRadius(PARK_RADIUS);
const ANG_TRACK = TRACK_RADII.map(angleForRadius);
const ANG_RUNOUT = angleForRadius(RUNOUT_RADIUS);

/* ── scroll timeline ────────────────────────────────────────────────────
   One 0→1 progress through the whole pinned scroll:
     0.00 – 0.10  the arm drops in from above the frame
     0.15 – 0.27  it swings over the disc and LOWERS onto the outer groove;
                  on touchdown the label ignites and track 1 reads in
     0.27 – 0.44  TRACK 1 — Our Theme      (orange)
     0.44 – 0.53  the arm advances a detent; label + copy swap
     0.53 – 0.69  TRACK 2 — Our Vision     (deep red)
     0.69 – 0.78  second advance
     0.78 – 1.00  TRACK 3 — Our Mission    (amber)
   Copy swaps are out-then-in with no overlap, so two paragraphs never
   cross-dissolve into mush on top of each other. */
const SWAP_1 = { outA: 0.44, outB: 0.487, inA: 0.495, inB: 0.545 };
const SWAP_2 = { outA: 0.69, outB: 0.737, inA: 0.745, inB: 0.795 };
const TOUCHDOWN = { a: -0.1, b: 0.0 };

/** Arm angle keyframes. Sampled with smoothstep between neighbours. */
const ARM_KEYS: [number, number][] = [
  [0.0, ANG_TRACK[0]],
  [0.44, ANG_TRACK[0]],
  [0.53, ANG_TRACK[1]],
  [0.69, ANG_TRACK[1]],
  [0.78, ANG_TRACK[2]],
  [1.0, ANG_RUNOUT],
];

const LIFT_KEYS: [number, number][] = [
  [0.0, 1.0],   // Starts fully lifted
  [0.15, 0.0],  // Drops smoothly onto the first track
  [0.44, 0.0],  // Starts moving to track 2
  [0.485, 0.5], // Lifts halfway up during transit
  [0.53, 0.0],  // Drops onto track 2
  [0.69, 0.0],  // Starts moving to track 3
  [0.735, 0.5], // Lifts halfway up during transit
  [0.78, 0.0],  // Drops onto track 3
  [1.0, 0.0],
];

function sampleKeys(keys: [number, number][], p: number) {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [x1, v1] = keys[i];
    if (p <= x1) {
      const [x0, v0] = keys[i - 1];
      // Use an even smoother cubic ease in-out for the arm movement
      const t = clamp01((p - x0) / (x1 - x0));
      const smoothT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      return lerp(v0, v1, smoothT);
    }
  }
  return keys[keys.length - 1][1];
}

/* ── copy ───────────────────────────────────────────────────────────────
   Line breaks are authored, not wrapped: the copy has to sit inside a circle,
   so the rag is part of the layout. */
type Track = {
  key: string;
  /** Stacked one letter per line under the horizontal "Our". */
  word: string;
  /** Brush-script line, theme card only. */
  brush?: string;
  lines: string[];
};

const TRACKS: Track[] = [
  {
    key: 'theme',
    word: 'Theme',
    brush: 'Synécheia:',
    lines: ['What continues,', 'becomes greater.'],
  },
  {
    key: 'vision',
    word: 'Vision',
    lines: [
      'To carry forward the',
      'foundation built by',
      'those before us,',
      'transforming their legacy',
      'into collective momentum',
      'as we learn, build, and',
      'shape what comes next.',
    ],
  },
  {
    key: 'mission',
    word: 'Mission',
    lines: [
      'To build in the open,',
      'to teach what we learn,',
      'and to leave this',
      'community further along',
      'than we found it — so',
      'every batch begins where',
      'the last one reached.',
    ],
  },
];

/**
 * AboutSection — a full-bleed turntable, played by the scrollbar.
 *
 * Scroll turns the record. `--spin` is a real rotation angle handed to every
 * layer that is physically part of the disc — the vinyl's surface marks and
 * the label's printed swirl — so the platter genuinely rotates under the
 * needle rather than a light being swept across a still image. Stop scrolling
 * and it stops, because your wheel is the motor.
 *
 * Scroll also walks the tonearm: it descends into frame, cues onto the outer
 * groove, then steps inward through three detents, and each detent is a
 * section of the copy.
 *
 * Every per-frame write goes straight to `element.style` inside the
 * ScrollTrigger callback — no React state on the scroll path, same rule the
 * Events and WhatWeDo sections follow.
 */
export default function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const armRef = useRef<SVGGElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const labRefs = useRef<(HTMLDivElement | null)[]>([]);
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sideRefs = useRef<(HTMLDivElement | null)[]>([]);

  /* Platter drive. The angle written to --spin is the SUM of two independent
     sources, so neither has to know about the other:
       scrollSpinRef — where the wheel has dragged the record to
       freeSpinRef   — how far the motor has carried it since mount
     Both only ever accumulate forward, so handing off between them can never
     produce a backward jerk. */
  const scrollSpinRef = useRef(0);
  const freeSpinRef = useRef(0);
  const freeRateRef = useRef(0);
  /** 1 while the deck runs, easing to 0 across the spin-down window. */
  const spinDownRef = useRef(1);
  /** Whole-turn angle the platter is settling onto; null outside the window. */
  const spinTargetRef = useRef<number | null>(null);
  const lastScrollRef = useRef(-1e9);
  const inViewRef = useRef(false);

  /* Cover-scale the design stage to the viewport, then project the label's
     centre back out into viewport pixels for the (unscaled) text layer. */
  useEffect(() => {
    const fit = () => {
      const stage = stageRef.current;
      const pin = pinRef.current;
      if (!stage || !pin) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      
      let s;
      let ox;

      const useMobileLayout = (vw < vh) || (vw < 768) || (vh < 500);

      if (useMobileLayout) {
        // Mobile / Portrait: Center the spindle and scale based on the smaller viewport dimension to fit the label with margin
        s = (1.45 * Math.min(vw, vh)) / (LABEL_R * 2);
        ox = -(REC_CX - STAGE_W / 2);
      } else {
        // Desktop / Landscape: Cover-scale as-authored
        s = Math.max(vw / STAGE_W, vh / STAGE_H);
        const recentre = 1 - clamp01((vw / vh - 1.05) / 0.55);
        ox = -(REC_CX - STAGE_W / 2) * recentre;
      }

      stage.style.transform = `translate(-50%, -50%) scale(${s.toFixed(4)}) translate(${ox.toFixed(1)}px, 0px)`;

      pin.style.setProperty('--label-cx', `${(vw / 2 + (REC_CX - STAGE_W / 2 + ox) * s).toFixed(1)}px`);
      pin.style.setProperty('--label-cy', `${(vh / 2 + (REC_CY - STAGE_H / 2) * s).toFixed(1)}px`);
      pin.style.setProperty('--label-r', `${(LABEL_R * s).toFixed(1)}px`);
    };

    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const draw = (p: number) => {
      // ── the platter turns ────────────────────────────────────────────
      // A real angle, inherited by every layer that is part of the record.
      // ScrollTrigger's scrub eases it, so a flick of the wheel spins the
      // disc up and lets it coast to a stop instead of snapping. The write
      // itself belongs to the rAF loop below — this only banks the wheel's
      // contribution, because the motor is adding to the same angle.
      //
      // Past SPIN_DOWN_START the mapping tapers to a standstill so the deck is
      // already still when the next act's photograph of it takes over.
      const spinWindow = 1 - SPIN_DOWN_START;
      const t = clamp01((p - SPIN_DOWN_START) / spinWindow);
      const spinP = p <= SPIN_DOWN_START ? p : SPIN_DOWN_START + spinWindow * (t - (t * t) / 2);
      spinDownRef.current = 1 - t;
      scrollSpinRef.current = spinP * 360 * SPIN_TURNS;

      // ── tonearm ──────────────────────────────────────────────────────
      const deg = sampleKeys(ARM_KEYS, p);
      const lift = sampleKeys(LIFT_KEYS, p);

      const arm = armRef.current;
      if (arm) {
        arm.style.opacity = '1.000';
        arm.style.transform =
          `rotate(${deg.toFixed(2)}deg) scale(${(1 + lift * 0.03).toFixed(3)})`;
        // A shadow that opens up as the arm rises is what actually sells the
        // descent — the rotation alone reads as a swing, not a drop.
        arm.style.filter =
          `drop-shadow(${(4 + lift * 13).toFixed(1)}px ${(7 + lift * 30).toFixed(1)}px ` +
          `${(9 + lift * 26).toFixed(1)}px rgba(0,0,0,${(0.55 - lift * 0.26).toFixed(2)}))`;
      }

      // ── label ignition ───────────────────────────────────────────────
      const lit = ramp(TOUCHDOWN.a - 0.02, TOUCHDOWN.b, p);
      labelRef.current?.style.setProperty('--lit', lit.toFixed(3));

      // ── groove-band highlight, welded to where the needle actually is ──
      const band = bandRef.current;
      if (band) {
        const pct = (radiusForAngle(deg) / REC_R) * 100;
        band.style.setProperty('--b0', `${(pct - 4.2).toFixed(2)}%`);
        band.style.setProperty('--b1', `${(pct + 4.2).toFixed(2)}%`);
        band.style.opacity = lit.toFixed(3);
      }

      // ── label colour ─────────────────────────────────────────────────
      // Stacked bottom-to-top and revealed in order by a radial wipe (see
      // .tt-lab) — there is always an opaque disc underneath, and no frame
      // ever shows a blend of two label colours.
      const sw1 = ramp(SWAP_1.outA, SWAP_1.inB, p);
      const sw2 = ramp(SWAP_2.outA, SWAP_2.inB, p);
      labRefs.current[0]?.style.setProperty('--wipe', '60');
      labRefs.current[1]?.style.setProperty('--wipe', (sw1 * 60).toFixed(2));
      labRefs.current[2]?.style.setProperty('--wipe', (sw2 * 60).toFixed(2));

      // ── copy ─────────────────────────────────────────────────────────
      const vis = [
        ramp(TOUCHDOWN.a, TOUCHDOWN.b, p) * (1 - ramp(SWAP_1.outA, SWAP_1.outB, p)),
        ramp(SWAP_1.inA, SWAP_1.inB, p) * (1 - ramp(SWAP_2.outA, SWAP_2.outB, p)),
        ramp(SWAP_2.inA, SWAP_2.inB, p),
      ];

      for (let i = 0; i < TRACKS.length; i++) {
        const v = vis[i];
        const copy = copyRefs.current[i];
        if (copy) {
          copy.style.opacity = v.toFixed(3);
          copy.style.transform = `translateY(${((1 - v) * 16).toFixed(1)}px)`;
        }
        const side = sideRefs.current[i];
        if (side) {
          side.style.opacity = v.toFixed(3);
          side.style.transform = `translateY(${((1 - v) * -18).toFixed(1)}px)`;
        }
      }

      // ── seam flash fade-in on mobile ─────────────────────────────────
      const flashEl = document.querySelector('.wwd-seam-flash') as HTMLElement | null;
      if (flashEl && window.innerWidth < 768) {
        // Fade in the flash over the last 15% of the AboutSection scroll
        const flashOp = ramp(0.85, 1.0, p);
        flashEl.style.opacity = flashOp.toFixed(3);
      }
    };

    // One ScrollTrigger pins the turntable from scroll 0. The first phase of
    // that scroll is the whole intro (hero iris → title card → the title's
    // knockout push-in); the turntable is the thing revealed THROUGH the
    // letters, so it has to be painted and sitting at its start state before
    // the knockout opens. The second phase plays the turntable itself.
    let lastP = -1;
    const onUpdate = (p: number) => {
      if (Math.abs(p - lastP) > 1e-5) lastScrollRef.current = performance.now();
      lastP = p;
      draw(p);
    };

    /** Scroll, in px, that the turntable itself is played over. */
    const PLAY_DIST = 3250;

    const drive = (progress: number) => {
      const ph = currentIntroPhases();
      const scrollPx = progress * (ph.total + PLAY_DIST);

      // Phase 1 — the intro still owns the screen. The turntable no longer
      // fades up under it: it is the thing the title card's letters are a
      // window onto, so it has to be fully opaque before the knockout opens,
      // and it is painted from the start of the hold beat so its first frame
      // is not being composited on the frame the reveal begins.
      // Before that it is hidden outright — a full-screen layer nobody can see
      // is still a full-screen layer the compositor pays for.
      const playP = clamp01((scrollPx - ph.total) / PLAY_DIST);

      const pin = pinRef.current;
      if (pin) {
        pin.style.opacity = '1';
        pin.style.visibility = scrollPx >= ph.hold.start ? 'visible' : 'hidden';
        // The whole pinned frame pushes in to meet the still the next act opens
        // on — see SEAM_MATCH. The pin rather than the stage, deliberately: the
        // vignette and the grain are part of the shot, so a camera move has to
        // take them with it, and scaling one element keeps the stage's own
        // fit() maths the single owner of layout.
        const push = 1 + ramp(SEAM_PUSH_START, 1, playP) * (SEAM_MATCH - 1);
        pin.style.transform = `scale(${push.toFixed(5)})`;
      }

      // Phase 2 — turntable playback.
      onUpdate(playP);
    };

    const play = ScrollTrigger.create({
      trigger: document.body,
      pin: pinRef.current,
      start: 0,
      end: () => `+=${currentIntroPhases().total + PLAY_DIST}`,
      scrub: window.innerWidth < 768 ? 0.5 : 1.5,
      onUpdate: (self) => drive(self.progress),
      onRefresh: (self) => drive(self.progress),
    });

    // ── the motor ────────────────────────────────────────────────────────
    // A deck does not stop turning because you stopped touching it. The wheel
    // and the motor drive the SAME angle: while you scroll, the motor eases to
    // a stop and hands the record over; when you let go it eases back up to
    // 33⅓ and keeps it going. Only ever runs while the section is on screen —
    // an off-screen rAF is a background tax on every other section's frame.
    const stage = stageRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const idle = now - lastScrollRef.current > SCROLL_IDLE_MS;
      // The motor obeys the spin-down too, or it would quietly wind the record
      // back up the moment the wheel went idle inside the taper — and the deck
      // would be turning again at exactly the handover.
      const target = (idle && !reduced ? FREE_DEG_PER_SEC : 0) * spinDownRef.current;
      freeRateRef.current += (target - freeRateRef.current) * Math.min(1, dt / FREE_TAU);
      freeSpinRef.current += freeRateRef.current * dt;

      /* ── settling onto a known pose ──────────────────────────────────────
         Stopping the record is not enough on its own: WHERE it stops has to be
         repeatable. The motor accumulates real time, so the resting angle was
         previously whatever a given visit happened to land on — which means the
         printed ring on the label sits somewhere different every time, and no
         fixed photograph of this deck can ever agree with it.

         Across the spin-down window the platter is eased onto the next whole
         turn, so it always comes to rest in the same orientation it started in.
         `ceil`, not `round`: a record does not run backwards, so the target is
         always ahead of where we are. The correction rides on the deceleration
         and reads as the platter coasting into place.

         NOTE: this makes a matching still POSSIBLE; it does not by itself make
         the current one match. `whatwedo/image copy.png` was captured at some
         other angle, so its label print is still rotated differently from the
         live deck's rest pose. Re-shoot that frame at the end of this scroll
         and the two agree permanently. */
      const spinDown = spinDownRef.current;
      const total = scrollSpinRef.current + freeSpinRef.current;
      if (spinDown >= 1) {
        spinTargetRef.current = null;
      } else if (spinTargetRef.current === null) {
        spinTargetRef.current = Math.ceil(total / 360) * 360;
      }

      let angle = total;
      if (spinTargetRef.current !== null) {
        const k = 1 - spinDown;
        angle = total + (spinTargetRef.current - total) * (k * k * (3 - 2 * k));
      }

      stage?.style.setProperty('--spin', `${angle.toFixed(1)}deg`);
    };

    const startLoop = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stopLoop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    // rAF does not fire on a hidden tab, so `last` would be stale on return and
    // the record would teleport by however long the tab was in the background.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stopLoop();
      else if (inViewRef.current) startLoop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const presence = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => {
        inViewRef.current = self.isActive;
        if (self.isActive && document.visibilityState !== 'hidden') startLoop();
        else stopLoop();
      },
    });

    onUpdate(0);
    stage?.style.setProperty('--spin', '0deg');
    if (presence.isActive) startLoop();

    const to = setTimeout(() => ScrollTrigger.refresh(), 180);
    return () => {
      clearTimeout(to);
      stopLoop();
      document.removeEventListener('visibilitychange', onVisibility);
      play.kill();
      presence.kill();
    };
  }, []);

  return (
    <section ref={sectionRef} id="about" className="tt-section" aria-label="About GDG CRCE">
      <div ref={pinRef} className="tt-pin">
        {/* ── the turntable, in 1600×900 design space ── */}
        <div ref={stageRef} className="tt-stage">
          {/* Dark backing — only shows through the knob that is masked out of the
              base photo below; base.png covers everything else. */}
          <div className="tt-plinth" aria-hidden="true" />
          {/* Photoreal turntable base: plinth, platter, spindle and the tonearm
              MOUNT (no arm — our animated arm attaches at it). The record rides
              on top of this, the arm above that. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- large fixed
              photographic plate; next/image adds no value inside the GSAP stage */}
          <img className="tt-base" src={ik('/record player/base.png')} alt="" draggable={false} />

          {/* The record itself rotates — grooves, vinyl and all. The room
              light and the needle's groove highlight are NOT on the record, so
              they live in a separate, non-rotating layer of the same size. */}
          <div className="tt-disc" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element -- a background
                image cannot be pivoted on the pressing's off-centre spindle; the
                <img> lets us cancel the file's centring error so it spins true */}
            <img className="tt-disc-img" src={ik('/record player/disc.png')} alt="" draggable={false} />
          </div>
          <div className="tt-disc-optics" aria-hidden="true">
            <div ref={bandRef} className="tt-band" />
          </div>

          <div ref={labelRef} className="tt-label" aria-hidden="true">
            {TRACKS.map((t, i) => (
              <div
                key={t.key}
                ref={(el) => { labRefs.current[i] = el; }}
                className={`tt-lab tt-lab-${t.key}`}
              />
            ))}

            {/* THE PRINT RING — what actually makes a record look like it is
                spinning. A vinyl disc is rotationally symmetric everywhere
                except its label, so in real footage the ONLY thing your eye
                tracks is the printed artwork going round. Ring text and tick
                marks give it that, and they rotate by the same --spin as the
                disc. The copy in the middle stays upright because it has to
                stay readable — real labels get away with spinning text, a
                mission statement does not. */}
            <svg className="tt-label-print" viewBox="0 0 616 616">
              <defs>
                {/* r=264: the ring rides near the rim of the painted disc,
                    where the scan is brightest, so the dark ink always has
                    paint to read against */}
                <path
                  id="ttRimPath"
                  fill="none"
                  d="M 308,308 m -264,0 a 264,264 0 1,1 528,0 a 264,264 0 1,1 -528,0"
                />
              </defs>
              <g className="tt-label-print-spin">
                {/* evenly spaced radial ticks — a dashed stroke is the cheapest
                    honest way to draw 60 printed marks around a circle */}
                <circle
                  cx="308" cy="308" r="296"
                  fill="none"
                  stroke="rgba(0,0,0,0.32)"
                  strokeWidth="9"
                  strokeDasharray="2.5 28"
                />
                <circle
                  cx="308" cy="308" r="258"
                  fill="none"
                  stroke="rgba(0,0,0,0.20)"
                  strokeWidth="1.5"
                />
                <text className="tt-label-print-text">
                  {/* textLength forces the string to close the ring exactly
                      (2π·264 ≈ 1659), so there is never a bald patch drifting
                      past to give the trick away */}
                  <textPath href="#ttRimPath" startOffset="0" textLength="1659" lengthAdjust="spacing">
                    GDG CRCE · SYNÉCHEIA · WHAT CONTINUES, BECOMES GREATER · 33⅓ RPM ·
                  </textPath>
                </text>
              </g>
            </svg>
            <div className="tt-label-rim" />
            <div className="tt-label-dim" />
          </div>

          {/* ── tonearm ──
              Drawn pointing along +X from the pivot; the whole swing group is
              rotated about (146, 84) from the scroll callback. */}
          <svg className="tt-hardware" viewBox="0 0 1600 900" fill="none" aria-hidden="true">
            <g ref={armRef} className="tt-arm-swing">
              <image 
                href={ik('/record player/toneram.png')}
                x={TONEARM_X.toFixed(1)}
                y={TONEARM_Y.toFixed(1)}
                width={TONEARM_IMG_W}
                height={TONEARM_IMG_H}
              />
            </g>
          </svg>
        </div>

        {/* Photographic finish over the whole frame, under the text. */}
        <div className="tt-vignette" aria-hidden="true" />
        <div className="tt-grain" aria-hidden="true" />

        {/* ── text, in viewport space (see about.css header) ── */}
        <div className="tt-hud">

          <div className="tt-center">
            {TRACKS.map((t, i) => (
              <div
                key={t.key}
                ref={(el) => { copyRefs.current[i] = el; }}
                className={`tt-copy${t.brush ? '' : ' tt-copy-para'}`}
              >
                {t.brush && <span className="tt-copy-brush">{t.brush}</span>}
                {t.lines.map((line, j) => (
                  <span key={j} className="tt-copy-line">{line}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { whatWeDoSpreads } from './whatWeDoData';
import './whatwedo.css';

/* ── scalar helpers (same idiom as AboutSection) ───────────────────────── */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Eased ramp: 0 below `a`, 1 above `b`, smoothstep between. */
const ramp = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 2.2);

/** Total scroll length (px) the reveal is spread across. */
const SCROLL_PX = 8000;
/** Each page ≈ this fraction of the viewport width when the book is settled. */
const PAGE_FILL = 0.46;

/**
 * WhatWeDoSection — "the album that keeps its side B" (Act 2.5).
 *
 * The whole thing is a POSITION:FIXED overlay driven by scroll — it never
 * scrolls with the page, so there is no scroll-up/section jump. It switches on
 * the exact instant AboutSection releases its pin (trigger start `top bottom`),
 * showing the identical full-screen disco frame as its album cover. From there
 * one 0→1 progress runs four beats:
 *   0.08 – 0.50  the full-screen cover ZOOMS OUT and settles — you realise the
 *                frame you were looking at was the front cover of a book.
 *   0.30 – 0.60  the cover swings open on the spine; the book re-centres + tilts.
 *   0.60 – 0.92  the book flips through one liner-notes spread per thing we do.
 *   0.90 – 1.00  the backdrop cools to the 80s palette and darkens into the
 *                90s Events street entrance.
 *
 * Because the page aspect is set to the viewport aspect, the cover fills the
 * screen exactly at p≈0 and the seam from About is a pure zoom-out. Every
 * transform is written imperatively from refs (never React state) so the flip
 * stays on the compositor — same contract as EventsAndCouncilSection.
 */

const LINER_QUOTES = [
  'We don’t restart each year. We continue.',
  'Every batch adds its signal to the mix.',
  'The tech changes. The making doesn’t.',
  'Built by the people who kept showing up.',
  'What continues, becomes greater.',
];

export default function WhatWeDoSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null); // the fixed overlay
  const bookRef = useRef<HTMLDivElement>(null);
  const bookShadowRef = useRef<HTMLDivElement>(null);
  const edgesRef = useRef<HTMLDivElement>(null);
  const coverCopyRef = useRef<HTMLDivElement>(null);
  const leafRefs = useRef<(HTMLDivElement | null)[]>([]);
  const coolRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const formDimRef = useRef<HTMLDivElement>(null);
  const exitDimRef = useRef<HTMLDivElement>(null);

  // page geometry, recomputed to the viewport aspect (so the cover can fill it)
  const geom = useRef({ pw: 640, ph: 400, scaleFull: 2.17 });

  const N = whatWeDoSpreads.length;
  const L = N + 2; // cover(0) + N spread leaves + closing/back-cover leaf(L-1)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const applyGeom = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const pw = Math.round(w * PAGE_FILL);
      const ph = Math.round(pw * (h / w)); // page aspect === viewport aspect
      geom.current = { pw, ph, scaleFull: w / pw };
      if (pinRef.current) {
        pinRef.current.style.setProperty('--pw', `${pw}px`);
        pinRef.current.style.setProperty('--ph', `${ph}px`);
      }
    };
    applyGeom();

    /* Beat boundaries (single progress p). */
    const CONTENT_A = 0.6;
    const CONTENT_B = 0.92;
    const contentSeg = (CONTENT_B - CONTENT_A) / N;

    const setActive = (on: boolean) => {
      if (pinRef.current) pinRef.current.style.visibility = on ? 'visible' : 'hidden';
    };

    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top bottom', // switch on the moment About releases its pin
      end: 'bottom bottom',
      scrub: 0.6,
      onToggle: (self) => setActive(self.isActive),
      onRefresh: (self) => setActive(self.isActive),
      onUpdate: (self) => {
        const p = self.progress;
        const g = geom.current;

        /* ── Book: full-screen cover → zoom-out → tilt/centre → exit ───── */
        const zoom = easeOut(ramp(0.08, 0.5, p)); // fullscreen → settled
        const openness = ramp(0.3, 0.6, p); // cover flip + spread centering
        const exitT = ramp(0.9, 1.0, p);
        const tilt = ramp(0.28, 0.62, p) * 11; // tabletop rotateX (deg)
        const scale = lerp(g.scaleFull, 1.0, zoom) * (1 - 0.06 * exitT);
        const shiftX = openness * 0.5 * g.pw; // spine → viewport centre (local px)
        const exitY = exitT * 4;

        if (bookRef.current) {
          bookRef.current.style.transform =
            `translateY(${exitY.toFixed(2)}vh) rotateX(${tilt.toFixed(2)}deg) ` +
            `scale(${scale.toFixed(3)}) translateX(${shiftX.toFixed(1)}px)`;
        }

        // definition: cast shadow + page-block edges appear as the book lifts off
        const lift = ramp(0.12, 0.4, p);
        if (bookShadowRef.current) bookShadowRef.current.style.opacity = (lift * 0.85).toFixed(3);
        if (edgesRef.current) edgesRef.current.style.opacity = (lift * (1 - openness)).toFixed(3);
        if (vignetteRef.current) vignetteRef.current.style.opacity = (lift * 0.9).toFixed(3);

        // the "WHAT WE DO" sleeve type fades in only once we've pulled back
        if (coverCopyRef.current) {
          const c = ramp(0.14, 0.32, p);
          coverCopyRef.current.style.opacity = c.toFixed(3);
          coverCopyRef.current.style.transform = `translateY(${((1 - c) * 8).toFixed(2)}%)`;
        }

        // brief warm bloom masks the frame→cover detach
        if (formDimRef.current) {
          const d = p < 0.12 ? ramp(0.02, 0.12, p) : 1 - ramp(0.12, 0.24, p);
          formDimRef.current.style.opacity = (clamp01(d) * 0.5).toFixed(3);
        }

        /* ── Leaf flips (cover + one per spread) ──────────────────────── */
        for (let i = 0; i < L; i++) {
          const leaf = leafRefs.current[i];
          if (!leaf) continue;

          let f: number; // 0 = closed/right, 1 = open/left
          if (i === 0) {
            f = openness;
          } else if (i <= L - 2) {
            const start = CONTENT_A + (i - 1) * contentSeg;
            f = ramp(start, start + contentSeg * 0.62, p);
          } else {
            f = 0; // back-cover leaf stays put; it is the last right-hand page
          }

          const rot = f * -180;
          const zt = f < 0.5 ? (L - i) * 0.5 : -(i * 0.5);
          leaf.style.transform = `rotateY(${rot.toFixed(2)}deg) translateZ(${zt.toFixed(2)}px)`;

          let z: number;
          if (f <= 0.001) z = 100 - i;
          else if (f >= 0.999) z = 100 + i;
          else z = 300 + i;
          leaf.style.zIndex = String(z);

          leaf.style.filter = `brightness(${(1 - 0.16 * Math.sin(f * Math.PI)).toFixed(3)})`;
        }

        /* ── Beat 4: cool + darken into the Events street ─────────────── */
        if (coolRef.current) coolRef.current.style.opacity = (ramp(0.9, 1.0, p) * 0.92).toFixed(3);
        if (exitDimRef.current) exitDimRef.current.style.opacity = (ramp(0.93, 1.0, p) * 0.72).toFixed(3);
      },
    });

    const onResize = () => applyGeom();
    window.addEventListener('resize', onResize);
    const to = setTimeout(() => ScrollTrigger.refresh(), 160);
    return () => {
      clearTimeout(to);
      window.removeEventListener('resize', onResize);
      st.kill();
    };
  }, [L, N]);

  const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  };

  return (
    <section
      ref={sectionRef}
      id="what-we-do"
      className="whatwedo-section"
      aria-label="What GDG CRCE does"
      style={{ height: `${SCROLL_PX}px` }}
    >
      {/* Fixed overlay — never scrolls with the page (no scroll-up), toggled by the trigger */}
      <div ref={pinRef} className="wwd-pin">
        {/* Backdrops / the table */}
        <div className="wwd-warm" />
        <div ref={coolRef} className="wwd-cool" />
        <div ref={vignetteRef} className="wwd-vignette" />

        {/* The album book */}
        <div className="wwd-stage">
          <div ref={bookRef} className="wwd-book">
            <div ref={bookShadowRef} className="wwd-book-shadow" />

            {/* closed-book thickness (fades out once the cover is open) */}
            <div ref={edgesRef} className="wwd-edges" style={{ opacity: 0 }}>
              <div className="wwd-edge wwd-edge-right" />
              <div className="wwd-edge wwd-edge-bottom" />
            </div>

            {/* Leaf 0 — the cover (front = disco sleeve, back = inside-front intro) */}
            <div
              ref={(el) => {
                leafRefs.current[0] = el;
              }}
              className="wwd-leaf"
              style={{ zIndex: 100 }}
            >
              <div className="wwd-face front wwd-cover-face">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="wwd-cover-img"
                  src="/whatwedo-cover.jpg"
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  onError={hideOnError}
                />
                <div className="wwd-cover-shade" />
                <div className="wwd-cover-frame" />
                <div ref={coverCopyRef} className="wwd-cover-copy" style={{ opacity: 0 }}>
                  <div className="wwd-cover-kicker">GDG CRCE · The Record</div>
                  <h2>WHAT WE DO</h2>
                  <div className="wwd-cover-sub">Side A / Side B — open to play ▸</div>
                </div>
              </div>
              <div className="wwd-face back wwd-paper">
                <div className="wwd-holes">
                  <span /><span /><span /><span /><span />
                </div>
                <div className="wwd-inside">
                  <div className="wwd-side">Inside cover · Liner notes</div>
                  <h3>Not a highlight reel. A working record.</h3>
                  <p>
                    Everything on these pages is something GDG CRCE actually runs — the
                    workshops, the builds, the late nights and the people who keep the
                    momentum going. Turn the page.
                  </p>
                </div>
              </div>
            </div>

            {/* Leaves 1..N — one spread each */}
            {whatWeDoSpreads.map((s, idx) => {
              const i = idx + 1;
              return (
                <div
                  key={s.no}
                  ref={(el) => {
                    leafRefs.current[i] = el;
                  }}
                  className="wwd-leaf"
                  style={{ zIndex: 100 - i, '--wwd-accent': s.accent } as React.CSSProperties}
                >
                  {/* front = the spread */}
                  <div className="wwd-face front wwd-paper">
                    <div className="wwd-holes">
                      <span /><span /><span /><span /><span />
                    </div>
                    <div className="wwd-page">
                      <div className="wwd-no">{s.no}</div>
                      <div className="wwd-tag">{s.tag}</div>
                      <div className="wwd-rule" />
                      <h3>{s.title}</h3>
                      <p>{s.body}</p>
                      <div className="wwd-foot">GDG CRCE // What We Do</div>
                    </div>
                    {s.asset && (
                      <div className="wwd-asset" style={{ transform: `rotate(${s.assetTilt ?? 0}deg)` }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.asset} alt="" aria-hidden="true" draggable={false} onError={hideOnError} />
                      </div>
                    )}
                  </div>
                  {/* back = a liner quote (the left page while reading the next spread) */}
                  <div className="wwd-face back wwd-paper">
                    <div className="wwd-holes">
                      <span /><span /><span /><span /><span />
                    </div>
                    <div className="wwd-liner">
                      <div className="wwd-side">{s.tag}</div>
                      <q>{LINER_QUOTES[idx % LINER_QUOTES.length]}</q>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Leaf L-1 — closing right page (CTA) + plain back cover */}
            <div
              ref={(el) => {
                leafRefs.current[L - 1] = el;
              }}
              className="wwd-leaf"
              style={{ zIndex: 100 - (L - 1) }}
            >
              <div className="wwd-face front wwd-paper">
                <div className="wwd-holes">
                  <span /><span /><span /><span /><span />
                </div>
                <div className="wwd-cta">
                  <div className="wwd-cta-kicker">Side B · Last track</div>
                  <h3>
                    The next chapter,<br />
                    <em>written by you.</em>
                  </h3>
                  <div className="wwd-cta-hint">Keep scrolling ↓</div>
                </div>
              </div>
              <div className="wwd-face back wwd-cover-face">
                <div className="wwd-cover-shade" />
                <div className="wwd-cover-frame" />
              </div>
            </div>
          </div>
        </div>

        {/* Transition masks */}
        <div ref={formDimRef} className="wwd-form-dim" />
        <div ref={exitDimRef} className="wwd-exit-dim" />
      </div>
    </section>
  );
}

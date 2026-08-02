'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { clamp01, currentIntroPhases, ramp } from '@/lib/introTimeline';
import './home.css';

const TITLE = 'GDG CRCE';

/**
 * Which glyph the push-in is aimed at, and where inside it.
 *
 * This matters more than it looks. Scaling type up about the centre of the
 * LINE puts the origin in the word space between "GDG" and "CRCE" — a gap, so
 * the middle of the screen would stay black while the letters flew off the
 * edges, which is the exact opposite of the effect. The origin has to sit on
 * ink. Index 1 is the D of GDG and 0.16 of the way across its cell is its left
 * stem: a solid vertical bar that grows to fill the frame.
 */
const FOCUS_CHAR = 1;
const FOCUS_X_IN_CHAR = 0.16;

/**
 * How far the type is pushed in.
 *
 * Capped, and the cap is measured rather than chosen. Chrome lays glyphs out
 * linearly with scale only up to an effective font size of roughly 7,000px;
 * past that it clamps, and the letters keep growing sub-linearly — measured on
 * this title at 1280×720: dead-on to 36×, 0.84 of expected at 52×, 0.36 at
 * 150×. A push that decelerates in its last frames, exactly where it should be
 * accelerating, is the one thing this shot cannot afford. 40× keeps every
 * frame inside the linear region (185.6 × 40 ≈ 7.4k).
 *
 * 40× is not enough for one letter's stem to cover the viewport on its own —
 * that is what the iris below is for.
 */
const MAX_SCALE = 40;

/**
 * The last beat: an iris opening out of the letter.
 *
 * The type alone cannot finish the reveal (see the cap above), and dissolving
 * the black sheet instead would show two large flat black fields fading out on
 * either side of the stem — a cross-fade, not a push. So a circle, in screen
 * space, joins the mask partway through. It starts small enough to sit
 * entirely inside the stem the camera is flying into, so it is invisible when
 * it arrives; then it outruns the type and floods the frame.
 *
 * A circle has no font metrics to clamp and no glyph outline to guess at, so
 * this cannot produce a hard edge in the wrong place — worst case it emerges a
 * little early and reads as exactly what it is, an iris opening. Which is also
 * the shot the hero closed with.
 */
const IRIS_START = 0.55;
const IRIS_POWER = 3;

/**
 * Act 1.5 — the title card.
 *
 * Sits under the hero video and over everything else, and is on screen for
 * exactly three phases of scroll (see `src/lib/introTimeline.ts`):
 *
 *   iris   solid black. This is what the hero's closing iris closes *to* —
 *          without a black sheet under it you would see the turntable through
 *          the shrinking circle.
 *   title  "GDG CRCE" fades up on the black.
 *   zoom   the letters stop being white and become holes onto the About
 *          section, then push in until they have swallowed the frame.
 *
 * After that the whole layer is hidden and costs nothing for the rest of the
 * page.
 */
export default function HomeSection() {
  const rootRef = useRef<HTMLElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const maskRef = useRef<SVGMaskElement | null>(null);
  const maskBgRef = useRef<SVGRectElement | null>(null);
  const sheetRef = useRef<SVGRectElement | null>(null);
  const maskTextRef = useRef<SVGTextElement | null>(null);
  const irisRef = useRef<SVGCircleElement | null>(null);
  const solidTextRef = useRef<SVGTextElement | null>(null);
  const maskGroupRef = useRef<SVGGElement | null>(null);
  const solidGroupRef = useRef<SVGGElement | null>(null);

  /** Push-in origin, in SVG user units (= CSS px, the viewBox is 1:1). */
  const focusRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    /* ── layout ───────────────────────────────────────────────────────────
       The viewBox is set to the pixel size of the viewport, so every number
       below is just CSS pixels and the two text copies land on the same
       subpixel. Re-run on resize and once the webfont has actually loaded —
       the fallback face measures differently, and the focus point is measured
       off the glyph. */
    const layout = () => {
      const svg = svgRef.current;
      const maskText = maskTextRef.current;
      const solidText = solidTextRef.current;
      if (!svg || !maskText || !solidText) return;

      const w = window.innerWidth;
      const h = window.innerHeight;
      // Nothing here divides by zero, but everything here MEASURES: a glyph box
      // read out of a zero-sized viewport is a zero-sized glyph box, and the
      // focus point derived from it is the origin. Wait for a real viewport —
      // the ResizeObserver below calls back the moment there is one.
      if (w < 1 || h < 1) return;

      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

      for (const rect of [maskBgRef.current, sheetRef.current]) {
        if (!rect) continue;
        rect.setAttribute('x', '0');
        rect.setAttribute('y', '0');
        rect.setAttribute('width', String(w));
        rect.setAttribute('height', String(h));
      }

      const mask = maskRef.current;
      if (mask) {
        mask.setAttribute('x', '0');
        mask.setAttribute('y', '0');
        mask.setAttribute('width', String(w));
        mask.setAttribute('height', String(h));
      }

      // Big, but never wider than the frame it has to sit inside.
      const fontSize = Math.min(w * 0.145, h * 0.26);
      for (const text of [maskText, solidText]) {
        text.setAttribute('x', String(w / 2));
        text.setAttribute('y', String(h / 2));
        text.style.fontSize = `${fontSize}px`;
      }

      // Measure the push-in origin off the real glyph box, and fall back down
      // a ladder — glyph, then whole line, then simply the middle of the
      // screen. Every rung has to be inside its own try: `getBBox()` on an
      // unrendered SVG throws in Firefox, and a throw here would abandon the
      // rest of the layout.
      let focus: { x: number; y: number } | null = null;
      try {
        const ext = maskText.getExtentOfChar(FOCUS_CHAR);
        if (ext.width > 0) {
          focus = { x: ext.x + ext.width * FOCUS_X_IN_CHAR, y: ext.y + ext.height * 0.5 };
        }
      } catch {}
      if (!focus) {
        try {
          const bb = maskText.getBBox();
          if (bb.width > 0) focus = { x: bb.x + bb.width * 0.155, y: bb.y + bb.height * 0.5 };
        } catch {}
      }
      focusRef.current = focus ?? { x: w / 2, y: h / 2 };
    };

    /* ── the scroll ───────────────────────────────────────────────────── */
    const apply = (scrollPx: number) => {
      const root = rootRef.current;
      const svg = svgRef.current;
      const maskText = maskTextRef.current;
      if (!root || !svg || !maskText) return;

      const ph = currentIntroPhases();

      // Phase 2 — the type fades up on black.
      const titleIn = ramp(ph.title.start, ph.title.end, scrollPx);

      // Phase 4 — knockout, then push in.
      const zoomP = clamp01((scrollPx - ph.zoom.start) / (ph.zoom.end - ph.zoom.start));

      // The letters turn from white ink into windows over the first tenth of
      // the push-in, while they are still effectively still. Two halves of one
      // cross-fade: what leaves is exactly what arrives, in the same place.
      const hole = ramp(0, 0.1, zoomP);
      maskText.setAttribute('fill-opacity', hole.toFixed(4));
      solidGroupRef.current?.setAttribute('opacity', (titleIn * (1 - hole)).toFixed(4));

      // Exponential push: equal scroll buys equal *proportional* growth, which
      // is what reads as constant-speed motion toward a subject.
      //
      // The 1.5 exponent is the compromise between two failures. Linear (1.0)
      // and the type is already tearing off the screen while the cross-fade is
      // still resolving. Squared (2.0) — the first cut — spends the first third
      // of the push under 1.4×, which on a scrubbed scroll feels like the wheel
      // has stopped doing anything, and is the other half of why the reveal
      // went unnoticed.
      const scale = Math.exp(Math.pow(zoomP, 1.5) * Math.log(MAX_SCALE));

      // The origin sits on the D's stem, which is left of centre. Drifting it
      // to the middle of the screen as the push starts hides that: it reads as
      // the camera settling on its subject.
      //
      // Spread across half the push on purpose. Measured at 1280×720 the drift
      // is ~350px; done quickly, while the type is still near 1:1, that is a
      // visible sideways slide. Done across the stretch where the scale is
      // already climbing past 4×, it disappears into the push — and it is
      // finished well before the iris needs a fixed centre to open from.
      const { x: fx, y: fy } = focusRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const k = ramp(0.05, 0.5, zoomP);
      const cx = fx + (w / 2 - fx) * k;
      const cy = fy + (h / 2 - fy) * k;
      const transform =
        `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) ` +
        `scale(${scale.toFixed(4)}) ` +
        `translate(${(-fx).toFixed(2)} ${(-fy).toFixed(2)})`;

      maskGroupRef.current?.setAttribute('transform', transform);
      solidGroupRef.current?.setAttribute('transform', transform);

      // The iris, in screen space, centred on whatever the push is flying into.
      // Radius runs to the corner of the viewport, so at the end the sheet is
      // gone by geometry rather than by opacity.
      const iris = irisRef.current;
      if (iris) {
        const t = clamp01((zoomP - IRIS_START) / (1 - IRIS_START));
        const r = Math.hypot(w, h) * 0.52 * Math.pow(t, IRIS_POWER);
        iris.setAttribute('cx', cx.toFixed(2));
        iris.setAttribute('cy', cy.toFixed(2));
        iris.setAttribute('r', r.toFixed(2));
      }

      // Pure insurance, over the last 3%: by then the iris alone already covers
      // the frame. If this is ever doing visible work, the iris is mistuned.
      const clear = ramp(0.97, 1, zoomP);
      svg.style.opacity = (1 - clear).toFixed(4);
      root.style.visibility = clear >= 1 ? 'hidden' : 'visible';
    };

    const st = ScrollTrigger.create({
      trigger: document.body,
      start: 0,
      end: () => currentIntroPhases().total,
      scrub: 0.6,
      onUpdate: (self) => apply(self.progress * currentIntroPhases().total),
      onRefresh: (self) => apply(self.progress * currentIntroPhases().total),
    });

    const onResize = () => {
      layout();
      apply(window.scrollY);
    };

    layout();
    apply(0);
    window.addEventListener('resize', onResize);
    // `resize` alone is not enough: a viewport that starts at zero and is
    // handed a size later (a pane being opened, a restored background tab)
    // does not always fire one, and the layout above bails out at zero. The
    // observer is the signal that the box is real.
    const ro = new ResizeObserver(onResize);
    if (rootRef.current) ro.observe(rootRef.current);
    // The focus point is measured off a glyph, so it is wrong until the real
    // face is in. `fonts.ready` is the only honest signal for that.
    document.fonts?.ready.then(onResize).catch(() => {});

    return () => {
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      st.kill();
    };
  }, []);

  return (
    <section ref={rootRef} id="home" className="home-section" aria-label="GDG CRCE">
      <h1 className="home-title-sr">{TITLE}</h1>
      <svg ref={svgRef} className="home-canvas" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <mask id="home-title-knockout" maskUnits="userSpaceOnUse">
            {/* white keeps, black cuts — the two black shapes below simply union */}
            <rect ref={maskBgRef} fill="#fff" />
            <g ref={maskGroupRef}>
              <text ref={maskTextRef} className="home-title" fill="#000" fillOpacity={0}>
                {TITLE}
              </text>
            </g>
            {/* Screen space, deliberately outside the scaled group. */}
            <circle ref={irisRef} fill="#000" cx={0} cy={0} r={0} />
          </mask>
        </defs>

        {/* The black screen itself, with the title cut out of it. */}
        <rect ref={sheetRef} fill="#000" mask="url(#home-title-knockout)" />

        {/* The readable title, sitting exactly over its own holes. */}
        <g ref={solidGroupRef} opacity={0}>
          <text ref={solidTextRef} className="home-title" fill="#F4F2ED">
            {TITLE}
          </text>
        </g>
      </svg>
    </section>
  );
}

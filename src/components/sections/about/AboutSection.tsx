'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './about.css';

/* No SSR for the WebGL disco ball. */
const DiscoBallScene = dynamic(() => import('@/components/three/DiscoBallScene'), {
  ssr: false,
});

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Eased ramp: 0 below `a`, 1 above `b`, smoothstep between. */
const ramp = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Accelerating ramp (ease-in) — used so the zoom keeps rushing into the dot. */
const easeIn = (a: number, b: number, x: number, pow = 1.7) =>
  Math.pow(clamp01((x - a) / (b - a)), pow);

const ZOOM_MAX = 6; // how far the frame pushes into the red dot before the bloom

/**
 * AboutSection — "the shimmer that never stops".
 *
 * Picks up exactly where the hero video freezes (on the Samvad frame). One
 * pinned ScrollTrigger drives a single 0→1 progress through five beats:
 *   0.00 – 0.50  scroll rushes the frame INTO the red REC dot; the dot pulses
 *                and intensifies from a flat graphic to an over-exposed light.
 *   0.50 – 0.60  BLOOM BURST: a white flash peaks to mask the 2D→3D swap.
 *   0.56 – 0.72  the 3D disco-ball canvas fades in as the bloom cools to amber.
 *   0.60 – 0.97  the ball dollies out from a facet close-up and settles.
 *   0.80 – 0.98  the About Us copy rises into place.
 *
 * The 3D settle and rotation are handed to Three.js through refs (never state)
 * so the camera + spin stay off the React render path — same pattern as
 * EventsAndCouncilSection's progressRef. The ball rotates ONLY on scroll.
 */
export default function AboutSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const photoWrapRef = useRef<HTMLDivElement>(null);
  const overlaysRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const bloomRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<number>(0);
  const rotationRef = useRef<number>(0);

  const [active, setActive] = useState(false);
  const [mounted3D, setMounted3D] = useState(false);

  // Render (and first-mount) the WebGL scene only near the viewport, so it costs
  // nothing while the user is still up in the hero section.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const on = entries[0].isIntersecting;
        setActive(on);
        if (on) setMounted3D(true);
      },
      { rootMargin: '300px 0px 300px 0px', threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      pin: containerRef.current,
      start: 'top top',
      end: '+=5600',
      scrub: 0.7,
      onUpdate: (self) => {
        const p = self.progress;

        // --rec (0→1) is the over-exposure amount, read by the glow + bloom which
        // are both anchored to the red dot ALREADY in the photo (--dot-x/--dot-y).
        // We never draw a dot of our own.
        if (containerRef.current) {
          containerRef.current.style.setProperty('--rec', ramp(0.06, 0.5, p).toFixed(3));
        }

        // Scroll rushes the frame INTO that red dot (transform-origin sits on it
        // in CSS). The whole frame then fades under the bloom.
        if (photoWrapRef.current) {
          const scale = 1 + easeIn(0, 0.5, p) * (ZOOM_MAX - 1);
          photoWrapRef.current.style.transform = `scale(${scale.toFixed(3)})`;
          photoWrapRef.current.style.opacity = (1 - ramp(0.55, 0.68, p)).toFixed(3);
        }
        if (overlaysRef.current) {
          overlaysRef.current.style.opacity = (1 - ramp(0.55, 0.68, p)).toFixed(3);
        }

        // Hard white peak around 0.60 — the actual mask over the swap.
        if (flashRef.current) {
          const f = p < 0.6 ? ramp(0.5, 0.6, p) : 1 - ramp(0.6, 0.72, p);
          flashRef.current.style.opacity = clamp01(f).toFixed(3);
        }

        // Warm radial bloom rises with the flash, then lingers and cools out,
        // easing the eye from over-exposed white into the amber nightclub.
        if (bloomRef.current) {
          const b = p < 0.62 ? ramp(0.48, 0.62, p) : 1 - ramp(0.62, 0.86, p);
          bloomRef.current.style.opacity = (clamp01(b) * 0.95).toFixed(3);
        }

        // 3D canvas fades in behind the bloom.
        if (canvasWrapRef.current) {
          canvasWrapRef.current.style.opacity = ramp(0.56, 0.72, p).toFixed(3);
        }

        // Hand settle + scroll-rotation to Three.js.
        revealRef.current = ramp(0.6, 0.97, p);
        rotationRef.current = clamp01((p - 0.5) / 0.5); // linear ¼→full over the reveal

        // About Us copy rises in last.
        if (contentRef.current) {
          const c = ramp(0.8, 0.98, p);
          contentRef.current.style.opacity = c.toFixed(3);
          contentRef.current.style.transform = `translateY(${((1 - c) * 44).toFixed(1)}px)`;
          contentRef.current.style.pointerEvents = c > 0.5 ? 'auto' : 'none';
        }
      },
    });

    const to = setTimeout(() => ScrollTrigger.refresh(), 160);
    return () => {
      clearTimeout(to);
      st.kill();
    };
  }, []);

  return (
    <section ref={sectionRef} id="about" className="about-section" aria-label="About GDG CRCE">
      <div ref={containerRef} className="about-pin">
        {/* 3D disco ball (behind everything) */}
        <div ref={canvasWrapRef} className="about-canvas">
          {mounted3D && (
            <DiscoBallScene revealRef={revealRef} rotationRef={rotationRef} active={active} />
          )}
        </div>

        {/* The real 1987 Samvad frame — scroll zooms it into its own red dot. */}
        <div ref={photoWrapRef} className="samvad-photo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="samvad-photo"
            src="/samvad-frame.jpg"
            alt="GDG CRCE — Samvad, 1987"
            draggable={false}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Analog overlays for cohesion during the zoom */}
        <div ref={overlaysRef} className="samvad-overlays">
          <div className="samvad-scanlines" />
          <div className="samvad-grain" />
          <div className="samvad-vignette" />
        </div>

        {/* Over-exposure glow — a LIGHT anchored to the dot already in the photo
            (never a drawn dot). Scroll intensifies it into the bloom. */}
        <div className="samvad-dot-glow" aria-hidden="true" />

        {/* Bloom burst — masks the 2D→3D coordinate swap */}
        <div ref={bloomRef} className="samvad-bloom" />
        <div ref={flashRef} className="samvad-flash" />

        {/* About Us copy */}
        <div ref={contentRef} className="about-content">
          <div className="kicker">GDG CRCE // About</div>
          <h2>
            What continues,
            <br />
            <em>becomes greater.</em>
          </h2>
          <p>
            Google Developer Group CRCE is a student-led community of builders, designers and
            dreamers. Every council inherits the work, the culture and the momentum of the one
            before it — and adds its own signal to the mix. We don&rsquo;t restart each year. We
            continue.
          </p>
          <div className="tagline">Sunékheia — the shimmer that never stops.</div>
        </div>
      </div>
    </section>
  );
}

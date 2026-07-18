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
const ABOUT_TEXTS = [
  {
    kicker: 'GDG CRCE // About',
    heading: <>What continues,<br /><em>becomes greater.</em></>,
    body: 'Google Developer Group CRCE is a student-led community of builders, designers and dreamers. Every council inherits the work, the culture and the momentum of the one before it — and adds its own signal to the mix. We don’t restart each year. We continue.',
  },
  {
    kicker: 'GDG CRCE // Legacy',
    heading: <>From analog roots,<br /><em>to digital futures.</em></>,
    body: 'We honor the builders of the past who laid the foundation. Their momentum fuels our drive to push the boundaries of what’s possible. The technology changes, but the spirit of creation remains constant.',
  },
  {
    kicker: 'GDG CRCE // Community',
    heading: <>A collective of<br /><em>passionate creators.</em></>,
    body: 'More than just code, we are a network of peers supporting each other. Through workshops, hackathons, and late-night debugging sessions, we build both software and lifelong connections.',
  },
  {
    kicker: 'GDG CRCE // Future',
    heading: <>The next chapter,<br /><em>written by you.</em></>,
    body: 'Whether you’re writing your first line of code or deploying complex systems, there’s a place for you here. Step in, add your unique voice to the mix, and make your mark on the legacy.',
  },
];

export default function AboutSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const photoWrapRef = useRef<HTMLDivElement>(null);
  const overlaysRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const bloomRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
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
      end: '+=12000', // Increased from 9000 for a slower, more cinematic scroll duration
      scrub: 0.7,
      onUpdate: (self) => {
        const p = self.progress;

        // --rec (0→1) is the over-exposure amount, read by the glow + bloom which
        // are both anchored to the red dot ALREADY in the photo (--dot-x/--dot-y).
        // We never draw a dot of our own.
        if (containerRef.current) {
          containerRef.current.style.setProperty('--rec', ramp(0.02, 0.12, p).toFixed(3));
        }

        // Scroll rushes the frame INTO that red dot
        if (photoWrapRef.current) {
          const scale = 1 + easeIn(0, 0.12, p) * (ZOOM_MAX - 1);
          photoWrapRef.current.style.transform = `scale(${scale.toFixed(3)})`;
          photoWrapRef.current.style.opacity = (1 - ramp(0.12, 0.16, p)).toFixed(3);
        }
        if (overlaysRef.current) {
          overlaysRef.current.style.opacity = (1 - ramp(0.12, 0.16, p)).toFixed(3);
        }

        // Hard white peak around 0.14
        if (flashRef.current) {
          const f = p < 0.14 ? ramp(0.10, 0.14, p) : 1 - ramp(0.14, 0.20, p);
          flashRef.current.style.opacity = clamp01(f).toFixed(3);
        }

        // Warm radial bloom rises with the flash, then lingers and cools out
        if (bloomRef.current) {
          const b = p < 0.15 ? ramp(0.10, 0.15, p) : 1 - ramp(0.15, 0.30, p);
          bloomRef.current.style.opacity = (clamp01(b) * 0.95).toFixed(3);
        }

        // 3D canvas fades in behind the bloom early on
        if (canvasWrapRef.current) {
          canvasWrapRef.current.style.opacity = ramp(0.13, 0.20, p).toFixed(3);
        }

        // Hand settle + scroll-rotation to Three.js.
        // Settle completes by 0.35, rotation spans the whole scroll.
        revealRef.current = ramp(0.14, 0.35, p);
        rotationRef.current = clamp01((p - 0.10) / 0.90);

        // Sequential About Us copy: enters from right, WAITS, and exits to left.
        const textStartP = 0.35; // Starts precisely when the disco ball finishes settling
        const textEndP = 1.0;
        const range = textEndP - textStartP;
        const segment = range / ABOUT_TEXTS.length;

        ABOUT_TEXTS.forEach((_, i) => {
          const el = contentRefs.current[i];
          if (!el) return;

          const start = textStartP + i * segment;
          const end = start + segment;
          
          // Allocate 30% of this text's duration to entering, 30% to exiting for a slower, smoother cinematic fade
          // The middle 40% is a wait (plateau) where the user reads
          const fadeLen = segment * 0.30;
          
          const enterProgress = ramp(start, start + fadeLen, p);
          const exitProgress = ramp(end - fadeLen, end, p);
          
          const opacity = enterProgress - exitProgress;
          
          const translateX = (1 - enterProgress) * 40 - exitProgress * 40;
          
          el.style.opacity = Math.max(0, Math.min(1, opacity)).toFixed(3);
          el.style.transform = `translateX(${translateX.toFixed(2)}vw)`;
          el.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
          
          // Sync text shimmer with disco ball rotation
          el.style.setProperty('--shimmer-pos', `${(rotationRef.current * 200).toFixed(1)}%`);
        });
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

        {/* Sequential About Us copy */}
        {ABOUT_TEXTS.map((content, i) => (
          <div
            key={i}
            ref={(el) => {
              contentRefs.current[i] = el;
            }}
            className="about-content"
          >
            <div className="kicker">{content.kicker}</div>
            <h2>{content.heading}</h2>
            <p>{content.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * ContactSection — Act 4: "CONTACT US" (2000s era)
 *
 * Integrated into the global Windows XP desktop: the Council window minimizes
 * into its taskbar button while the Contact window maximizes out of the
 * existing "Contact Us" tab (the bar here is the same persistent taskbar
 * carried across the pin — no new button is created).
 *
 * Hands are the raster Creation-of-Adam scans from public/Contact_us/,
 * screen-blended over a darkened bgi.jpg so their black backgrounds vanish.
 *
 * Scroll phases (single progress scalar, mutable ref pattern):
 *   0.00–0.16  XP handoff: Council minimizes, Contact maximizes from its tab
 *   0.00–0.55  hands translate in from the margins while scaling up
 *   0.30–0.55  GDG logo materializes between the converging fingertips
 *   0.58–0.85  map zooms outward from the logo; socials drop to the base
 *   0.80–0.96  hands yield (retract + fade) so the map stays readable
 */

const CONTACT = {
  email: 'crcegdsc@gmail.com',
  address:
    'Fr. Conceicao Rodrigues College of Engineering, Bandstand, Bandra (W) Mumbai - 400050',
  mapSrc:
    'https://maps.google.com/maps?q=Fr.%20Conceicao%20Rodrigues%20College%20of%20Engineering%2C%20Bandstand%2C%20Bandra%20West%2C%20Mumbai&z=16&output=embed',
  links: [
    {
      id: 'github',
      label: 'GitHub',
      href: 'https://github.com/CRCE-GDSC',
      icon: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/company/gdsc-crce/',
      icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z',
    },
    {
      id: 'instagram',
      label: 'Instagram',
      href: 'https://www.instagram.com/gdg_crce/',
      icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
    },
    {
      id: 'email',
      label: 'Email',
      href: 'mailto:crcegdsc@gmail.com',
      icon: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
    },
  ] as const,
};

/* 2000s era palette (locked — see CLAUDE.md era table) */
const ERA = { primary: '#00D4E8' };

const NEON_GLOW =
  '0 0 6px rgba(0,212,232,0.95), 0 0 18px rgba(0,212,232,0.55), 0 0 44px rgba(0,212,232,0.3)';

const TASKBAR_H = 32;

/* Bliss wallpaper gradient — identical to .xp-desktop-canvas in council.css so
   the desktop never visually breaks between the two acts. */
const BLISS =
  'linear-gradient(180deg, #1b66df 0%, #3e88f5 35%, #76bbf8 58%, #9fd8fc 65%, #469c28 65.1%, #3b841a 80%, #296010 100%)';

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const phase = (p: number, from: number, to: number) =>
  easeInOutCubic(Math.min(Math.max((p - from) / (to - from), 0), 1));

export default function ContactSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<number>(0);
  const contactWindowRef = useRef<HTMLDivElement>(null);
  const prevWindowRef = useRef<HTMLDivElement>(null);
  const prevTabRef = useRef<HTMLDivElement>(null);
  const contactTabRef = useRef<HTMLDivElement>(null);
  const leftHandRef = useRef<HTMLDivElement>(null);
  const rightHandRef = useRef<HTMLDivElement>(null);
  const sparkRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const socialRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const apply = (p: number) => {
      const winT = phase(p, 0, 0.16);
      /* Out-ease: hands are visibly moving on the first pixel of scroll. */
      const handE = easeOutCubic(Math.min(p / 0.55, 1));
      const logoE = phase(p, 0.3, 0.55);
      const mapE = phase(p, 0.58, 0.85);
      const fadeE = phase(p, 0.8, 0.96);

      /* Contact window maximizes OUT of its existing taskbar tab. */
      if (contactWindowRef.current) {
        contactWindowRef.current.style.transform = `scale(${lerp(0.06, 1, winT)})`;
        contactWindowRef.current.style.opacity = `${Math.min(1, winT * 2.5)}`;
        contactWindowRef.current.style.borderRadius = `${lerp(10, 0, winT)}px`;
      }
      /* Council window minimizes DOWN into its taskbar button. */
      if (prevWindowRef.current) {
        prevWindowRef.current.style.transform = `translate3d(${lerp(0, -34, winT)}vw, ${lerp(0, 44, winT)}vh, 0) scale(${lerp(1, 0.04, winT)})`;
        prevWindowRef.current.style.opacity = `${1 - winT}`;
      }
      /* Taskbar tabs swap pressed/unpressed state at the handoff midpoint. */
      const PRESSED = 'linear-gradient(180deg, #173d91 0%, #102d6b 100%)';
      const RAISED = 'linear-gradient(180deg, #3a75e8 0%, #2053c0 100%)';
      const PRESSED_SHADOW = 'inset 2px 2px 3px rgba(0,0,0,0.6)';
      const RAISED_SHADOW = 'inset 1px 1px 0 rgba(255,255,255,0.25)';
      if (prevTabRef.current) {
        prevTabRef.current.style.background = winT < 0.5 ? PRESSED : RAISED;
        prevTabRef.current.style.boxShadow = winT < 0.5 ? PRESSED_SHADOW : RAISED_SHADOW;
        prevTabRef.current.style.opacity = `${lerp(1, 0.65, winT)}`;
      }
      if (contactTabRef.current) {
        contactTabRef.current.style.background = winT < 0.5 ? RAISED : PRESSED;
        contactTabRef.current.style.boxShadow = winT < 0.5 ? RAISED_SHADOW : PRESSED_SHADOW;
      }

      /* Raster hands: glide in, scale up to fill the frame, then yield. */
      const handScale = lerp(0.85, 1.12, handE);
      if (leftHandRef.current) {
        const x = lerp(-75, -1.5, handE) - lerp(0, 8, fadeE);
        const y = lerp(7, 0, handE);
        leftHandRef.current.style.transform = `translate3d(${x}vw, calc(-50% + ${y}vh), 0) scale(${handScale})`;
        leftHandRef.current.style.opacity = `${1 - fadeE}`;
      }
      if (rightHandRef.current) {
        const x = lerp(75, 1.5, handE) + lerp(0, 8, fadeE);
        const y = lerp(-7, 0, handE);
        rightHandRef.current.style.transform = `translate3d(${x}vw, calc(-50% + ${y}vh), 0) scale(${handScale})`;
        rightHandRef.current.style.opacity = `${1 - fadeE}`;
      }
      if (sparkRef.current) {
        sparkRef.current.style.opacity = `${Math.pow(handE, 3) * (1 - mapE)}`;
        sparkRef.current.style.transform = `translate(-50%, -50%) scale(${0.6 + 0.6 * handE})`;
      }

      /* Logo materializes between the fingertips, then rises above the map. */
      if (logoRef.current) {
        logoRef.current.style.opacity = `${logoE}`;
        logoRef.current.style.transform = `translate3d(-50%, calc(-50% - ${lerp(0, 27, mapE)}vh), 0) scale(${lerp(0.8, 1, logoE) * lerp(1, 0.48, mapE)})`;
      }

      /* Map zooms outward from the logo's center point. */
      if (mapWrapRef.current) {
        mapWrapRef.current.style.opacity = `${mapE}`;
        mapWrapRef.current.style.transform = `translate(-50%, -50%) scale(${lerp(0.35, 1, mapE)})`;
        mapWrapRef.current.style.pointerEvents = mapE > 0.6 ? 'auto' : 'none';
      }
      /* Link row clearance = half the logo's clamped size + a vh gap, so it
         can never overlap the logo regardless of viewport proportions. */
      if (socialRowRef.current) {
        socialRowRef.current.style.transform = `translate3d(-50%, calc(clamp(70px, 9vw, 110px) + ${lerp(6, 20, mapE)}vh), 0)`;
      }
    };

    apply(0);

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      pin: containerRef.current,
      start: 'top top',
      end: '+=2200',
      scrub: 1.0,
      onUpdate: (self) => {
        progressRef.current = self.progress;
        apply(self.progress);
      },
    });

    return () => {
      trigger.kill();
    };
  }, []);

  return (
    <section ref={sectionRef} id="contact" className="relative" style={{ background: BLISS }}>
      <div
        ref={containerRef}
        className="relative h-screen w-full overflow-hidden"
        style={{ fontFamily: 'var(--font-00s-body), sans-serif', background: BLISS }}
      >
        {/* ══ Contact window — maximizes to fill the workspace above the bar ══ */}
        <div
          ref={contactWindowRef}
          className="absolute left-0 right-0 top-0 flex flex-col overflow-hidden"
          style={{
            bottom: TASKBAR_H,
            border: '3px solid #0055ea',
            borderRadius: 10,
            transform: 'scale(0.06)',
            opacity: 0,
            transformOrigin: '40% 100%',
            willChange: 'transform, opacity',
            boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
          }}
        >
          {/* XP title bar */}
          <div
            className="flex shrink-0 items-center justify-between px-3"
            style={{
              height: 30,
              background: 'linear-gradient(180deg, #2a68e0 0%, #1b4fc4 50%, #123a9a 100%)',
              fontFamily: "'Tahoma', 'Segoe UI', Arial, sans-serif",
            }}
          >
            <span className="text-[12px] font-bold text-white" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
              CONTACT US — GDG CRCE
            </span>
            <span className="flex gap-1">
              {['#3a75e8', '#3a75e8', '#d64031'].map((c, i) => (
                <span
                  key={i}
                  className="inline-block rounded-[3px]"
                  style={{ width: 18, height: 18, background: c, border: '1px solid rgba(255,255,255,0.5)' }}
                />
              ))}
            </span>
          </div>

          {/* Window body — crumpled-paper scan under a dark wash so the black
              hand plates screen-blend away and the cyan type glows */}
          <div
            className="relative flex-1"
            style={{
              backgroundImage: "url('/Contact_us/bgi.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 z-0" style={{ background: 'rgba(5,7,12,0.82)' }} />

            {/* Top center: header */}
            <h2
              className="absolute left-1/2 z-10 -translate-x-1/2 text-center"
              style={{
                top: '5.5vh',
                fontFamily: 'var(--font-00s-display), sans-serif',
                fontSize: 'clamp(2.1rem, 5.8vw, 4.2rem)',
                letterSpacing: '0.22em',
                color: ERA.primary,
                textShadow: NEON_GLOW,
                whiteSpace: 'nowrap',
              }}
            >
              CONTACT US
            </h2>

            {/* convergence spark (yields to the map) */}
            <div
              ref={sparkRef}
              className="pointer-events-none absolute left-1/2 top-1/2 z-[5]"
              style={{
                width: 'clamp(240px, 34vw, 460px)',
                height: 'clamp(240px, 34vw, 460px)',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(0,212,232,0.5) 0%, rgba(0,212,232,0.12) 45%, transparent 70%)',
                transform: 'translate(-50%, -50%) scale(0.6)',
                opacity: 0,
              }}
            />

            {/* Google Map — zooms outward from the logo's center point */}
            <div
              ref={mapWrapRef}
              className="absolute left-1/2 top-1/2 z-10 overflow-hidden"
              style={{
                width: 'clamp(320px, 58vw, 820px)',
                height: 'clamp(240px, 44vh, 430px)',
                transform: 'translate(-50%, -50%) scale(0.35)',
                opacity: 0,
                pointerEvents: 'none',
                willChange: 'transform, opacity',
                borderRadius: 10,
                border: '1px solid rgba(0,212,232,0.45)',
                boxShadow: '0 0 28px rgba(0,212,232,0.3), 0 12px 40px rgba(0,0,0,0.6)',
              }}
            >
              <iframe
                src={CONTACT.mapSrc}
                title="Fr. Conceicao Rodrigues College of Engineering — Google Maps"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                style={{ width: '100%', height: '100%', border: 0, filter: 'saturate(0.85) contrast(1.05)' }}
              />
            </div>

            {/* Center: GDG logo — appears as the hands converge */}
            <div
              ref={logoRef}
              className="absolute left-1/2 top-1/2 z-20 flex items-center justify-center rounded-full"
              style={{
                width: 'clamp(140px, 18vw, 220px)',
                height: 'clamp(140px, 18vw, 220px)',
                transform: 'translate3d(-50%, -50%, 0) scale(0.8)',
                opacity: 0,
                willChange: 'transform, opacity',
                background: 'rgba(10,14,24,0.78)',
                border: '1px solid rgba(0,212,232,0.45)',
                boxShadow: '0 0 26px rgba(0,212,232,0.35), inset 0 0 30px rgba(0,212,232,0.12)',
              }}
            >
              <Image
                src="/Contact_us/download.png"
                alt="GDG CRCE"
                width={220}
                height={220}
                style={{ width: '66%', height: 'auto' }}
              />
            </div>

            {/* Links — always cleanly below the logo, glide to the base */}
            <div
              ref={socialRowRef}
              className="absolute left-1/2 top-1/2 z-20 flex items-center gap-10"
              style={{
                transform: 'translate3d(-50%, calc(clamp(70px, 9vw, 110px) + 6vh), 0)',
                willChange: 'transform',
              }}
            >
              {CONTACT.links.map((s) => (
                <a
                  key={s.id}
                  href={s.href}
                  {...(s.id !== 'email' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  aria-label={s.label}
                  title={s.label}
                  className="group flex flex-col items-center gap-2"
                >
                  <span
                    className="flex items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
                    style={{
                      width: 'clamp(52px, 5.2vw, 64px)',
                      height: 'clamp(52px, 5.2vw, 64px)',
                      background: 'rgba(10,14,24,0.85)',
                      border: '1px solid rgba(0,212,232,0.35)',
                      boxShadow: '0 0 14px rgba(0,212,232,0.22)',
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="45%" height="45%" fill={ERA.primary}>
                      <path d={s.icon} />
                    </svg>
                  </span>
                  <span
                    className="text-[0.6rem] uppercase tracking-[0.25em]"
                    style={{ color: 'rgba(0,212,232,0.75)' }}
                  >
                    {s.label}
                  </span>
                </a>
              ))}
            </div>

            {/* Bottom left: location line */}
            <p
              className="absolute z-10 leading-relaxed"
              style={{
                bottom: '4vh',
                left: '4vw',
                maxWidth: '36ch',
                color: 'rgba(200,214,235,0.6)',
                fontSize: '0.72rem',
              }}
            >
              {CONTACT.address}
            </p>

            {/* Bottom right: thematic sign-off */}
            <p
              className="absolute z-10 text-right"
              style={{
                bottom: '4vh',
                right: '4vw',
                fontFamily: 'var(--font-00s-display), sans-serif',
                fontSize: 'clamp(0.8rem, 1.6vw, 1.15rem)',
                letterSpacing: '0.18em',
                color: ERA.primary,
                textShadow: NEON_GLOW,
              }}
            >
              What Continues Becomes Greater
            </p>

            {/* ── Animation layer: raster hands, screen-blended, non-interactive ── */}
            <div
              ref={leftHandRef}
              className="pointer-events-none absolute z-30"
              style={{
                top: '50%',
                right: '50%',
                width: 'min(46vw, 640px)',
                minWidth: '260px',
                willChange: 'transform, opacity',
                transform: 'translate3d(-75vw, calc(-50% + 7vh), 0) scale(0.85)',
                mixBlendMode: 'screen',
              }}
            >
              <Image
                src="/Contact_us/left_hand.jpeg"
                alt=""
                width={1280}
                height={1280}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
            <div
              ref={rightHandRef}
              className="pointer-events-none absolute z-30"
              style={{
                top: '50%',
                left: '50%',
                width: 'min(46vw, 640px)',
                minWidth: '260px',
                willChange: 'transform, opacity',
                transform: 'translate3d(75vw, calc(-50% - 7vh), 0) scale(0.85)',
                mixBlendMode: 'screen',
              }}
            >
              <Image
                src="/Contact_us/right_hand.jpeg"
                alt=""
                width={1280}
                height={1280}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
          </div>
        </div>

        {/* ══ Council window stand-in — minimizes down into its taskbar tab ══ */}
        <div
          ref={prevWindowRef}
          className="pointer-events-none absolute z-40 overflow-hidden"
          style={{
            inset: '7% 9%',
            border: '3px solid #0055ea',
            borderRadius: 8,
            background: '#0a080a',
            willChange: 'transform, opacity',
            boxShadow: '0 10px 50px rgba(0,0,0,0.8)',
            fontFamily: "'Tahoma', 'Segoe UI', Arial, sans-serif",
          }}
        >
          <div
            className="flex items-center px-3"
            style={{
              height: 30,
              background: 'linear-gradient(180deg, #2a68e0 0%, #1b4fc4 50%, #123a9a 100%)',
            }}
          >
            <span className="text-[12px] font-bold text-white" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
              Student Council 2026-27 Player
            </span>
          </div>
        </div>

        {/* ══ The persistent XP taskbar, carried across the pin (same three
            tabs as WindowsXPDesktop — the Contact Us button already exists
            there; this is its continuation, not a duplicate) ══ */}
        <div
          className="absolute bottom-0 left-0 z-50 flex w-full items-center justify-between"
          style={{
            height: TASKBAR_H,
            background:
              'linear-gradient(180deg, #1f4cb8 0%, #296be8 8%, #1f50c0 45%, #19419b 88%, #0f2468 100%)',
            borderTop: '1px solid #286be6',
            boxShadow: '0 -2px 6px rgba(0,0,0,0.45)',
            fontFamily: "'Tahoma', 'Segoe UI', Arial, sans-serif",
          }}
        >
          <div
            className="flex h-full items-center"
            style={{
              gap: 6,
              padding: '0 16px 0 10px',
              background: 'linear-gradient(180deg, #3c9d18 0%, #4fac24 15%, #3c9318 55%, #286b0e 100%)',
              borderRight: '2px solid #1a450a',
              borderTopRightRadius: 12,
              borderBottomRightRadius: 12,
              boxShadow: '2px 0 5px rgba(0,0,0,0.4)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 5l7.5-1v7.5H3V5z" fill="#f25022" />
              <path d="M11.5 3.8L21 2v9.5h-9.5V3.8z" fill="#7fba00" />
              <path d="M3 12.5h7.5V20l-7.5-1v-6.5z" fill="#00a4ef" />
              <path d="M11.5 12.5H21V22l-9.5-1.8v-7.7z" fill="#ffb900" />
            </svg>
            <span
              className="text-[15px] font-extrabold italic text-white"
              style={{ letterSpacing: '0.5px', textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}
            >
              start
            </span>
          </div>

          <div className="flex h-full flex-1 items-center overflow-hidden" style={{ gap: 6, padding: '0 10px' }}>
            <div
              className="flex flex-1 items-center truncate rounded-[3px] text-[11px] font-semibold text-white"
              style={{
                height: 24,
                maxWidth: 220,
                gap: 6,
                padding: '0 8px',
                background: 'linear-gradient(180deg, #3a75e8 0%, #2053c0 100%)',
                border: '1px solid #12337b',
                boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              <span style={{ fontSize: '13px' }}>🎬</span>
              <span className="truncate">GDG CRCE 90s Street Archive.avi</span>
            </div>
            <div
              ref={prevTabRef}
              className="flex flex-1 items-center truncate rounded-[3px] text-[11px] font-semibold text-white"
              style={{
                height: 24,
                maxWidth: 220,
                gap: 6,
                padding: '0 8px',
                background: 'linear-gradient(180deg, #173d91 0%, #102d6b 100%)',
                border: '1px solid #12337b',
                boxShadow: 'inset 2px 2px 3px rgba(0,0,0,0.6)',
              }}
            >
              <span style={{ fontSize: '13px' }}>💿</span>
              <span className="truncate">Student Council 2026-27 Player</span>
            </div>
            <div
              ref={contactTabRef}
              className="flex flex-1 items-center truncate rounded-[3px] text-[11px] font-semibold text-white"
              style={{
                height: 24,
                maxWidth: 220,
                gap: 6,
                padding: '0 8px',
                background: 'linear-gradient(180deg, #3a75e8 0%, #2053c0 100%)',
                border: '1px solid #12337b',
                boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              <span style={{ fontSize: '13px' }}>📧</span>
              <span className="truncate">Contact Us</span>
            </div>
          </div>

          <div
            className="flex h-full items-center text-[11px] font-semibold text-white"
            style={{
              gap: 10,
              padding: '0 14px 0 12px',
              background: 'linear-gradient(180deg, #0f8fcf 0%, #0d7fb9 50%, #095f8c 100%)',
              borderLeft: '1px solid #0f4b7a',
            }}
          >
            <span title="Sound Active">🔊</span>
            <span title="GDG Network Connected">🌐</span>
            <span>20:26</span>
          </div>
        </div>
      </div>
    </section>
  );
}

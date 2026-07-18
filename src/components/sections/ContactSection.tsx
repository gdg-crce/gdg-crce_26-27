'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * ContactSection — Act 4: "CONTACT US" (2000s era)
 *
 * Static layout under a scroll-driven animation layer: two low-poly vector
 * hands glide in from the screen margins and converge on the center GDG logo.
 * Hand movement is driven by the mutable progressRef pattern (ScrollTrigger
 * scrub → direct DOM style writes) — never React state.
 */

const CONTACT = {
  email: 'crcegdsc@gmail.com',
  address:
    'Fr. Conceicao Rodrigues College of Engineering, Bandstand, Bandra (W) Mumbai - 400050',
  socials: [
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
] as const,
};

/* 2000s era palette (locked — see CLAUDE.md era table) */
const ERA = { bg: '#141C2E', primary: '#00D4E8', secondary: '#B4E600' };

const NEON_GLOW =
  '0 0 6px rgba(0,212,232,0.95), 0 0 18px rgba(0,212,232,0.55), 0 0 44px rgba(0,212,232,0.3)';

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* Low-poly hand, pointing right (fingertip near viewBox right edge). */
function LowPolyHand() {
  return (
    <svg
      viewBox="0 0 420 240"
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      aria-hidden
    >
      <defs>
        <linearGradient id="ctHandArm" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0c1424" />
          <stop offset="1" stopColor="#1d2b4d" />
        </linearGradient>
        <radialGradient id="ctTipGlow">
          <stop offset="0" stopColor="rgba(0,212,232,0.85)" />
          <stop offset="1" stopColor="rgba(0,212,232,0)" />
        </radialGradient>
      </defs>

      <g stroke="rgba(0,212,232,0.28)" strokeWidth="1" strokeLinejoin="round">
        {/* forearm */}
        <polygon points="0,84 150,92 150,150 0,166" fill="url(#ctHandArm)" />
        <polygon points="0,84 150,92 0,166" fill="#121c33" opacity="0.55" />
        {/* palm */}
        <polygon points="148,88 236,80 258,96 262,140 240,158 150,152" fill="#1a2745" />
        <polygon points="150,92 236,80 202,124" fill="#233459" opacity="0.7" />
        {/* thumb */}
        <polygon points="200,82 236,58 252,66 244,86" fill="#26395f" />
        {/* index finger — three low-poly segments */}
        <polygon points="256,96 310,88 312,104 258,112" fill="#223154" />
        <polygon points="310,88 358,84 360,98 312,104" fill="#283a61" />
        <polygon points="358,84 402,88 360,98" fill="#2f4570" />
        {/* curled fingers */}
        <polygon points="258,116 294,112 298,130 260,134" fill="#1c2949" />
        <polygon points="258,136 290,134 292,150 258,152" fill="#182342" />
      </g>

      {/* cyan rim light along the top edges */}
      <polygon points="0,84 150,92 150,96 0,88" fill="rgba(0,212,232,0.45)" />
      <polygon points="256,96 402,87 402,90 256,100" fill="rgba(0,212,232,0.5)" />

      {/* fingertip energy glow */}
      <circle cx="400" cy="90" r="30" fill="url(#ctTipGlow)" />
    </svg>
  );
}

export default function ContactSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<number>(0);
  const leftHandRef = useRef<HTMLDivElement>(null);
  const rightHandRef = useRef<HTMLDivElement>(null);
  const sparkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const applyHands = (p: number) => {
      /* Hands fully converge at 85% of the pin; hold through the tail. */
      const e = easeInOutCubic(Math.min(p / 0.85, 1));
      if (leftHandRef.current) {
        const x = lerp(-70, -4.2, e);
        const y = lerp(9, 0, e);
        const r = lerp(-9, -1, e);
        leftHandRef.current.style.transform = `translate3d(${x}vw, calc(-50% + ${y}vh), 0) rotate(${r}deg)`;
      }
      if (rightHandRef.current) {
        const x = lerp(70, 4.2, e);
        const y = lerp(9, 0, e);
        const r = lerp(9, 1, e);
        rightHandRef.current.style.transform = `translate3d(${x}vw, calc(-50% + ${y}vh), 0) rotate(${r}deg)`;
      }
      if (sparkRef.current) {
        sparkRef.current.style.opacity = `${Math.pow(e, 4)}`;
        sparkRef.current.style.transform = `translate(-50%, -50%) scale(${0.6 + 0.6 * e})`;
      }
    };

    applyHands(0);

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      pin: containerRef.current,
      start: 'top top',
      end: '+=1800',
      scrub: 1.0,
      onUpdate: (self) => {
        progressRef.current = self.progress;
        applyHands(self.progress);
      },
    });

    return () => {
      trigger.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="relative"
      style={{
        background: `linear-gradient(180deg, #000000 0%, #0a1020 16%, ${ERA.bg} 45%, #101828 100%)`,
      }}
    >
      <div
        ref={containerRef}
        className="relative h-screen w-full overflow-hidden"
        style={{ fontFamily: 'var(--font-00s-body), sans-serif' }}
      >
        {/* faint cyber grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,212,232,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,232,0.045) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        {/* ── Static layout (no reveals, no fade-ins) ── */}

        {/* Top center: header */}
        <h2
          className="absolute left-1/2 z-10 -translate-x-1/2 text-center uppercase"
          style={{
            top: '7vh',
            fontFamily: 'var(--font-00s-display), sans-serif',
            fontSize: 'clamp(1.8rem, 5vw, 3.6rem)',
            letterSpacing: '0.22em',
            color: ERA.primary,
            textShadow: NEON_GLOW,
          }}
        >
          Contact Us
        </h2>

        {/* Center: GDG logo focal point + flanking social nodes */}
        <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          {/* convergence spark behind the logo (driven by progressRef) */}
          <div
            ref={sparkRef}
            className="pointer-events-none absolute left-1/2 z-0"
            style={{
              top: 'clamp(38px, 5.5vw, 62px)',
              width: 'clamp(190px, 26vw, 340px)',
              height: 'clamp(190px, 26vw, 340px)',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(0,212,232,0.5) 0%, rgba(0,212,232,0.12) 45%, transparent 70%)',
              transform: 'translate(-50%, -50%) scale(0.6)',
              opacity: 0,
            }}
          />
          <div
            className="relative z-10 flex items-center justify-center rounded-full"
            style={{
              width: 'clamp(96px, 13vw, 150px)',
              height: 'clamp(96px, 13vw, 150px)',
              background: 'rgba(20,28,46,0.72)',
              border: '1px solid rgba(0,212,232,0.45)',
              boxShadow:
                '0 0 22px rgba(0,212,232,0.35), inset 0 0 26px rgba(0,212,232,0.12)',
            }}
          >
            <Image
              src="/logo.png"
              alt="GDG CRCE"
              width={150}
              height={150}
              style={{ width: '66%', height: 'auto' }}
            />
          </div>

          <div className="relative z-10 mt-12 flex items-center gap-8">
            {CONTACT.socials.map((s) => (
              <a
                key={s.id}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                title={s.label}
                className="group flex flex-col items-center gap-2"
              >
                <span
                  className="flex items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
                  style={{
                    width: 'clamp(52px, 5.4vw, 66px)',
                    height: 'clamp(52px, 5.4vw, 66px)',
                    background: 'rgba(13,20,38,0.85)',
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
        </div>

        {/* Bottom left: email + location */}
        <div className="absolute z-10" style={{ bottom: '5vh', left: '5vw', maxWidth: '38ch' }}>
          <a
            href={`mailto:${CONTACT.email}`}
            className="transition-opacity hover:opacity-80"
            style={{
              color: ERA.primary,
              fontSize: 'clamp(0.85rem, 1.4vw, 1.05rem)',
              letterSpacing: '0.08em',
              textShadow: '0 0 10px rgba(0,212,232,0.5)',
            }}
          >
            {CONTACT.email}
          </a>
          <p
            className="mt-2 leading-relaxed"
            style={{ color: 'rgba(200,214,235,0.55)', fontSize: '0.72rem' }}
          >
            {CONTACT.address}
          </p>
        </div>

        {/* Bottom right: thematic sign-off */}
        <p
          className="absolute z-10 text-right uppercase"
          style={{
            bottom: '5vh',
            right: '5vw',
            fontFamily: 'var(--font-00s-display), sans-serif',
            fontSize: 'clamp(0.8rem, 1.6vw, 1.15rem)',
            letterSpacing: '0.18em',
            color: ERA.primary,
            textShadow: NEON_GLOW,
          }}
        >
          What continues, becomes greater
        </p>

        {/* ── Animation layer: converging hands (non-interactive) ── */}
        <div
          ref={leftHandRef}
          className="pointer-events-none absolute z-20"
          style={{
            top: '50%',
            right: '50%',
            width: 'min(38vw, 520px)',
            minWidth: '220px',
            willChange: 'transform',
            transform: 'translate3d(-70vw, calc(-50% + 9vh), 0) rotate(-9deg)',
          }}
        >
          <LowPolyHand />
        </div>
        <div
          ref={rightHandRef}
          className="pointer-events-none absolute z-20"
          style={{
            top: '50%',
            left: '50%',
            width: 'min(38vw, 520px)',
            minWidth: '220px',
            willChange: 'transform',
            transform: 'translate3d(70vw, calc(-50% + 9vh), 0) rotate(9deg)',
          }}
        >
          <div style={{ transform: 'scaleX(-1)' }}>
            <LowPolyHand />
          </div>
        </div>
      </div>
    </section>
  );
}

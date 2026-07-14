'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { events } from './eventData';

/* Dynamically import the R3F scene — no SSR for WebGL */
const WallScene = dynamic(() => import('@/components/three/WallScene'), {
  ssr: false,
  loading: () => (
    <div className="events-loading">
      <span className="events-loading-text">LOADING THE WALL</span>
      <span className="events-loading-dots">...</span>
    </div>
  ),
});

/**
 * EventsSection — 90s MTV Alleyway Poster Wall
 *
 * Immersive scroll-pinned street experience with live interactive flashlight,
 * human stride camera parallax, and camcorder viewfinder HUD.
 */
export default function EventsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<number>(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [activeEvent, setActiveEvent] = useState(0);
  const activeEventRef = useRef(0);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      pin: containerRef.current,
      start: 'top top',
      end: '+=3500',
      scrub: 1.0,
      onUpdate: (self) => {
        const s = self.progress;

        if (progressBarRef.current) {
          progressBarRef.current.style.width = `${s * 100}%`;
        }

        // Walk to the final poster by s = WALK_END, then hold on it so the
        // last poster (evt-9) is fully seen before the council takeover.
        // LAST_POSTER_P centers evt-9 (x ≈ 21.5) within lerp(-24, 23).
        const WALK_END = 0.82;
        const LAST_POSTER_P = 0.968;
        const camP =
          s < WALK_END ? (s / WALK_END) * LAST_POSTER_P : LAST_POSTER_P;
        progressRef.current = camP;

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
          setActiveEvent(closest);
        }
      },
    });

    const timeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    return () => {
      clearTimeout(timeout);
      trigger.kill();
    };
  }, []);

  const current = events[activeEvent];

  return (
    <section
      ref={sectionRef}
      className="events-section"
      id="events"
      aria-label="GDG CRCE Events — 90s Poster Wall"
      style={{ position: 'relative', width: '100%' }}
    >
      <div
        ref={containerRef}
        className="events-canvas-container"
        style={{
          position: 'relative',
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
          background: '#161315',
        }}
      >
        {/* 3D Wall Scene */}
        <WallScene progressRef={progressRef} />

        {/* Scanline overlay — VHS / MTV texture */}
        <div className="events-scanlines" />

        {/* Film grain overlay */}
        <div className="events-grain" />

        {/* Cinematic 90s Camcorder Viewfinder HUD */}
        <div className="events-hud">
          {/* Top row */}
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


          {/* Bottom row */}
          <div className="events-hud-bottom">
            <div className="events-event-info">
              <div className="events-event-counter">
                <span className="events-event-number">
                  {String(activeEvent + 1).padStart(2, '0')}
                </span>
                <span className="events-event-divider">/</span>
                <span className="events-event-total">
                  {String(events.length).padStart(2, '0')}
                </span>
              </div>
              <div className="events-event-meta">
                <span className="events-event-title">{current?.title}</span>
                <span className="events-event-subtitle">
                  {current?.subtitle}
                </span>
              </div>
            </div>
            <div className="events-scroll-hint">
              <span>SCROLL DOWN STREET →</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="events-progress-track">
          <div
            ref={progressBarRef}
            className="events-progress-fill"
            style={{ width: '0%' }}
          />
        </div>

        {/* Grunge vignette borders */}
        <div className="events-grunge-top" />
        <div className="events-grunge-bottom" />
      </div>
    </section>
  );
}

function THREE_MATH_LERP(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

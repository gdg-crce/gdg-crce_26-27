'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { events } from './events/eventData';
import { councilMembers } from './council/councilData';
import WindowsXPDesktop from './council/WindowsXPDesktop';
import RetroMediaPlayerWindow from './council/RetroMediaPlayerWindow';
import './council/council.css';

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

/**
 * EventsAndCouncilSection — Unified Master Choreography Section
 *
 * Manages the single continuous ScrollTrigger across the entire experience:
 * 1. 0.00 -> 0.26: Alleyway walk from poster #1 (CRCE HACK) to #9 (TECH TALKS).
 * 2. 0.26 -> 0.32: Dwell on poster #9 (TECH TALKS) in 100% fullscreen.
 * 3. 0.32 -> 0.42: Windowize (3D wall shrinks center-out into Windows Media Player frame, revealing XP Desktop).
 * 4. 0.42 -> 0.50: Minimize (window genies down into bottom Windows XP taskbar).
 * 5. 0.48 -> 0.55: Player Reveal (Student Council Retro Media Player window fades in centered).
 * 6. 0.55 -> 0.98: Council Members (scrolling steps through council profile cards).
 */
export default function EventsAndCouncilSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<number>(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const eventsWindowRef = useRef<HTMLDivElement>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const activeEventRef = useRef(0);

  const [activeEvent, setActiveEvent] = useState(0);
  const [activeMemberIndex, setActiveMemberIndex] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState<string>('All Tracks');
  const [isEventsMinimized, setIsEventsMinimized] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const filteredMembers = useMemo(() => {
    if (selectedTeam === 'All Tracks') return councilMembers;
    return councilMembers.filter((m) => m.team === selectedTeam);
  }, [selectedTeam]);

  const currentMember =
    filteredMembers[activeMemberIndex] || filteredMembers[0] || councilMembers[0];

  const handleNext = useCallback(() => {
    setActiveMemberIndex((prev) => (prev + 1) % filteredMembers.length);
  }, [filteredMembers.length]);

  const handlePrev = useCallback(() => {
    setActiveMemberIndex((prev) =>
      prev - 1 < 0 ? filteredMembers.length - 1 : prev - 1
    );
  }, [filteredMembers.length]);

  const handleSelectMemberById = useCallback(
    (id: number) => {
      const idx = filteredMembers.findIndex((m) => m.id === id);
      if (idx !== -1) {
        setActiveMemberIndex(idx);
      } else {
        setSelectedTeam('All Tracks');
        const globalIdx = councilMembers.findIndex((m) => m.id === id);
        if (globalIdx !== -1) setActiveMemberIndex(globalIdx);
      }
    },
    [filteredMembers]
  );

  const handleSelectTeam = useCallback((team: string) => {
    setSelectedTeam(team);
    setActiveMemberIndex(0);
  }, []);

  const handleToggleEventsMinimize = useCallback(() => {
    setIsEventsMinimized((prev) => !prev);
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      pin: containerRef.current,
      start: 'top top',
      end: '+=11000', // unified scroll distance across both sections
      scrub: 0.8,
      onUpdate: (self) => {
        const p = self.progress;
        setScrollProgress(p);

        /* ── Phase 1: Alleyway Walk (0.00 -> 0.26) ───────────────────────── */
        const WALK_END = 0.26;
        const LAST_POSTER_P = 0.968;
        const camP = p < WALK_END ? (p / WALK_END) * LAST_POSTER_P : LAST_POSTER_P;
        progressRef.current = camP;

        if (progressBarRef.current) {
          const walkFraction = Math.min(1, p / WALK_END);
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
          setActiveEvent(closest);
        }

        /* ── Phase 2 -> 4: Dwell, Windowize & Minimize (0.26 -> 0.50) ────── */
        const DWELL_END = 0.32;
        const WINDOW_END = 0.42;
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

          if (isEventsMinimized || p >= MINIMIZE_END) {
            eventsWindowRef.current.style.opacity = '0';
            eventsWindowRef.current.style.pointerEvents = 'none';
          } else if (p < DWELL_END) {
            // Fullscreen alleyway walk & hold
            eventsWindowRef.current.style.transform = 'translate(0, 0) scale(1)';
            eventsWindowRef.current.style.opacity = '1';
            eventsWindowRef.current.style.pointerEvents = 'auto';
            showChrome(false);
          } else if (p < WINDOW_END) {
            // Shrink center-out from fullscreen to media player window
            const t = (p - DWELL_END) / (WINDOW_END - DWELL_END);
            const scale = 1.0 - t * (1.0 - WINDOW_SCALE);
            eventsWindowRef.current.style.transform = `translate(0, 0) scale(${scale})`;
            eventsWindowRef.current.style.opacity = '1';
            eventsWindowRef.current.style.pointerEvents = 'auto';
            showChrome(t > 0.10);
          } else {
            // Genie window down/left into Windows XP taskbar
            const t = (p - WINDOW_END) / (MINIMIZE_END - WINDOW_END);
            const scale = WINDOW_SCALE * (1.0 - t * 0.9);
            const translateY = t * 46; // vh down to taskbar
            const translateX = t * -26; // vw left to .avi taskbar item
            eventsWindowRef.current.style.transform = `translate(${translateX}vw, ${translateY}vh) scale(${scale})`;
            eventsWindowRef.current.style.opacity = `${1.0 - t * 0.9}`;
            eventsWindowRef.current.style.pointerEvents = 'none';
            showChrome(true);
          }
        }

        /* ── Phase 5: Student Council Retro Media Player (0.48 -> 0.55) ──── */
        if (playerWrapperRef.current) {
          const fadeT = Math.min(1, Math.max(0, (p - 0.48) / 0.07));
          playerWrapperRef.current.style.opacity = `${fadeT}`;
          playerWrapperRef.current.style.pointerEvents =
            fadeT > 0.5 ? 'auto' : 'none';
        }

        /* ── Phase 6: Member Stepping (0.55 -> 0.98) ─────────────────────── */
        const MEMBERS_START = 0.55;
        const MEMBERS_END = 0.98;
        if (p >= MEMBERS_START && p <= MEMBERS_END) {
          const memberProgress =
            (p - MEMBERS_START) / (MEMBERS_END - MEMBERS_START);
          const targetIndex = Math.floor(memberProgress * filteredMembers.length);
          const clampedIndex = Math.max(
            0,
            Math.min(filteredMembers.length - 1, targetIndex)
          );
          setActiveMemberIndex(clampedIndex);
        }
      },
    });

    const timeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);

    return () => {
      clearTimeout(timeout);
      trigger.kill();
    };
  }, [filteredMembers.length, isEventsMinimized]);

  const current = events[activeEvent];

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
          isEventsMinimized={isEventsMinimized || scrollProgress >= 0.50}
          onToggleEventsMinimize={handleToggleEventsMinimize}
          showDesktopChrome={isEventsMinimized || scrollProgress >= 0.32}
        >
          {/* Layer 1: Events 3D Wall (Starts 100% Fullscreen, Walks, Dwells, then Shrinks into Media Player) */}
          <div className="xp-events-transition-wrapper">
            <div
              ref={eventsWindowRef}
              className="xp-events-transition-window"
              style={{
                opacity: isEventsMinimized ? 0 : 1,
                pointerEvents: isEventsMinimized ? 'none' : 'auto',
              }}
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
                <WallScene progressRef={progressRef} snapToTarget={scrollProgress >= 0.26} />

                {/* Scanline overlay */}
                <div className="events-scanlines" />

                {/* Film grain overlay */}
                <div className="events-grain" />

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
                      <span>
                        {scrollProgress < 0.26
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
                    style={{ width: '0%' }}
                  />
                </div>

                {/* Grunge vignette borders */}
                <div className="events-grunge-top" />
                <div className="events-grunge-bottom" />
              </div>
            </div>
          </div>

          {/* Layer 2: Student Council Media Player (Perfectly Centered) */}
          <div
            ref={playerWrapperRef}
            className="xp-player-window-wrapper"
            style={{ opacity: 0, pointerEvents: 'none' }}
          >
            <RetroMediaPlayerWindow
              currentMember={currentMember}
              memberIndex={activeMemberIndex}
              totalMembers={filteredMembers.length}
              progressPercent={
                ((activeMemberIndex + 1) / filteredMembers.length) * 100
              }
              onNext={handleNext}
              onPrev={handlePrev}
              onSelectMemberById={handleSelectMemberById}
              selectedTeam={selectedTeam}
              onSelectTeam={handleSelectTeam}
              allMembers={filteredMembers}
            />
          </div>
        </WindowsXPDesktop>
      </div>
    </section>
  );
}

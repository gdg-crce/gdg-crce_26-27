'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { councilMembers, CouncilMember } from './councilData';
import WindowsXPDesktop from './WindowsXPDesktop';
import RetroMediaPlayerWindow from './RetroMediaPlayerWindow';
import './council.css';

export default function CouncilSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const eventsWindowRef = useRef<HTMLDivElement>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);

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
      end: '+=4800', // extended scroll distance for pacing
      scrub: 0.8,
      onUpdate: (self) => {
        const p = self.progress;
        setScrollProgress(p);

        // Phase 1 (0.00 -> 0.16): Fullscreen Video Frame -> Push/Shrinks into Windowed Mode
        // Phase 2 (0.16 -> 0.28): Minimizes down to Taskbar
        if (eventsWindowRef.current) {
          if (p < 0.16 && !isEventsMinimized) {
            const t = p / 0.16;
            // Scale from 1.0 (fullscreen 100vw x 100vh) down to 0.84 window
            const scale = 1.0 - t * 0.16;
            eventsWindowRef.current.style.transform = `scale(${scale})`;
            eventsWindowRef.current.style.opacity = '1';
            eventsWindowRef.current.style.pointerEvents = 'auto';
            if (t > 0.1) {
              eventsWindowRef.current.classList.add('is-windowed');
            } else {
              eventsWindowRef.current.classList.remove('is-windowed');
            }
          } else if (p >= 0.16 && p < 0.28 && !isEventsMinimized) {
            // Minimize animation from windowed state down into bottom taskbar
            const tMin = (p - 0.16) / 0.12;
            const scale = 0.84 * (1.0 - tMin * 0.85);
            const translateY = tMin * 48; // vh down towards taskbar
            const opacity = 1.0 - tMin * 0.95;
            eventsWindowRef.current.style.transform = `scale(${scale}) translateY(${translateY}vh)`;
            eventsWindowRef.current.style.opacity = `${opacity}`;
            eventsWindowRef.current.style.pointerEvents = 'none';
          } else {
            eventsWindowRef.current.style.opacity = '0';
            eventsWindowRef.current.style.pointerEvents = 'none';
          }
        }

        // Phase 3 (0.24 -> 0.96): Student Council Media Player revealed centered
        if (playerWrapperRef.current) {
          const isMin = isEventsMinimized || p >= 0.22;
          if (!isMin) {
            playerWrapperRef.current.style.opacity = '0';
            playerWrapperRef.current.style.pointerEvents = 'none';
          } else {
            // Fade in perfectly centered
            const fadeT = Math.min(1, Math.max(0, (p - 0.22) / 0.08));
            playerWrapperRef.current.style.opacity = `${fadeT}`;
            playerWrapperRef.current.style.pointerEvents = 'auto';
          }
        }

        // Phase 4 (0.28 -> 0.96): Scroll steps smoothly through Council Members
        if (p >= 0.28 && p <= 0.96) {
          const memberProgress = (p - 0.28) / 0.68;
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

  return (
    <section
      ref={sectionRef}
      id="council"
      className="xp-council-section"
      aria-label="GDG CRCE Student Council 2026-27 — Professional Windows XP Experience"
    >
      <div ref={containerRef} style={{ width: '100%', height: '100vh' }}>
        <WindowsXPDesktop
          activeTeamIndex={activeMemberIndex}
          onSelectTeam={handleSelectTeam}
          isEventsMinimized={isEventsMinimized || scrollProgress >= 0.24}
          onToggleEventsMinimize={handleToggleEventsMinimize}
        >
          {/* Layer 1: Events Transition Window (Starts Fullscreen -> Push Shrinks -> Minimizes) */}
          <div className="xp-events-transition-wrapper">
            <div
              ref={eventsWindowRef}
              className="xp-events-transition-window"
              style={{
                opacity: isEventsMinimized ? 0 : 1,
                pointerEvents: isEventsMinimized ? 'none' : 'auto',
              }}
            >
              {/* Topbar of Windows XP Video Player */}
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

              {/* Video Frame Content */}
              <div className="xp-events-window-body">
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#00ff66',
                      letterSpacing: '2px',
                      fontWeight: 700,
                      marginBottom: '12px',
                    }}
                  >
                    REC [•] RECORDING ARCHIVED // 1994 ALLEYWAY
                  </div>
                  <h3
                    style={{
                      color: '#fff',
                      fontSize: 'clamp(20px, 3vw, 36px)',
                      fontWeight: 900,
                      letterSpacing: '1px',
                      marginBottom: '12px',
                    }}
                  >
                    GDG CRCE STREET ARCHIVE PLAYBACK COMPLETE
                  </h3>
                  <p
                    style={{
                      color: '#a0b0d0',
                      fontSize: '13px',
                      maxWidth: '520px',
                      marginBottom: '24px',
                      lineHeight: 1.5,
                    }}
                  >
                    Keep scrolling to minimize this video window and reveal the Student Council
                    audio player on the Windows XP desktop.
                  </p>
                  <button
                    type="button"
                    className="xp-raised-btn"
                    onClick={handleToggleEventsMinimize}
                    style={{ padding: '8px 20px', fontSize: '13px' }}
                  >
                    Minimize Window Now (_ )
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Layer 2: Student Council Media Player (Perfectly Centered) */}
          <div ref={playerWrapperRef} className="xp-player-window-wrapper">
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

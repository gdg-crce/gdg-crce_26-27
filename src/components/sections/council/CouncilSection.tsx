'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { councilMembers, CouncilMember } from './councilData';
import WindowsXPDesktop from './WindowsXPDesktop';
import RetroMediaPlayerWindow from './RetroMediaPlayerWindow';
import MSNContactListWindow from './MSNContactListWindow';
import MSNChatWindow from './MSNChatWindow';
import WindowsPictureViewer from './WindowsPictureViewer';
import './council.css';

const WallScene = dynamic(() => import('@/components/three/WallScene'), {
  ssr: false,
});

/* CouncilSection — Upgraded with !important Bliss grid scanlines and 3D vector icons */
export default function CouncilSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const eventsWindowRef = useRef<HTMLDivElement>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const pictureViewerRef = useRef<HTMLDivElement>(null);
  // Lock the transition replica on the SAME final frame the events walk ends on
  // (evt-9 centered) so the fullscreen → window handoff is pixel-seamless.
  const eventsFinalProgressRef = useRef<number>(0.968);

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
      trigger: '#events',
      pin: containerRef.current,
      start: 'bottom bottom',
      end: '+=7500', // extended scroll distance to push the transition very late
      scrub: 0.8,
      onEnter: () => {
        if (sectionRef.current) {
          sectionRef.current.style.opacity = '1';
          sectionRef.current.style.visibility = 'visible';
          sectionRef.current.style.pointerEvents = 'auto';
        }
      },
      onLeaveBack: () => {
        if (sectionRef.current) {
          sectionRef.current.style.opacity = '0';
          sectionRef.current.style.visibility = 'hidden';
          sectionRef.current.style.pointerEvents = 'none';
        }
      },
      onUpdate: (self) => {
        const p = self.progress;
        setScrollProgress(p);
        if (p > 0 && sectionRef.current && sectionRef.current.style.opacity !== '1') {
          sectionRef.current.style.opacity = '1';
          sectionRef.current.style.visibility = 'visible';
          sectionRef.current.style.pointerEvents = 'auto';
        }

        /* ── Choreography timeline (scroll progress p) ────────────────────
           DWELL     0.00 → 0.50  Fullscreen final frame holds STILL for several
                                  wheel scrolls. Starts the transition very late.
           WINDOWIZE 0.50 → 0.62  Frame shrinks in place (center-out) into a
                                  media-player window — XP desktop + taskbar are
                                  revealed around it. "It was a media player."
           MINIMIZE  0.62 → 0.72  Window genies down/left into the taskbar and
                                  fades out. Events frame leaves the screen.
           PLAYER    0.68 → 0.75  Student Council player fades in, centered.
           MEMBERS   0.75 → 0.98  Scroll steps through council members.
           ──────────────────────────────────────────────────────────────── */
        const DWELL_END = 0.50;
        const WINDOW_END = 0.62;
        const MINIMIZE_END = 0.72;
        const WINDOW_SCALE = 0.66; // windowed size (fraction of viewport)

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
            // Fully minimized / user-minimized — off screen.
            eventsWindowRef.current.style.opacity = '0';
            eventsWindowRef.current.style.pointerEvents = 'none';
          } else if (p < DWELL_END) {
            // DWELL — hold the fullscreen frame perfectly still.
            eventsWindowRef.current.style.transform = 'translate(0, 0) scale(1)';
            eventsWindowRef.current.style.opacity = '1';
            eventsWindowRef.current.style.pointerEvents = 'auto';
            showChrome(false);
          } else if (p < WINDOW_END) {
            // WINDOWIZE — shrink center-out from fullscreen to a window.
            const t = (p - DWELL_END) / (WINDOW_END - DWELL_END);
            const scale = 1.0 - t * (1.0 - WINDOW_SCALE);
            eventsWindowRef.current.style.transform = `translate(0, 0) scale(${scale})`;
            eventsWindowRef.current.style.opacity = '1';
            eventsWindowRef.current.style.pointerEvents = 'auto';
            // Chrome fades in just after the shrink begins.
            showChrome(t > 0.12);
          } else {
            // MINIMIZE — genie the window down/left into the taskbar.
            const t = (p - WINDOW_END) / (MINIMIZE_END - WINDOW_END);
            const scale = WINDOW_SCALE * (1.0 - t * 0.9);
            const translateY = t * 46; // vh downward toward taskbar
            const translateX = t * -26; // vw leftward toward the .avi taskbar item
            // translate() must precede scale() so the vw/vh offsets stay in
            // screen space instead of being multiplied by the shrinking scale.
            eventsWindowRef.current.style.transform = `translate(${translateX}vw, ${translateY}vh) scale(${scale})`;
            eventsWindowRef.current.style.opacity = `${1.0 - t * 0.9}`;
            eventsWindowRef.current.style.pointerEvents = 'none';
            showChrome(true);
          }
        }

        // PLAYER -> PHASE 7: Student Council MSN Messenger window (0.68 -> 0.96)
        const MEMBERS_START = 0.75;
        const MEMBERS_END = 0.93;
        const MSN_MIN_START = 0.93;
        const MSN_MIN_END = 0.96;

        if (playerWrapperRef.current) {
          if (p < 0.68) {
            playerWrapperRef.current.style.opacity = '0';
            playerWrapperRef.current.style.pointerEvents = 'none';
            playerWrapperRef.current.style.transform = 'translate(0, 0) scale(1)';
          } else if (p < MEMBERS_START) {
            const fadeT = Math.min(1, Math.max(0, (p - 0.68) / 0.07));
            playerWrapperRef.current.style.opacity = `${fadeT}`;
            playerWrapperRef.current.style.pointerEvents = fadeT > 0.5 ? 'auto' : 'none';
            playerWrapperRef.current.style.transform = 'translate(0, 0) scale(1)';
          } else if (p <= MEMBERS_END) {
            playerWrapperRef.current.style.opacity = '1';
            playerWrapperRef.current.style.pointerEvents = 'auto';
            playerWrapperRef.current.style.transform = 'translate(0, 0) scale(1)';

            const memberProgress = (p - MEMBERS_START) / (MEMBERS_END - MEMBERS_START);
            const targetIndex = Math.floor(memberProgress * filteredMembers.length);
            const clampedIndex = Math.max(
              0,
              Math.min(filteredMembers.length - 1, targetIndex)
            );
            setActiveMemberIndex(clampedIndex);
          } else if (p < MSN_MIN_END) {
            const t = (p - MSN_MIN_START) / (MSN_MIN_END - MSN_MIN_START);
            const scale = 1.0 - t * 0.9;
            const translateY = t * 46;
            playerWrapperRef.current.style.transform = `translate(0, ${translateY}vh) scale(${scale})`;
            playerWrapperRef.current.style.opacity = `${1.0 - t * 0.9}`;
            playerWrapperRef.current.style.pointerEvents = 'none';
          } else {
            playerWrapperRef.current.style.opacity = '0';
            playerWrapperRef.current.style.pointerEvents = 'none';
            playerWrapperRef.current.style.transform = 'translate(0, 46vh) scale(0.1)';
          }
        }

        // PHASE 8: Windows Picture and Fax Viewer Grand Finale Pop-up (0.96 -> 1.00)
        const PV_START = 0.96;
        if (pictureViewerRef.current) {
          if (p < PV_START) {
            pictureViewerRef.current.style.opacity = '0';
            pictureViewerRef.current.style.pointerEvents = 'none';
            pictureViewerRef.current.style.transform = 'scale(0.85) translateY(25px)';
          } else {
            const pvT = Math.min(1, (p - PV_START) / 0.03);
            const scale = 0.85 + pvT * 0.15;
            const translateY = (1 - pvT) * 25;
            pictureViewerRef.current.style.opacity = `${pvT}`;
            pictureViewerRef.current.style.pointerEvents = pvT > 0.4 ? 'auto' : 'none';
            pictureViewerRef.current.style.transform = `scale(${scale}) translateY(${translateY}px)`;
          }
        }
      },
    });

    const timeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 250);

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
      style={{
        marginTop: '-100vh',
        position: 'relative',
        zIndex: 20,
        opacity: 0,
        visibility: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100vh' }}>
        <WindowsXPDesktop
          activeTeamIndex={activeMemberIndex}
          onSelectTeam={handleSelectTeam}
          isEventsMinimized={isEventsMinimized || scrollProgress >= 0.70}
          onToggleEventsMinimize={handleToggleEventsMinimize}
          showDesktopChrome={isEventsMinimized || scrollProgress >= 0.50}
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

              {/* Video Frame Content — Exact 90s Alleyway Last Frame */}
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
                {/* Render 3D Wall locked at final frame until it minimizes away */}
                {(!isEventsMinimized && scrollProgress < 0.73) && (
                  <WallScene progressRef={eventsFinalProgressRef} snapToTarget={true} />
                )}

                {/* Scanline overlay — VHS / MTV texture */}
                <div className="events-scanlines" />

                {/* Film grain overlay */}
                <div className="events-grain" />

                {/* Cinematic 90s Camcorder Viewfinder HUD */}
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
                        <span className="events-event-number">09</span>
                        <span className="events-event-divider">/</span>
                        <span className="events-event-total">09</span>
                      </div>
                      <div className="events-event-meta">
                        <span className="events-event-title">TECH TALKS</span>
                        <span className="events-event-subtitle">Speaker Series</span>
                      </div>
                    </div>
                    <div className="events-scroll-hint">
                      <span>MINIMIZING VIDEO ARCHIVE TO XP DESKTOP ↓</span>
                    </div>
                  </div>
                </div>

                {/* Grunge vignette borders */}
                <div className="events-grunge-top" />
                <div className="events-grunge-bottom" />
              </div>
            </div>
          </div>

          {/* Layer 2: Student Council MSN Messenger Dual-Window */}
          <div
            ref={playerWrapperRef}
            className="xp-player-window-wrapper"
            style={{ opacity: 0, pointerEvents: 'none' }}
          >
            <div className="msn-dual-desktop-container">
              <MSNContactListWindow
                allMembers={filteredMembers}
                activeMemberIndex={activeMemberIndex}
                onSelectMemberById={handleSelectMemberById}
              />
              <MSNChatWindow
                currentMember={currentMember}
                onNext={handleNext}
                onPrev={handlePrev}
              />
            </div>
          </div>

          {/* Layer 3: Windows Picture and Fax Viewer Grand Finale */}
          <div
            ref={pictureViewerRef}
            className="xp-picture-viewer-wrapper"
            style={{ opacity: 0, pointerEvents: 'none', transform: 'scale(0.85) translateY(25px)' }}
          >
            <WindowsPictureViewer allMembers={filteredMembers} />
          </div>
        </WindowsXPDesktop>
      </div>
    </section>
  );
}

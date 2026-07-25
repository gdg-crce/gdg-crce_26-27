'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { events } from './events/eventData';
import { councilMembers } from './council/councilData';
import WindowsXPDesktop from './council/WindowsXPDesktop';
import Y2KArchiveSystem from './council/Y2KArchiveSystem';
import WindowsPictureViewer from './council/WindowsPictureViewer';
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

export const mobileEvents = [
  {
    id: 'mobile-evt-1',
    title: 'CRCE HACK 2026',
    subtitle: 'Retro Tech Hackathon',
    posterImage: '/events/1.png',
  },
  {
    id: 'mobile-evt-2',
    title: 'AGENT SESSIONS',
    subtitle: 'AI Workshop Series',
    posterImage: '/events/2.png',
  },
  {
    id: 'mobile-evt-3',
    title: 'DEVFEST 2026',
    subtitle: 'Build the Future',
    posterImage: '/events/3.png',
  },
  {
    id: 'mobile-evt-4',
    title: 'BYTE CLUB',
    subtitle: 'Weekly Code Jams',
    posterImage: '/events/4.png',
  },
];

/**
 * EventsAndCouncilSection — Unified Master Choreography Section
 * Upgraded with !important Bliss grid scanlines, 3D carved grass text, and the
 * IE6 TheFacebook council archive window.
 *
 *
 * Manages the single continuous ScrollTrigger across the entire experience:
 * 1. 0.00 -> 0.26: Alleyway walk from poster #1 (CRCE HACK) to #9 (TECH TALKS).
 * 2. 0.26 -> 0.32: Dwell on poster #9 (TECH TALKS) in 100% fullscreen.
 * 3. 0.32 -> 0.42: Windowize (3D wall shrinks center-out into Windows Media Player frame, revealing XP Desktop).
 * 4. 0.42 -> 0.50: Minimize (window genies down into bottom Windows XP taskbar).
 * 5. 0.48 -> 0.55: Archive Reveal (IE6 TheFacebook council window fades in centered).
 * 6. 0.55 -> 0.93: Council Archive holds centered (TheFacebook profile: pinned people + social grid).
 * 7. 0.93 -> 0.96: Archive Minimize (IE6 window genies down into taskbar).
 * 8. 0.96 -> 1.00: Grand Finale (Windows Picture and Fax Viewer pops up with group photo).
 */
export default function EventsAndCouncilSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<number>(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const eventsWindowRef = useRef<HTMLDivElement>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const pictureViewerRef = useRef<HTMLDivElement>(null);
  const activeEventRef = useRef(0);
  const carouselTrackRef = useRef<HTMLDivElement>(null);
  const [activeEvent, setActiveEvent] = useState(0);
  const [activeMemberIndex, setActiveMemberIndex] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState<string>('All Tracks');
  const [isEventsMinimized, setIsEventsMinimized] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredMembers = useMemo(() => {
    if (selectedTeam === 'All Tracks') return councilMembers;
    return councilMembers.filter((m) => m.team === selectedTeam);
  }, [selectedTeam]);

  const handleSelectTeam = useCallback((team: string) => {
    setSelectedTeam(team);
    setActiveMemberIndex(0);
  }, []);

  const handleToggleEventsMinimize = useCallback(() => {
    setIsEventsMinimized((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    gsap.registerPlugin(ScrollTrigger);

    if (isMobile) {
      const track = carouselTrackRef.current;
      if (!track) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let scrollTriggerInstance: any;

      const initScrollTrigger = () => {
        const anim = gsap.to(track, {
          x: () => -((mobileEvents.length - 1) * window.innerWidth),
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            pin: containerRef.current,
            start: 'top top',
            end: () => `+=${(mobileEvents.length - 1) * window.innerHeight * 0.8}`,
            scrub: 0.5,
            snap: {
              snapTo: 1 / (mobileEvents.length - 1),
              duration: { min: 0.2, max: 0.4 },
              delay: 0.05,
              ease: 'power1.inOut',
            },
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const p = self.progress;

              if (progressBarRef.current) {
                progressBarRef.current.style.width = `${p * 100}%`;
              }

              const totalCards = mobileEvents.length;
              const closest = Math.min(
                totalCards - 1,
                Math.round(p * (totalCards - 1))
              );
              if (closest !== activeEventRef.current) {
                activeEventRef.current = closest;
                setActiveEvent(closest);
              }
            },
          },
        });
        scrollTriggerInstance = anim;
      };

      const timeoutId = setTimeout(() => {
        initScrollTrigger();
        ScrollTrigger.refresh();
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        if (scrollTriggerInstance) {
          if (scrollTriggerInstance.scrollTrigger) {
            scrollTriggerInstance.scrollTrigger.kill();
          }
          scrollTriggerInstance.kill();
        }
      };
    } else {
      // Desktop ScrollTrigger (identically preserved)
      const trigger = ScrollTrigger.create({
        trigger: sectionRef.current,
        pin: containerRef.current,
        start: 'top top',
        end: '+=11000',
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

          /* ── Phase 5 -> Phase 7: Student Council TheFacebook Archive Window (0.48 -> 0.96) ── */
          const MEMBERS_START = 0.55;
          const MEMBERS_END = 0.93;
          const ARCHIVE_MIN_START = 0.93;
          const ARCHIVE_MIN_END = 0.96;

          if (playerWrapperRef.current) {
            if (p < 0.48) {
              playerWrapperRef.current.style.opacity = '0';
              playerWrapperRef.current.style.pointerEvents = 'none';
              playerWrapperRef.current.style.transform = 'translate(0, 46vh) scale(0.1)';
            } else if (p < MEMBERS_START) {
              const t = Math.min(1, Math.max(0, (p - 0.48) / 0.07));
              const scale = 0.1 + t * 0.9;
              const translateY = (1 - t) * 46;
              playerWrapperRef.current.style.opacity = '1';
              playerWrapperRef.current.style.pointerEvents = t > 0.5 ? 'auto' : 'none';
              playerWrapperRef.current.style.transform = `translate(0, ${translateY}vh) scale(${scale})`;
            } else if (p <= MEMBERS_END) {
              // TheFacebook archive window holds centered through this scroll range.
              playerWrapperRef.current.style.opacity = '1';
              playerWrapperRef.current.style.pointerEvents = 'auto';
              playerWrapperRef.current.style.transform = 'translate(0, 0) scale(1)';
            } else if (p < ARCHIVE_MIN_END) {
              // Genie minimize animation down into bottom taskbar
              const t = (p - ARCHIVE_MIN_START) / (ARCHIVE_MIN_END - ARCHIVE_MIN_START);
              const scale = 1.0 - t * 0.9;
              const translateY = t * 46; // vh down to taskbar
              playerWrapperRef.current.style.transform = `translate(0, ${translateY}vh) scale(${scale})`;
              playerWrapperRef.current.style.opacity = `${1.0 - t * 0.9}`;
              playerWrapperRef.current.style.pointerEvents = 'none';
            } else {
              playerWrapperRef.current.style.opacity = '0';
              playerWrapperRef.current.style.pointerEvents = 'none';
              playerWrapperRef.current.style.transform = 'translate(0, 46vh) scale(0.1)';
            }
          }

          /* ── Phase 8: Windows Picture and Fax Viewer Grand Finale (0.96 -> 1.00) ── */
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
      }, 150);

      return () => {
        clearTimeout(timeout);
        trigger.kill();
      };
    }
  }, [isEventsMinimized, isMobile, mounted]);

  const current = isMobile ? mobileEvents[activeEvent] : events[activeEvent];

  if (mounted && isMobile) {
    return (
      <div className="mobile-unified-container">
        {/* Mobile Event Section (2D HTML/CSS Smooth Carousel) */}
        <section
          ref={sectionRef}
          id="events"
          className="mobile-event-section-wrapper"
          style={{ position: 'relative', width: '100%' }}
        >
          <div
            ref={containerRef}
            style={{
              width: '100%',
              height: '100vh',
              position: 'relative',
              overflow: 'hidden',
              backgroundImage: 'url(/events/eventsmobbg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Events Title on Top */}
            <div className="mobile-events-header">
              <h2 className="mobile-events-section-title">OUR EVENTS</h2>
            </div>

            {/* 2D HTML/CSS Carousel Track */}
            <div
              ref={carouselTrackRef}
              className="mobile-events-track"
            >
              {mobileEvents.map((evt) => (
                <div key={evt.id} className="mobile-event-card-wrapper-raw">
                  <img
                    src={evt.posterImage}
                    alt={evt.title}
                    className="mobile-event-image-raw"
                    decoding="async"
                  />
                </div>
              ))}
            </div>

            {/* Film overlays */}
            <div className="events-lift" />
            <div className="events-scanlines" />
            <div className="events-grain" />
            <div className="events-vignette" />



            {/* Grunge vignette borders */}
            <div className="events-grunge-top" />
            <div className="events-grunge-bottom" />
          </div>
        </section>

        {/* Mobile Council Section (HTML list feed layout below events) */}
        <section
          id="mobile-council"
          className="mobile-council-section"
          aria-label="GDG CRCE Student Council 2026-27 — Mobile Experience"
        >
        {/* Sticky Mobile Header (Facebook style) */}
        <div className="mobile-header-sticky">
          {/* Cover Photo / Banner */}
          <div className="fb-cover-photo-wrapper">
            <div className="fb-cover-photo" style={{ backgroundColor: '#161f47' }}>
              <div className="fb-cover-content">
                <span className="fb-cover-text">GDG CRCE 26-27</span>
                <span className="fb-cover-subtext">Google Developers Group</span>
              </div>
            </div>
          </div>

          {/* Profile Header Block */}
          <div className="fb-profile-header">
            <div className="fb-avatar-row">
              <div className="fb-profile-avatar-container">
                <img src="/logo.png" className="fb-profile-logo" alt="GDG Logo" />
              </div>
              <div className="fb-profile-header-meta">
                <h1 className="fb-profile-name">
                  GDG FRCRCE
                  <span className="fb-verified-badge" title="Verified Group">✓</span>
                </h1>
              </div>
            </div>

            {/* Profile Navigation Tabs (Posts, About, Videos, Photos) */}
            <div className="fb-profile-tabs-menu">
              <span className="fb-tab-item active">Posts</span>
              <span className="fb-tab-item">About</span>
              <span className="fb-tab-item">Videos</span>
              <span className="fb-tab-item">Photos</span>
            </div>
          </div>
          <div className="fb-header-divider" />
        </div>

        {/* Scrollable post feed */}
        <div className="fb-feed-container">
          {/* Post 1: Welcome post from GDG CRCE */}
          <div className="fb-post-card pinned-post">
            {/* Post Header */}
            <div className="fb-post-header">
              <div className="fb-post-avatar page-avatar">
                <img src="/logo.png" className="fb-avatar-logo" alt="GDG Logo" />
              </div>
              <div className="fb-post-author-info">
                <span className="fb-post-author-name">
                  GDG CRCE
                  <span className="fb-verified-badge-small">✓</span>
                </span>
                <span className="fb-post-meta">Posted by Sir Harvey York • Pinned Post • 🌐</span>
              </div>
            </div>

            {/* Post content */}
            <div className="fb-post-content">
              <p className="fb-post-text">
                Zoomies before duties. Paws-ing for a group photo before we start building! 🐾
              </p>
            </div>

            {/* Attached Photo */}
            <div className="fb-post-media-container">
              <img src="/preloader/genesis.jpg" className="fb-post-img" alt="Genesis Welcome" />
            </div>

            {/* Reactions summary */}
            <div className="fb-post-reactions-bar">
              <div className="fb-reaction-icons">
                <span className="reaction-bubble blue-bubble">👍</span>
                <span className="reaction-bubble red-bubble">❤️</span>
              </div>
              <span className="fb-reaction-text">You, Movin and 87 others</span>
            </div>

            {/* Post Action Buttons */}
            <div className="fb-post-actions">
              <button type="button" className="fb-action-btn">
                <span className="btn-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1d3a70" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ fill: '#1b3a70' }}>
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM6 11H3v10h3V11z" />
                  </svg>
                </span>
                Like
              </button>
              <div className="fb-action-separator" />
              <button type="button" className="fb-action-btn">
                <span className="btn-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1d3a70" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ fill: '#1b3a70' }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                Comment
              </button>
              <div className="fb-action-separator" />
              <button type="button" className="fb-action-btn">
                <span className="btn-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4a3b8c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ fill: '#5856d6' }}>
                    <path d="M15 8V4l9 8-9 8v-4C4 16 2 20 2 20c0-6 2-12 13-12z" />
                  </svg>
                </span>
                Share
              </button>
            </div>

            {/* Comments block */}
            <div className="fb-comments-section">
              <div className="fb-comment-item">
                <span className="comment-avatar">💻</span>
                <div className="comment-bubble">
                  <span className="comment-author">Movin</span>
                  <span className="comment-text">Barkend Developer looks good! 🐶</span>
                </div>
              </div>
              <div className="fb-comment-item">
                <span className="comment-avatar">🐶</span>
                <div className="comment-bubble">
                  <span className="comment-author">Sir Harvey York</span>
                  <span className="comment-text">Woof! 🐾</span>
                </div>
              </div>
              
              {/* Comment Input Box */}
              <div className="fb-comment-input-row">
                <input type="text" className="fb-comment-input" placeholder="Write a comment..." readOnly />
                <span className="comment-camera-icon">📷</span>
              </div>
            </div>
          </div>

          {/* Loop over actual council members */}
          {councilMembers.map((member) => (
            <div key={member.id} className="fb-post-card">
              {/* Post Header */}
              <div className="fb-post-header">
                <div className="fb-post-avatar" style={{ background: member.avatarBg }}>
                  {member.avatarIcon}
                </div>
                <div className="fb-post-author-info">
                  <span className="fb-post-author-name">{member.name}</span>
                  <span className="fb-post-meta">{member.role} • 2 hrs ago • 👥</span>
                </div>
              </div>

              {/* Post content */}
              <div className="fb-post-content">
                <p className="fb-post-text">{member.quote}</p>
              </div>

              {/* Attached Member Photo Card */}
              <div className="fb-post-media-container">
                <div className="fb-post-member-card" style={{ background: member.avatarBg }}>
                  <span className="fb-post-member-glyph">{member.avatarIcon}</span>
                </div>
              </div>

              {/* Reactions summary */}
              <div className="fb-post-reactions-bar">
                <div className="fb-reaction-icons">
                  <span className="reaction-bubble blue-bubble">👍</span>
                  <span className="reaction-bubble yellow-bubble">😊</span>
                </div>
                <span className="fb-reaction-text">Liked by Sir Harvey York and 42 others</span>
              </div>

              {/* Action Buttons */}
              <div className="fb-post-actions">
                <button type="button" className="fb-action-btn">
                  <span className="btn-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1d3a70" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ fill: '#1b3a70' }}>
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM6 11H3v10h3V11z" />
                    </svg>
                  </span>
                  Like
                </button>
                <div className="fb-action-separator" />
                <button type="button" className="fb-action-btn">
                  <span className="btn-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1d3a70" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ fill: '#1b3a70' }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </span>
                  Comment
                </button>
                <div className="fb-action-separator" />
                <button type="button" className="fb-action-btn">
                  <span className="btn-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4a3b8c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ fill: '#5856d6' }}>
                      <path d="M15 8V4l9 8-9 8v-4C4 16 2 20 2 20c0-6 2-12 13-12z" />
                    </svg>
                  </span>
                  Share
                </button>
              </div>

              {/* Comments Input */}
              <div className="fb-comments-section">
                <div className="fb-comment-input-row">
                  <input type="text" className="fb-comment-input" placeholder="Write a comment..." readOnly />
                  <span className="comment-camera-icon">📷</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        </section>
      </div>
    );
  }

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

                {/* Lifted blacks — film shadows never reach zero (under the grain) */}
                <div className="events-lift" />

                {/* Scanline overlay */}
                <div className="events-scanlines" />

                {/* Film grain overlay */}
                <div className="events-grain" />

                {/* Lens falloff */}
                <div className="events-vignette" />

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

          {/* Layer 2: Student Council TheFacebook Archive (IE6 window on the XP desktop) */}
          <div
            ref={playerWrapperRef}
            className="xp-player-window-wrapper"
            style={{ opacity: 0, pointerEvents: 'none' }}
          >
            <Y2KArchiveSystem embedded />
          </div>

          {/* Layer 3: Windows Picture and Fax Viewer */}
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

'use client';

import React, { useState, useEffect } from 'react';

interface WindowsXPDesktopProps {
  activeTeamIndex: number;
  onSelectTeam: (teamName: string) => void;
  isEventsMinimized: boolean;
  onToggleEventsMinimize: () => void;
  showDesktopChrome?: boolean;
  children: React.ReactNode;
}

export default function WindowsXPDesktop({
  activeTeamIndex,
  onSelectTeam,
  isEventsMinimized,
  onToggleEventsMinimize,
  showDesktopChrome = true,
  children,
}: WindowsXPDesktopProps) {
  const [timeStr, setTimeStr] = useState('12:27 AM');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const desktopIcons = [
    {
      label: 'My Computer',
      team: 'All Tracks',
      svg: (
        <svg viewBox="0 0 48 48" className="xp-desktop-icon-svg" fill="none">
          <defs>
            <linearGradient id="pcGrad" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f0f6ff" />
              <stop offset="100%" stopColor="#a4c2e8" />
            </linearGradient>
            <linearGradient id="scrGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1864d8" />
              <stop offset="100%" stopColor="#082878" />
            </linearGradient>
          </defs>
          <rect x="6" y="8" width="36" height="26" rx="3" fill="url(#pcGrad)" stroke="#2254b0" strokeWidth="2.5" />
          <rect x="10" y="12" width="28" height="18" fill="url(#scrGrad)" />
          <path d="M14 16h12v2H14z" fill="#68a8f8" />
          <path d="M16 34h16v4H16z" fill="#8ca8d8" stroke="#2254b0" strokeWidth="1.5" />
          <rect x="10" y="38" width="28" height="3" rx="1.5" fill="#316ac5" />
        </svg>
      ),
    },
    {
      label: 'Core Council',
      team: 'Core Leadership',
      svg: (
        <svg viewBox="0 0 48 48" className="xp-desktop-icon-svg" fill="none">
          <defs>
            <radialGradient id="goldGrad" cx="24" cy="18" r="12" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fff68f" />
              <stop offset="60%" stopColor="#ffd700" />
              <stop offset="100%" stopColor="#c09000" />
            </radialGradient>
            <linearGradient id="suitGrad" x1="0" y1="28" x2="0" y2="46" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4184f0" />
              <stop offset="100%" stopColor="#14489e" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="18" r="9" fill="url(#goldGrad)" stroke="#806000" strokeWidth="2" />
          <path d="M10 42c0-8 6.5-14 14-14s14 6 14 14" fill="url(#suitGrad)" stroke="#103070" strokeWidth="2" />
        </svg>
      ),
    },
    {
      label: 'Tech & Web',
      team: 'Tech & Web',
      svg: (
        <svg viewBox="0 0 48 48" className="xp-desktop-icon-svg" fill="none">
          <defs>
            <linearGradient id="termGrad" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2e3d58" />
              <stop offset="100%" stopColor="#121824" />
            </linearGradient>
          </defs>
          <rect x="6" y="10" width="36" height="28" rx="3" fill="url(#termGrad)" stroke="#4884e8" strokeWidth="2.5" />
          <path d="M14 22l5 5-5 5M22 32h10" stroke="#00ff66" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: 'UI/UX Design',
      team: 'UI/UX & Design',
      svg: (
        <svg viewBox="0 0 48 48" className="xp-desktop-icon-svg" fill="none">
          <defs>
            <radialGradient id="palGrad" cx="24" cy="24" r="18" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e4e8f0" />
            </radialGradient>
          </defs>
          <circle cx="24" cy="24" r="16" fill="url(#palGrad)" stroke="#d03060" strokeWidth="2.5" />
          <circle cx="18" cy="18" r="3" fill="#e04070" />
          <circle cx="30" cy="18" r="3" fill="#3880f0" />
          <circle cx="24" cy="30" r="3" fill="#ffb800" />
          <circle cx="16" cy="27" r="2.5" fill="#00c864" />
        </svg>
      ),
    },
    {
      label: 'Events & Ops',
      team: 'Events & Ops',
      svg: (
        <svg viewBox="0 0 48 48" className="xp-desktop-icon-svg" fill="none">
          <defs>
            <linearGradient id="coneGrad" x1="0" y1="10" x2="0" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffaa00" />
              <stop offset="100%" stopColor="#cc5500" />
            </linearGradient>
          </defs>
          <path d="M8 38L24 10l16 28H8z" fill="url(#coneGrad)" stroke="#803000" strokeWidth="2.5" />
          <path d="M13 28h22M11 33h26" stroke="#ffffff" strokeWidth="3" />
          <circle cx="24" cy="28" r="3" fill="#ffffff" />
        </svg>
      ),
    },
    {
      label: 'PR Outreach',
      team: 'PR & Outreach',
      svg: (
        <svg viewBox="0 0 48 48" className="xp-desktop-icon-svg" fill="none">
          <defs>
            <linearGradient id="mailGrad" x1="0" y1="14" x2="0" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4498f8" />
              <stop offset="100%" stopColor="#1460c8" />
            </linearGradient>
          </defs>
          <path d="M6 16h10l14-10v34l-14-10H6V16z" fill="url(#mailGrad)" stroke="#083888" strokeWidth="2.5" />
          <path d="M34 16c3 3 3 11 0 14M40 12c5 5 5 19 0 24" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="xp-desktop-canvas">
      {/* Authentic Bliss Hill & Clouds */}
      <div className="xp-bliss-clouds" />
      <div className="xp-bliss-hill" />
      <div className="xp-bliss-hill-secondary" />
      {/* 3D Excavated / Carved Grassy Trench Text across the hill slope */}
      <div className="xp-bliss-carving">GDG CRCE</div>
      <div className="xp-screen-texture" />

      {/* Top Left Desktop Shortcuts */}
      <div
        className="xp-desktop-icons"
        style={{
          opacity: showDesktopChrome ? 1 : 0,
          pointerEvents: showDesktopChrome ? 'auto' : 'none',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
          transform: showDesktopChrome ? 'translateY(0)' : 'translateY(-15px)',
        }}
      >
        {desktopIcons.map((item, idx) => (
          <div
            key={idx}
            className="xp-desktop-icon"
            onClick={() => onSelectTeam(item.team)}
            title={`Open ${item.label}`}
          >
            {item.svg}
            <div className="xp-desktop-icon-label">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Center Windows Layer */}
      {children}

      {/* Windows XP Taskbar */}
      <div
        className="xp-taskbar"
        style={{
          opacity: showDesktopChrome ? 1 : 0,
          pointerEvents: showDesktopChrome ? 'auto' : 'none',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
          transform: showDesktopChrome ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        {/* Authentic Start Button with 4-Color Flag */}
        <div className="xp-start-button" title="Click to open GDG CRCE Start Menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 5l7.5-1v7.5H3V5z" fill="#f25022" />
            <path d="M11.5 3.8L21 2v9.5h-9.5V3.8z" fill="#7fba00" />
            <path d="M3 12.5h7.5V20l-7.5-1v-6.5z" fill="#00a4ef" />
            <path d="M11.5 12.5H21V22l-9.5-1.8v-7.7z" fill="#ffb900" />
          </svg>
          <span className="xp-start-text">start</span>
        </div>

        {/* Taskbar Active Windows */}
        <div className="xp-taskbar-windows">
          <div
            className={`xp-taskbar-item ${!isEventsMinimized ? 'active' : ''}`}
            onClick={onToggleEventsMinimize}
          >
            <span style={{ fontSize: '13px' }}>🎬</span>
            <span>GDG CRCE 90s Street Archive.avi</span>
          </div>

          <div className="xp-taskbar-item active">
            <span style={{ fontSize: '13px' }}>💿</span>
            <span>Student Council 2026-27 Player</span>
          </div>
        </div>

        {/* System Tray */}
        <div className="xp-system-tray">
          <span title="Sound Active">🔊</span>
          <span title="GDG Network Connected">🌐</span>
          <span>{timeStr}</span>
        </div>
      </div>
    </div>
  );
}

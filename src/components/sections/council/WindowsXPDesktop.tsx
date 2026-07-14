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
        <svg viewBox="0 0 36 36" className="xp-desktop-icon-svg" fill="none">
          <rect x="4" y="6" width="28" height="20" rx="2" fill="#d8e8f8" stroke="#316ac5" strokeWidth="2" />
          <rect x="7" y="9" width="22" height="14" fill="#184b9e" />
          <path d="M12 26h12v3H12z" fill="#8ca8d8" />
          <rect x="8" y="29" width="20" height="2" fill="#316ac5" />
        </svg>
      ),
    },
    {
      label: 'Core Council',
      team: 'Core Leadership',
      svg: (
        <svg viewBox="0 0 36 36" className="xp-desktop-icon-svg" fill="none">
          <circle cx="18" cy="14" r="6" fill="#ffd700" stroke="#a07c00" strokeWidth="1.5" />
          <path d="M8 30c0-6 5-10 10-10s10 4 10 10" fill="#316ac5" />
        </svg>
      ),
    },
    {
      label: 'Tech & Web',
      team: 'Tech & Web',
      svg: (
        <svg viewBox="0 0 36 36" className="xp-desktop-icon-svg" fill="none">
          <rect x="5" y="8" width="26" height="20" rx="2" fill="#243048" stroke="#4880d8" strokeWidth="2" />
          <path d="M11 18l3 3-3 3M17 24h6" stroke="#00ff66" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: 'UI/UX Design',
      team: 'UI/UX & Design',
      svg: (
        <svg viewBox="0 0 36 36" className="xp-desktop-icon-svg" fill="none">
          <circle cx="18" cy="18" r="13" fill="#ffffff" stroke="#e04070" strokeWidth="2" />
          <circle cx="13" cy="14" r="2.5" fill="#e04070" />
          <circle cx="23" cy="14" r="2.5" fill="#3880f0" />
          <circle cx="18" cy="23" r="2.5" fill="#ffb800" />
        </svg>
      ),
    },
    {
      label: 'Events & Ops',
      team: 'Events & Ops',
      svg: (
        <svg viewBox="0 0 36 36" className="xp-desktop-icon-svg" fill="none">
          <path d="M6 28L18 8l12 20H6z" fill="#ff9000" stroke="#b05000" strokeWidth="2" />
          <circle cx="18" cy="22" r="3" fill="#ffffff" />
        </svg>
      ),
    },
    {
      label: 'PR Outreach',
      team: 'PR & Outreach',
      svg: (
        <svg viewBox="0 0 36 36" className="xp-desktop-icon-svg" fill="none">
          <path d="M6 14h6l10-7v22l-10-7H6V14z" fill="#2080e0" stroke="#104080" strokeWidth="1.5" />
          <path d="M26 13c2 2 2 8 0 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
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
      {/* Carved/Embossed GDG CRCE on the hill inspired by Mitch Ivin Bliss hill */}
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

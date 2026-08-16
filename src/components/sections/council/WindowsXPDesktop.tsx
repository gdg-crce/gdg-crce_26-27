'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { departmentsList } from './councilData';

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

  /* Shortcut labels are short for the 74px icon caption; the `team` beside each
     is the real Department string.

     Those two were once independent: the shortcuts read 'Tech & Web',
     'UI/UX & Design', 'Events & Ops', 'PR & Outreach' and 'Core Leadership',
     none of which was ever a value of Department. `onSelectTeam` fed them
     straight into `m.team === selectedTeam`, so every one of those five icons
     filtered the gallery to nothing and opened "This folder is empty." The list
     is derived from departmentsList now, which makes that class of drift
     impossible — a renamed department renames its shortcut. */
  const SHORT_LABEL: Record<string, string> = {
    'Design & Creatives': 'Design',
    'Public Relations': 'PR & Comms',
    'Social Media': 'Social',
  };

  const desktopIcons = [
    { label: 'My Computer', team: 'All Tracks' },
    ...departmentsList.map((team) => ({ label: SHORT_LABEL[team] ?? team, team })),
  ].map((item, i) => ({
    ...item,
    svg: (
      <Image
        src={i % 2 === 0 ? '/contact.webp' : '/about.webp'}
        className="xp-desktop-icon-svg"
        alt=""
        width={34}
        height={34}
        sizes="34px"
      />
    ),
  }));

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
            <span>GDG Council 2026-27 Player</span>
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

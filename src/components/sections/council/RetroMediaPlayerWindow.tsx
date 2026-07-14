'use client';

import React, { useState, useEffect } from 'react';
import { CouncilMember, teamsList } from './councilData';

interface RetroMediaPlayerWindowProps {
  currentMember: CouncilMember;
  memberIndex: number;
  totalMembers: number;
  progressPercent: number; // 0 to 100
  onNext: () => void;
  onPrev: () => void;
  onSelectMemberById: (id: number) => void;
  selectedTeam: string;
  onSelectTeam: (team: string) => void;
  allMembers: CouncilMember[];
}

export default function RetroMediaPlayerWindow({
  currentMember,
  memberIndex,
  totalMembers,
  progressPercent,
  onNext,
  onPrev,
  onSelectMemberById,
  selectedTeam,
  onSelectTeam,
  allMembers,
}: RetroMediaPlayerWindowProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  // Animated visualizer bars
  const [visHeights, setVisHeights] = useState<number[]>([
    14, 26, 18, 34, 16, 28, 36, 15, 24, 30, 20, 34,
  ]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setVisHeights(
        Array.from({ length: 12 }, () => Math.floor(Math.random() * 26) + 8)
      );
    }, 160);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="xp-player-window">
      {/* WinXP Classic Titlebar */}
      <div className="xp-player-titlebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>💿</span>
          <span>
            Student Council 2026-27 — GDG CRCE Player [Track{' '}
            {String(memberIndex + 1).padStart(2, '0')} /{' '}
            {String(totalMembers).padStart(2, '0')}]
          </span>
        </div>
        <div style={{ display: 'flex', gap: '3px' }}>
          <button type="button" className="xp-btn-win xp-btn-min" title="Minimize">
            _
          </button>
          <button type="button" className="xp-btn-win xp-btn-max" title="Maximize">
            □
          </button>
          <button type="button" className="xp-btn-win xp-btn-close" title="Close">
            ×
          </button>
        </div>
      </div>

      {/* Main Player Content */}
      <div className="xp-player-content">
        {/* Top Grid: Left Photo Box + Right Controls Box */}
        <div className="xp-player-top-grid">
          {/* Sunken Photo Card */}
          <div className="xp-sunken-box xp-member-photo-frame">
            <span className="xp-member-avatar-badge">{currentMember.team}</span>
            <div
              className="xp-member-photo-card"
              style={{ background: currentMember.avatarBg }}
            >
              <span
                style={{
                  fontSize: '56px',
                  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.65))',
                }}
              >
                {currentMember.avatarIcon}
              </span>
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  right: '12px',
                  background: 'rgba(0,0,0,0.75)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '6px 10px',
                  borderRadius: '2px',
                  color: '#ffffff',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '13px', lineHeight: 1.2 }}>
                  {currentMember.name}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: '#00ff66',
                    textTransform: 'uppercase',
                    marginTop: '2px',
                  }}
                >
                  {currentMember.role}
                </div>
              </div>
            </div>
          </div>

          {/* Right Media Controls Box */}
          <div className="xp-player-controls-panel">
            {/* Spinning Disc & Volume Panel */}
            <div className="xp-disc-and-volume">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  className={`xp-cd-disc ${isPlaying ? 'fast-spin' : ''}`}
                  title="Playing Track..."
                >
                  <span style={{ fontSize: '16px' }}>⚡</span>
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#222' }}>
                  <div>GDG CRCE AUDIO ARCHIVE</div>
                  <div style={{ color: '#0f489c', fontSize: '10px' }}>
                    STEREO // 44.1 KHZ
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button type="button" className="xp-raised-btn" title="Volume Up">
                  +
                </button>
                <button type="button" className="xp-raised-btn" title="Volume Down">
                  -
                </button>
              </div>
            </div>

            {/* LED Audio Visualizer */}
            <div className="xp-visualizer">
              {visHeights.map((h, i) => (
                <div
                  key={i}
                  className="xp-vis-bar"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>

            {/* Playback Buttons Row */}
            <div className="xp-playback-row">
              <button
                type="button"
                className="xp-raised-btn"
                onClick={() => setIsPlaying(!isPlaying)}
                title="Play/Pause"
              >
                {isPlaying ? '||' : '▶'}
              </button>
              <button
                type="button"
                className="xp-raised-btn"
                onClick={onPrev}
                title="Previous Member"
              >
                |&lt;&lt;
              </button>
              <button
                type="button"
                className="xp-raised-btn"
                onClick={onPrev}
                title="Rewind"
              >
                &lt;&lt;
              </button>
              <button
                type="button"
                className="xp-raised-btn"
                onClick={onNext}
                title="Fast Forward"
              >
                &gt;&gt;
              </button>
              <button
                type="button"
                className="xp-raised-btn"
                onClick={onNext}
                title="Next Member"
              >
                &gt;&gt;|
              </button>
              <button
                type="button"
                className="xp-raised-btn"
                onClick={() => setIsLiked(!isLiked)}
                style={{ color: isLiked ? '#e01b24' : '#111' }}
                title="Favorite Member"
              >
                ♥
              </button>
            </div>
          </div>
        </div>

        {/* Middle Section: Dropdown Selectors matching Reference Image 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Team Selector */}
          <div className="xp-dropdown-row">
            <span className="xp-dropdown-label">Artist:</span>
            <div
              className="xp-dropdown-select-box"
              onClick={() => {
                setShowTeamDropdown(!showTeamDropdown);
                setShowMemberDropdown(false);
              }}
            >
              <span className="xp-dropdown-text">{selectedTeam}</span>
              <span className="xp-dropdown-arrow">▼</span>

              {showTeamDropdown && (
                <div className="xp-dropdown-menu">
                  {teamsList.map((t) => (
                    <div
                      key={t}
                      className={`xp-dropdown-item ${selectedTeam === t ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTeam(t);
                        setShowTeamDropdown(false);
                      }}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Member Track Selector */}
          <div className="xp-dropdown-row">
            <span className="xp-dropdown-label">Title:</span>
            <div
              className="xp-dropdown-select-box"
              onClick={() => {
                setShowMemberDropdown(!showMemberDropdown);
                setShowTeamDropdown(false);
              }}
            >
              <span className="xp-dropdown-text">
                {currentMember.name} — {currentMember.role}
              </span>
              <span className="xp-dropdown-arrow">▼</span>

              {showMemberDropdown && (
                <div className="xp-dropdown-menu">
                  {allMembers.map((m) => (
                    <div
                      key={m.id}
                      className={`xp-dropdown-item ${currentMember.id === m.id ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMemberById(m.id);
                        setShowMemberDropdown(false);
                      }}
                    >
                      <span>
                        {m.name} ({m.role})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section: Scrubber Track & Liner Notes */}
        <div className="xp-scrubber-row">
          <span>0:{String(Math.floor(progressPercent * 0.45)).padStart(2, '0')}</span>
          <div
            className="xp-scrubber-track"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              const targetIdx = Math.floor(ratio * totalMembers);
              const targetMember = allMembers[Math.min(targetIdx, totalMembers - 1)];
              if (targetMember) onSelectMemberById(targetMember.id);
            }}
          >
            <div
              className="xp-scrubber-progress"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="xp-scrubber-knob"
              style={{ left: `${progressPercent}%` }}
            />
          </div>
          <span>{currentMember.duration}</span>
        </div>

        {/* Sunken Bio & Socials Panel */}
        <div className="xp-member-bio-panel">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 800, fontSize: '11px', color: '#093c8c' }}>
              TRACK LINER NOTES // {currentMember.trackTitle}
            </span>
            <span style={{ fontSize: '10px', color: '#666' }}>
              ID: GDG-2026-{String(currentMember.id).padStart(2, '0')}
            </span>
          </div>

          <p className="xp-bio-text">{currentMember.bio}</p>

          <div className="xp-tags-list">
            {currentMember.techStack.map((tech, i) => (
              <span key={i} className="xp-tech-tag">
                {tech}
              </span>
            ))}
          </div>

          <div className="xp-social-buttons">
            {currentMember.socials.linkedin && (
              <a
                href={currentMember.socials.linkedin}
                target="_blank"
                rel="noreferrer"
                className="xp-raised-btn"
                style={{ fontSize: '11px', textDecoration: 'none' }}
              >
                LinkedIn
              </a>
            )}
            {currentMember.socials.github && (
              <a
                href={currentMember.socials.github}
                target="_blank"
                rel="noreferrer"
                className="xp-raised-btn"
                style={{ fontSize: '11px', textDecoration: 'none' }}
              >
                GitHub
              </a>
            )}
            {currentMember.socials.instagram && (
              <a
                href={currentMember.socials.instagram}
                target="_blank"
                rel="noreferrer"
                className="xp-raised-btn"
                style={{ fontSize: '11px', textDecoration: 'none' }}
              >
                Instagram
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

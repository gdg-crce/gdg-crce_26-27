'use client';

import React, { useState, useMemo } from 'react';
import { CouncilMember } from './councilData';

interface MSNContactListWindowProps {
  allMembers: CouncilMember[];
  activeMemberIndex: number;
  onSelectMemberById: (id: number) => void;
  onToggleMinimize?: () => void;
}

const TEAM_ORDER = [
  'Core Leadership',
  'Tech & Web',
  'UI/UX & Design',
  'Events & Ops',
  'PR & Outreach',
] as const;

export default function MSNContactListWindow({
  allMembers,
  activeMemberIndex,
  onSelectMemberById,
  onToggleMinimize,
}: MSNContactListWindowProps) {
  const [userStatus, setUserStatus] = useState<string>('(Online)');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeMember = allMembers[activeMemberIndex] || allMembers[0];

  const groupedMembers = useMemo(() => {
    const map: Record<string, CouncilMember[]> = {
      'Core Leadership': [],
      'Tech & Web': [],
      'UI/UX & Design': [],
      'Events & Ops': [],
      'PR & Outreach': [],
    };

    allMembers.forEach((m) => {
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        if (
          !m.name.toLowerCase().includes(q) &&
          !m.role.toLowerCase().includes(q) &&
          !m.trackTitle.toLowerCase().includes(q)
        ) {
          return;
        }
      }
      if (map[m.team]) {
        map[m.team].push(m);
      } else {
        if (!map['Other Contacts']) map['Other Contacts'] = [];
        map['Other Contacts'].push(m);
      }
    });

    return map;
  }, [allMembers, searchQuery]);

  const toggleGroup = (team: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [team]: !prev[team],
    }));
  };

  return (
    <div className="msn-contact-list-window">
      {/* Authentic Windows Messenger Titlebar */}
      <div className="msn-titlebar">
        <div className="msn-titlebar-left">
          <span className="msn-butterfly-icon" title="Windows Messenger 7.0">🦋</span>
          <span className="msn-title-text">Windows Messenger</span>
        </div>
        <div className="msn-titlebar-buttons">
          <button
            type="button"
            className="xp-btn-win xp-btn-min"
            onClick={onToggleMinimize}
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
            onClick={onToggleMinimize}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Classic Menu Bar */}
      <div className="msn-menubar">
        <span><u>F</u>ile</span>
        <span><u>C</u>ontacts</span>
        <span><u>A</u>ctions</span>
        <span><u>T</u>ools</span>
        <span><u>H</u>elp</span>
      </div>

      {/* Top User Header (`You - GDG CRCE Visitor`) */}
      <div className="msn-user-header">
        <div className="msn-visitor-dp-box">
          <div className="msn-visitor-dp-img">⚡</div>
          <div className="msn-status-indicator online" title="Online" />
        </div>
        <div className="msn-visitor-info">
          <div className="msn-visitor-name">You (GDG CRCE Visitor)</div>
          <select
            className="msn-status-select"
            value={userStatus}
            onChange={(e) => setUserStatus(e.target.value)}
          >
            <option value="(Online)">(Online)</option>
            <option value="(Busy)">(Busy)</option>
            <option value="(Be Right Back)">(Be Right Back)</option>
            <option value="(Away)">(Away)</option>
            <option value="(Appear Offline)">(Appear Offline)</option>
          </select>
        </div>
      </div>

      {/* Quick Actions Toolbar */}
      <div className="msn-toolbar">
        <button type="button" className="msn-toolbar-btn" title="Add a Contact">
          <span>➕</span>
          <span>Add</span>
        </button>
        <button type="button" className="msn-toolbar-btn" title="Send a File">
          <span>📁</span>
          <span>Send File</span>
        </button>
        <button type="button" className="msn-toolbar-btn" title="Webcam Conversation">
          <span>📹</span>
          <span>Webcam</span>
        </button>
        <button type="button" className="msn-toolbar-btn" title="Audio Conversation">
          <span>🎧</span>
          <span>Audio</span>
        </button>
      </div>

      {/* Contact Search Box */}
      <div className="msn-search-bar">
        <span className="msn-search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search contacts by name or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="msn-search-input"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="msn-search-clear"
          >
            ×
          </button>
        )}
      </div>

      {/* Accordion Contact Groups Area */}
      <div className="msn-contacts-container">
        {TEAM_ORDER.map((team) => {
          const membersInGroup = groupedMembers[team] || [];
          if (membersInGroup.length === 0 && searchQuery !== '') return null;
          const isCollapsed = Boolean(collapsedGroups[team]);

          return (
            <div key={team} className="msn-group-folder">
              <div
                className="msn-group-header"
                onClick={() => toggleGroup(team)}
                title={`Click to ${isCollapsed ? 'expand' : 'collapse'} group`}
              >
                <span className="msn-group-toggle">{isCollapsed ? '➕' : '➖'}</span>
                <span className="msn-group-title">{team}</span>
                <span className="msn-group-count">
                  ({membersInGroup.length}/{membersInGroup.length} Online)
                </span>
              </div>

              {!isCollapsed && (
                <div className="msn-group-items">
                  {membersInGroup.map((member) => {
                    const isSelected = activeMember && activeMember.id === member.id;
                    return (
                      <div
                        key={member.id}
                        className={`msn-contact-row ${isSelected ? 'active' : ''}`}
                        onClick={() => onSelectMemberById(member.id)}
                        title={`Click to open instant message window with ${member.name}`}
                      >
                        <div className="msn-buddy-icon-wrap">
                          <span className="msn-buddy-icon">👤</span>
                          <span className="msn-buddy-online-dot" />
                        </div>

                        <div
                          className="msn-contact-dp-mini"
                          style={{ background: member.avatarBg }}
                        >
                          <span className="msn-dp-glyph">{member.avatarIcon}</span>
                        </div>

                        <div className="msn-contact-text">
                          <span className="msn-contact-name">{member.name}</span>
                          <span className="msn-contact-status">
                            {' '}
                            - (Online) - {member.role}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Status Bar */}
      <div className="msn-statusbar">
        <span className="msn-statusbar-icon">🌐</span>
        <span className="msn-statusbar-text">
          Connected as You (GDG CRCE Visitor) — {allMembers.length} Contacts Online
        </span>
      </div>
    </div>
  );
}
